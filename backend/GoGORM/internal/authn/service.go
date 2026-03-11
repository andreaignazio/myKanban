package authn

import (
	"GoGORM/internal/domainerr"
	"GoGORM/models"
	"context"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var usernameSanitizer = regexp.MustCompile(`[^a-z0-9_]+`)

type UserRepo interface {
	GetUserByClerkUserID(ctx context.Context, clerkUserID string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	CreateUser(ctx context.Context, user *models.User) error
	PatchUserByID(ctx context.Context, userID uuid.UUID, updates map[string]any) (*models.User, error)
}

type Config struct {
	Enabled           bool
	AllowDevHeader    bool
	JWTKey            string
	SecretKey         string
	APIURL            string
	Issuer            string
	Audience          []string
	AuthorizedParties []string
	HTTPTimeout       time.Duration
}

type Service struct {
	config     Config
	repo       UserRepo
	publicKey  any
	httpClient *http.Client
}

type Identity struct {
	UserID      uuid.UUID
	ClerkUserID string
}

type clerkSessionClaims struct {
	jwt.RegisteredClaims
	AuthorizedParty string `json:"azp"`
	SessionID       string `json:"sid"`
	Email           string `json:"email"`
	EmailAddress    string `json:"email_address"`
	Username        string `json:"username"`
	GivenName       string `json:"given_name"`
	FamilyName      string `json:"family_name"`
	Name            string `json:"name"`
	Picture         string `json:"picture"`
}

type clerkUserResponse struct {
	ID                    string `json:"id"`
	Username              string `json:"username"`
	FirstName             string `json:"first_name"`
	LastName              string `json:"last_name"`
	ImageURL              string `json:"image_url"`
	PrimaryEmailAddressID string `json:"primary_email_address_id"`
	EmailAddresses        []struct {
		ID           string `json:"id"`
		EmailAddress string `json:"email_address"`
	} `json:"email_addresses"`
}

type clerkProfile struct {
	ClerkUserID string
	Email       string
	Username    string
	Name        string
	AvatarURL   string
}

func ConfigFromEnv() Config {
	enabled := parseEnvBool("CLERK_AUTH_ENABLED", false)
	jwtKey := strings.TrimSpace(os.Getenv("CLERK_JWT_KEY"))
	secretKey := strings.TrimSpace(os.Getenv("CLERK_SECRET_KEY"))
	apiURL := strings.TrimSpace(os.Getenv("CLERK_API_URL"))
	if apiURL == "" {
		apiURL = "https://api.clerk.com/v1"
	}
	if !enabled && jwtKey == "" {
		return Config{
			Enabled:        false,
			AllowDevHeader: true,
			APIURL:         apiURL,
			HTTPTimeout:    5 * time.Second,
		}
	}
	return Config{
		Enabled:           enabled || jwtKey != "",
		AllowDevHeader:    parseEnvBool("AUTH_ALLOW_DEV_X_USER_ID", false),
		JWTKey:            jwtKey,
		SecretKey:         secretKey,
		APIURL:            apiURL,
		Issuer:            strings.TrimSpace(os.Getenv("CLERK_ISSUER")),
		Audience:          parseCSVEnv("CLERK_AUDIENCE"),
		AuthorizedParties: parseCSVEnv("CLERK_AUTHORIZED_PARTIES"),
		HTTPTimeout:       parseDurationEnv("CLERK_HTTP_TIMEOUT", 5*time.Second),
	}
}

func NewService(config Config, repo UserRepo) (*Service, error) {
	svc := &Service{
		config: config,
		repo:   repo,
		httpClient: &http.Client{
			Timeout: config.HTTPTimeout,
		},
	}
	if !config.Enabled {
		return svc, nil
	}
	if strings.TrimSpace(config.JWTKey) == "" {
		return nil, fmt.Errorf("clerk auth enabled but CLERK_JWT_KEY is empty")
	}
	publicKey, err := parsePublicKey(config.JWTKey)
	if err != nil {
		return nil, fmt.Errorf("parse Clerk JWT key: %w", err)
	}
	svc.publicKey = publicKey
	return svc, nil
}

func (s *Service) AuthenticateRequest(ctx context.Context, req *http.Request) (*Identity, error) {
	if !s.config.Enabled {
		return authenticateDevHeader(req)
	}

	token := extractSessionToken(req)
	if token == "" {
		if s.config.AllowDevHeader {
			return authenticateDevHeader(req)
		}
		return nil, domainerr.New(domainerr.ErrNotAuthorized, "missing bearer token")
	}

	claims, err := s.verifyToken(token)
	if err != nil {
		return nil, domainerr.New(domainerr.ErrNotAuthorized, "invalid Clerk session token")
	}

	user, err := s.resolveLocalUser(ctx, claims)
	if err != nil {
		return nil, err
	}

	return &Identity{
		UserID:      user.ID,
		ClerkUserID: claims.Subject,
	}, nil
}

func (s *Service) verifyToken(token string) (*clerkSessionClaims, error) {
	claims := &clerkSessionClaims{}
	parsedToken, err := jwt.ParseWithClaims(token, claims, func(parsed *jwt.Token) (any, error) {
		return s.publicKey, nil
	}, jwt.WithValidMethods([]string{"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"}))
	if err != nil {
		return nil, err
	}
	if !parsedToken.Valid {
		return nil, errors.New("token is not valid")
	}
	if claims.Subject == "" {
		return nil, errors.New("missing subject claim")
	}
	if s.config.Issuer != "" && claims.Issuer != s.config.Issuer {
		return nil, errors.New("issuer mismatch")
	}
	if len(s.config.Audience) > 0 && !matchesAudience(claims.Audience, s.config.Audience) {
		return nil, errors.New("audience mismatch")
	}
	if len(s.config.AuthorizedParties) > 0 && !containsString(s.config.AuthorizedParties, claims.AuthorizedParty) {
		return nil, errors.New("authorized party mismatch")
	}
	return claims, nil
}

func (s *Service) resolveLocalUser(ctx context.Context, claims *clerkSessionClaims) (*models.User, error) {
	user, err := s.repo.GetUserByClerkUserID(ctx, claims.Subject)
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, domainerr.ErrNotFound) {
		return nil, domainerr.WithKind(domainerr.Wrap(err, "authn.resolveLocalUser.lookupByClerkUserID"), domainerr.ErrInternal)
	}

	profile, err := s.resolveClerkProfile(ctx, claims)
	if err != nil {
		return nil, domainerr.WithKind(domainerr.Wrap(err, "authn.resolveLocalUser.resolveProfile"), domainerr.ErrForbidden)
	}
	if profile.Email == "" {
		return nil, domainerr.New(domainerr.ErrForbidden, "Clerk user has no email available for local account linking")
	}

	linkedUser, err := s.repo.GetUserByEmail(ctx, profile.Email)
	if err == nil {
		updates := map[string]any{}
		if strings.TrimSpace(linkedUser.ClerkUserID) == "" {
			updates["clerk_user_id"] = profile.ClerkUserID
		}
		if strings.TrimSpace(linkedUser.Name) == "" && profile.Name != "" {
			updates["name"] = profile.Name
		}
		if strings.TrimSpace(linkedUser.AvatarUrl) == "" && profile.AvatarURL != "" {
			updates["avatar_url"] = profile.AvatarURL
		}
		if len(updates) == 0 {
			return linkedUser, nil
		}
		patchedUser, patchErr := s.repo.PatchUserByID(ctx, linkedUser.ID, updates)
		if patchErr != nil {
			return nil, domainerr.WithKind(domainerr.Wrap(patchErr, "authn.resolveLocalUser.linkExistingUser"), domainerr.ErrInternal)
		}
		return patchedUser, nil
	}
	if !errors.Is(err, domainerr.ErrNotFound) {
		return nil, domainerr.WithKind(domainerr.Wrap(err, "authn.resolveLocalUser.lookupByEmail"), domainerr.ErrInternal)
	}

	newUser := &models.User{
		ID:           uuid.New(),
		Name:         profile.Name,
		Email:        profile.Email,
		Username:     generateUsername(profile.Username, profile.Email, profile.ClerkUserID),
		PasswordHash: "",
		AvatarUrl:    profile.AvatarURL,
		ClerkUserID:  profile.ClerkUserID,
	}
	if err := s.repo.CreateUser(ctx, newUser); err != nil {
		if !errors.Is(err, domainerr.ErrConflict) {
			return nil, domainerr.WithKind(domainerr.Wrap(err, "authn.resolveLocalUser.createUser"), domainerr.ErrInternal)
		}
		fallbackUser, fallbackErr := s.repo.GetUserByEmail(ctx, profile.Email)
		if fallbackErr != nil {
			return nil, domainerr.WithKind(domainerr.Wrap(err, "authn.resolveLocalUser.createUserConflict"), domainerr.ErrInternal)
		}
		if strings.TrimSpace(fallbackUser.ClerkUserID) == "" {
			fallbackUser, fallbackErr = s.repo.PatchUserByID(ctx, fallbackUser.ID, map[string]any{"clerk_user_id": profile.ClerkUserID})
			if fallbackErr != nil {
				return nil, domainerr.WithKind(domainerr.Wrap(fallbackErr, "authn.resolveLocalUser.patchConflictingUser"), domainerr.ErrInternal)
			}
		}
		return fallbackUser, nil
	}
	return newUser, nil
}

func (s *Service) resolveClerkProfile(ctx context.Context, claims *clerkSessionClaims) (*clerkProfile, error) {
	if s.config.SecretKey != "" {
		clerkUser, err := s.fetchClerkUser(ctx, claims.Subject)
		if err == nil {
			return clerkUser, nil
		}
	}

	email := strings.ToLower(strings.TrimSpace(firstNonEmpty(claims.Email, claims.EmailAddress)))
	name := strings.TrimSpace(claims.Name)
	if name == "" {
		name = strings.TrimSpace(strings.TrimSpace(claims.GivenName + " " + claims.FamilyName))
	}
	if name == "" {
		name = fallbackName(email, claims.Username, claims.Subject)
	}
	return &clerkProfile{
		ClerkUserID: claims.Subject,
		Email:       email,
		Username:    strings.TrimSpace(claims.Username),
		Name:        name,
		AvatarURL:   strings.TrimSpace(claims.Picture),
	}, nil
}

func (s *Service) fetchClerkUser(ctx context.Context, clerkUserID string) (*clerkProfile, error) {
	endpoint := strings.TrimRight(s.config.APIURL, "/") + "/users/" + url.PathEscape(clerkUserID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.config.SecretKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, domainerr.ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected Clerk API status: %d", resp.StatusCode)
	}

	var payload clerkUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	email := ""
	for _, emailAddress := range payload.EmailAddresses {
		if emailAddress.ID == payload.PrimaryEmailAddressID {
			email = emailAddress.EmailAddress
			break
		}
	}
	if email == "" && len(payload.EmailAddresses) > 0 {
		email = payload.EmailAddresses[0].EmailAddress
	}
	email = strings.ToLower(strings.TrimSpace(email))

	name := strings.TrimSpace(strings.TrimSpace(payload.FirstName + " " + payload.LastName))
	if name == "" {
		name = fallbackName(email, payload.Username, payload.ID)
	}

	return &clerkProfile{
		ClerkUserID: payload.ID,
		Email:       email,
		Username:    strings.TrimSpace(payload.Username),
		Name:        name,
		AvatarURL:   strings.TrimSpace(payload.ImageURL),
	}, nil
}

func authenticateDevHeader(req *http.Request) (*Identity, error) {
	stringID := strings.TrimSpace(req.Header.Get("x-userID"))
	if stringID == "" {
		stringID = strings.TrimSpace(req.URL.Query().Get("userID"))
	}
	if stringID == "" {
		return nil, domainerr.New(domainerr.ErrNotAuthorized, "missing x-userID header")
	}
	userID, err := uuid.Parse(stringID)
	if err != nil || userID == uuid.Nil {
		return nil, domainerr.New(domainerr.ErrNotAuthorized, "invalid x-userID header")
	}
	return &Identity{UserID: userID}, nil
}

func extractSessionToken(req *http.Request) string {
	authorization := strings.TrimSpace(req.Header.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(authorization), "bearer ") {
		return strings.TrimSpace(authorization[7:])
	}
	if token := strings.TrimSpace(req.URL.Query().Get("token")); token != "" {
		return token
	}
	if cookie, err := req.Cookie("__session"); err == nil {
		return strings.TrimSpace(cookie.Value)
	}
	return ""
}

func parsePublicKey(raw string) (any, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.Trim(raw, `"`)
	raw = strings.ReplaceAll(raw, `\n`, "\n")

	block, _ := pem.Decode([]byte(raw))
	if block == nil {
		return nil, errors.New("invalid PEM block")
	}
	if publicKey, err := x509.ParsePKIXPublicKey(block.Bytes); err == nil {
		switch publicKey.(type) {
		case *rsa.PublicKey, *ecdsa.PublicKey, ed25519.PublicKey:
			return publicKey, nil
		}
	}
	if certificate, err := x509.ParseCertificate(block.Bytes); err == nil {
		switch certificate.PublicKey.(type) {
		case *rsa.PublicKey, *ecdsa.PublicKey, ed25519.PublicKey:
			return certificate.PublicKey, nil
		}
	}
	if publicKey, err := x509.ParsePKCS1PublicKey(block.Bytes); err == nil {
		return publicKey, nil
	}
	return nil, errors.New("unsupported public key format")
}

func matchesAudience(claimAudiences jwt.ClaimStrings, expected []string) bool {
	for _, audience := range claimAudiences {
		if containsString(expected, audience) {
			return true
		}
	}
	return false
}

func containsString(values []string, target string) bool {
	target = strings.TrimSpace(target)
	if target == "" {
		return false
	}
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), target) {
			return true
		}
	}
	return false
}

func generateUsername(preferred, email, clerkUserID string) string {
	base := strings.ToLower(strings.TrimSpace(preferred))
	if base == "" && email != "" {
		base = strings.ToLower(strings.TrimSpace(strings.SplitN(email, "@", 2)[0]))
	}
	if base == "" {
		base = "user"
	}
	base = usernameSanitizer.ReplaceAllString(base, "_")
	base = strings.Trim(base, "_")
	if base == "" {
		base = "user"
	}
	suffix := clerkUserID
	if len(suffix) > 8 {
		suffix = suffix[len(suffix)-8:]
	}
	suffix = usernameSanitizer.ReplaceAllString(strings.ToLower(suffix), "")
	if suffix == "" {
		suffix = uuid.NewString()[:8]
	}
	return base + "_" + suffix
}

func fallbackName(email, username, clerkUserID string) string {
	if username != "" {
		return username
	}
	if email != "" {
		return strings.SplitN(email, "@", 2)[0]
	}
	if clerkUserID != "" {
		return clerkUserID
	}
	return "user"
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func parseCSVEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}

func parseEnvBool(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseDurationEnv(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return parsed
}
