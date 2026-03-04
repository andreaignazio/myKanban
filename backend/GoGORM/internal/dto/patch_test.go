package dto

import (
	"encoding/json"
	"testing"

	"gorm.io/datatypes"
)

func TestMergeNestedProps_ExplicitNullClearsCover(t *testing.T) {
	primary := map[string]any{
		"Props": map[string]any{
			"Display": map[string]any{
				"Cover": nil,
			},
		},
	}

	fallback := map[string]any{
		"Props": map[string]any{
			"Display": map[string]any{
				"Size": "small",
				"Cover": map[string]any{
					"Type":  "color",
					"Color": "#0079bf",
				},
			},
		},
	}

	merged, err := MergeNestedProps(primary, fallback)
	if err != nil {
		t.Fatalf("MergeNestedProps returned error: %v", err)
	}

	propsMap := merged["Props"].(map[string]any)
	displayMap := propsMap["Display"].(map[string]any)

	if displayMap["Cover"] != nil {
		t.Fatalf("expected Cover to be nil after explicit null patch, got %#v", displayMap["Cover"])
	}
	if displayMap["Size"] != "small" {
		t.Fatalf("expected Size to be preserved from fallback, got %#v", displayMap["Size"])
	}
}

func TestMergeNestedProps_OmittedCoverKeepsFallback(t *testing.T) {
	primary := map[string]any{
		"Props": map[string]any{
			"Display": map[string]any{
				"Size": "large",
			},
		},
	}

	fallback := map[string]any{
		"Props": map[string]any{
			"Display": map[string]any{
				"Size": "small",
				"Cover": map[string]any{
					"Type":  "color",
					"Color": "#0079bf",
				},
			},
		},
	}

	merged, err := MergeNestedProps(primary, fallback)
	if err != nil {
		t.Fatalf("MergeNestedProps returned error: %v", err)
	}

	propsMap := merged["Props"].(map[string]any)
	displayMap := propsMap["Display"].(map[string]any)
	coverMap, ok := displayMap["Cover"].(map[string]any)
	if !ok {
		t.Fatalf("expected Cover map to be preserved from fallback, got %#v", displayMap["Cover"])
	}
	if coverMap["Type"] != "color" {
		t.Fatalf("expected Cover.Type=color, got %#v", coverMap["Type"])
	}
	if displayMap["Size"] != "large" {
		t.Fatalf("expected Size to be overwritten by patch, got %#v", displayMap["Size"])
	}
}

func TestMergeNestedProps_ExplicitNullClearsUserAvatarAndCoverURLs(t *testing.T) {
	primary := map[string]any{
		"Avatar": map[string]any{
			"Url":   nil,
			"Color": "#123456",
		},
		"Cover": map[string]any{
			"Url":   nil,
			"Color": "#654321",
		},
	}

	fallback := datatypes.JSON([]byte(`{
		"Avatar": {"Url": "https://cdn.example/avatar.png", "Color": "#aaaaaa"},
		"Cover": {"Url": "https://cdn.example/cover.png", "Color": "#bbbbbb"},
		"Initials": "AB"
	}`))

	merged, err := MergeNestedProps(primary, fallback)
	if err != nil {
		t.Fatalf("MergeNestedProps returned error: %v", err)
	}

	avatarMap, ok := merged["Avatar"].(map[string]any)
	if !ok {
		t.Fatalf("expected Avatar map, got %#v", merged["Avatar"])
	}
	coverMap, ok := merged["Cover"].(map[string]any)
	if !ok {
		t.Fatalf("expected Cover map, got %#v", merged["Cover"])
	}

	if avatarMap["Url"] != nil {
		t.Fatalf("expected Avatar.Url to be nil, got %#v", avatarMap["Url"])
	}
	if coverMap["Url"] != nil {
		t.Fatalf("expected Cover.Url to be nil, got %#v", coverMap["Url"])
	}
	if avatarMap["Color"] != "#123456" {
		t.Fatalf("expected Avatar.Color to be overwritten, got %#v", avatarMap["Color"])
	}
	if coverMap["Color"] != "#654321" {
		t.Fatalf("expected Cover.Color to be overwritten, got %#v", coverMap["Color"])
	}

	b, err := json.Marshal(merged)
	if err != nil {
		t.Fatalf("failed to marshal merged props: %v", err)
	}

	var persisted map[string]any
	if err := json.Unmarshal(b, &persisted); err != nil {
		t.Fatalf("failed to unmarshal merged props: %v", err)
	}

	persistedAvatar := persisted["Avatar"].(map[string]any)
	persistedCover := persisted["Cover"].(map[string]any)
	if persistedAvatar["Url"] != nil {
		t.Fatalf("expected persisted Avatar.Url JSON null, got %#v", persistedAvatar["Url"])
	}
	if persistedCover["Url"] != nil {
		t.Fatalf("expected persisted Cover.Url JSON null, got %#v", persistedCover["Url"])
	}
}
