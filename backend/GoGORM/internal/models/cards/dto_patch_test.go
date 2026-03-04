package cards

import (
	"encoding/json"
	"testing"
)

func TestPatchCardDetailsRequest_StartDateExplicitNull(t *testing.T) {
	var req PatchCardDetailsRequest
	if err := json.Unmarshal([]byte(`{"StartDate":null}`), &req); err != nil {
		t.Fatalf("unexpected unmarshal error: %v", err)
	}

	if !req.StartDate.Set {
		t.Fatalf("expected StartDate.Set=true for explicit null")
	}
	if req.StartDate.Value != nil {
		t.Fatalf("expected StartDate.Value=nil for explicit null")
	}
}

func TestPatchCardDetailsRequest_StartDateOmitted(t *testing.T) {
	var req PatchCardDetailsRequest
	if err := json.Unmarshal([]byte(`{"Title":"Card"}`), &req); err != nil {
		t.Fatalf("unexpected unmarshal error: %v", err)
	}

	if req.StartDate.Set {
		t.Fatalf("expected StartDate.Set=false when omitted")
	}
	if req.StartDate.Value != nil {
		t.Fatalf("expected StartDate.Value=nil when omitted")
	}
}

func TestPatchCardDetailsRequest_EndDateWithValue(t *testing.T) {
	var req PatchCardDetailsRequest
	if err := json.Unmarshal([]byte(`{"EndDate":"2026-02-18T12:00:00Z"}`), &req); err != nil {
		t.Fatalf("unexpected unmarshal error: %v", err)
	}

	if !req.EndDate.Set {
		t.Fatalf("expected EndDate.Set=true for provided value")
	}
	if req.EndDate.Value == nil {
		t.Fatalf("expected EndDate.Value to be populated")
	}
	if *req.EndDate.Value != "2026-02-18T12:00:00Z" {
		t.Fatalf("unexpected EndDate value: %v", *req.EndDate.Value)
	}
}
