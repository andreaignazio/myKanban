package links

import "github.com/google/uuid"

type UserBoardDomain struct {
	UserID  uuid.UUID
	BoardID uuid.UUID
	Role    string // owner/admin/member/viewer
	Pos     string
}
