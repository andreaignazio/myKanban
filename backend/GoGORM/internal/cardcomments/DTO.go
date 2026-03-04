package cardcomments

import (
	"GoGORM/internal/dto"

	"github.com/google/uuid"
)

type CreateCardCommentRequest struct {
	CardID           uuid.UUID   `json:"CardID" validate:"required,uuid"`
	Content          string      `json:"Content" validate:"required"`
	MentionedUserIDs []uuid.UUID `json:"MentionedUserIDs" validate:"dive,uuid"`
}

type EditCardCommentRequest struct {
	Content          *string      `json:"Content,omitempty"`
	MentionedUserIDs *[]uuid.UUID `json:"MentionedUserIDs,omitempty" validate:"omitempty,dive,uuid"`
}

type CardCommentResponse struct {
	CardComments []dto.CardCommentResponse `json:"CardComments"`
	Users        []dto.UserLiteRespone     `json:"Users"`
}
