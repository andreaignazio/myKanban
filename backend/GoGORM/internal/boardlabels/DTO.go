package BoardLabels

import "encoding/json"

type CreateBoardLabelRequest struct {
	Title *string `json:"title,omitempty"`
	Color *string `json:"color,omitempty"`
}

type PatchNullableString struct {
	Set   bool
	Value *string
}

func (p *PatchNullableString) UnmarshalJSON(data []byte) error {
	p.Set = true
	if string(data) == "null" {
		p.Value = nil
		return nil
	}

	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	p.Value = &value
	return nil
}

type PatchBoardLabelRequest struct {
	Title PatchNullableString `json:"title,omitempty"`
	Color PatchNullableString `json:"color,omitempty"`
}
