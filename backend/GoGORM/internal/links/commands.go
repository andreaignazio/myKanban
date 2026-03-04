package links

import "github.com/google/uuid"

type CreateListInput struct {
	Title    *string
	InsertAt *string
	AfterID  *uuid.UUID
}

type MoveListInBoardInput struct {
	AfterListID *uuid.UUID
	InsertAt    *string
}
