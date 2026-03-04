package media

import (
	"GoGORM/internal/domainerr"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

type UnsplashService struct {
	client      *http.Client
	accessKey   string
	baseURL     string
	cache       *SearchCache
	attribution string
}

func NewUnsplashService(client *http.Client, accessKey string, cache *SearchCache) *UnsplashService {
	return &UnsplashService{
		client:      client,
		accessKey:   accessKey,
		baseURL:     "https://api.unsplash.com",
		cache:       cache,
		attribution: "Photo by Unsplash",
	}
}

type unsplashSearchUpstream struct {
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
	Results    []struct {
		ID   string `json:"id"`
		Urls struct {
			Thumb   string `json:"thumb"`
			Regular string `json:"regular"`
		} `json:"urls"`
		User struct {
			Name     string `json:"name"`
			Username string `json:"username"`
		} `json:"user"`
		Links struct {
			DownloadLocation string `json:"download_location"`
		} `json:"links"`
	} `json:"results"`
}

func (s *UnsplashService) SearchPhotos(ctx context.Context, query string, page int, perPage int, orientation string) (UnsplashSearchResponse, error) {
	const op = "media.service.SearchPhotos"

	query = strings.TrimSpace(query)
	if len(query) < 2 || len(query) > 80 {
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrValidation, "query must be 2..80 chars", op)
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 12
	}
	if perPage > 30 {
		perPage = 30
	}

	orientation = strings.ToLower(strings.TrimSpace(orientation))
	switch orientation {
	case "", "landscape", "portrait", "squarish":
		if orientation == "" {
			orientation = "landscape"
		}
	default:
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrValidation, "invalid orientation", op)
	}

	if strings.TrimSpace(s.accessKey) == "" {
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrInternal, "UNSPLASH_ACCESS_KEY is empty", op)
	}

	cacheKey := fmt.Sprintf("%s|%d|%d|%s", strings.ToLower(query), page, perPage, orientation)
	if s.cache != nil {
		if cached, ok := s.cache.Get(cacheKey); ok {
			return cached, nil
		}
	}

	u, err := url.Parse(strings.TrimRight(s.baseURL, "/") + "/search/photos")
	if err != nil {
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrInternal, "invalid unsplash base URL", op)
	}

	qs := u.Query()
	qs.Set("query", query)
	qs.Set("page", strconv.Itoa(page))
	qs.Set("per_page", strconv.Itoa(perPage))
	qs.Set("orientation", orientation)
	u.RawQuery = qs.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrInternal, "cannot build unsplash request", op)
	}
	req.Header.Set("Authorization", "Client-ID "+s.accessKey)
	req.Header.Set("Accept-Version", "v1")

	resp, err := s.client.Do(req)
	if err != nil {
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrInternal, "unsplash request failed", op)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrInternal, fmt.Sprintf("unsplash status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(body))), op)
	}

	var upstream unsplashSearchUpstream
	if err := json.NewDecoder(resp.Body).Decode(&upstream); err != nil {
		return UnsplashSearchResponse{}, domainerr.New(domainerr.ErrInternal, "invalid unsplash response", op)
	}

	out := UnsplashSearchResponse{
		Query:      query,
		Page:       page,
		PerPage:    perPage,
		Total:      upstream.Total,
		TotalPages: upstream.TotalPages,
		Results:    make([]UnsplashPhoto, 0, len(upstream.Results)),
	}

	for _, p := range upstream.Results {
		attributionURL := "https://unsplash.com"
		if p.User.Username != "" {
			attributionURL = "https://unsplash.com/@" + p.User.Username
		}

		out.Results = append(out.Results, UnsplashPhoto{
			ID:               p.ID,
			ThumbURL:         p.Urls.Thumb,
			RegularURL:       p.Urls.Regular,
			AuthorName:       p.User.Name,
			AuthorUsername:   p.User.Username,
			AttributionURL:   attributionURL,
			DownloadLocation: p.Links.DownloadLocation,
		})
	}

	if s.cache != nil {
		s.cache.Set(cacheKey, out)
	}

	return out, nil
}
