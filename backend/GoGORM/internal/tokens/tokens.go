package tokens

import (
	"crypto/rand"
	"encoding/base64"
)

func NewPublicToken() (string, error) {
	buf := make([]byte, 24) // 24 bytes -> 32 chars circa in base64 URL-safe
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
