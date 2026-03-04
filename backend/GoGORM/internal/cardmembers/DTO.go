package cardmembers

import "GoGORM/internal/dto"

type AddCardMemberRequest struct {
	MemberID string `json:"MemberId" binding:"required,uuid"`
}

type CardMemberResponse struct {
	CardMember dto.CardMemberResponse `json:"CardMember"`
	User       dto.UserResponse       `json:"User"`
}
