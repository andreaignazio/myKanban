package cards

import (
	"GoGORM/internal/dto"
	"encoding/json"
)

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

type PatchCardDetailsRequest struct {
	Title       *string             `json:"Title" binding:"omitempty"`
	Done        *bool               `json:"Done" binding:"omitempty"`
	Description *string             `json:"Description" binding:"omitempty"`
	StartDate   PatchNullableString `json:"StartDate,omitempty"`
	EndDate     PatchNullableString `json:"EndDate,omitempty"`
	//Labels *[]PatchCardLabelRequest `json:"Labels" binding:"omitempty"`
}

type PatchCardLabelRequest struct {
	ID    *string `json:"ID" binding:"omitempty"`
	Title *string `json:"Title" binding:"omitempty"`
	Color *string `json:"Color" binding:"omitempty"`
}

type PatchCardPropsRequest struct {
	Props map[string]any `json:"Props" binding:"required"`
}

type CardProps struct {
	Display *CardDisplayProps `json:"Display" binding:"omitempty"`
	Layout  string            `json:"Layout" binding:"omitempty"`
}

type CardDisplayProps struct {
	Size  *string          `json:"Size" binding:"omitempty"`
	Cover *CardsCoverProps `json:"Cover" binding:"omitempty"`
}
type CardsCoverProps struct {
	Type  *string `json:"Type" binding:"omitempty"`
	Color *string `json:"Color" binding:"omitempty"`
	URL   *string `json:"URL" binding:"omitempty"`
}

type UserMemberCardsResponse struct {
	Cards          []dto.CardResponse          `json:"Cards"`
	InboxCards     []dto.CardResponse          `json:"InboxCards"`
	Lists          []dto.ListResponse          `json:"Lists"`
	BoardLists     []dto.BoardListResponse     `json:"BoardLists"`
	ListCards      []dto.ListCardResponse      `json:"ListCards"`
	Boards         []dto.BoardResponse         `json:"Boards"`
	UserBoards     []dto.BoardResponse         `json:"UserBoards"`
	BoardLabels    []dto.BoardLabelResponse    `json:"BoardLabels"`
	CardLabelLinks []dto.CardLabelLinkResponse `json:"CardLabelLinks"`
	Workspaces     []dto.WorkspaceResponse     `json:"Workspaces"`
}
