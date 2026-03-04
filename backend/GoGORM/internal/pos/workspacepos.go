package pos

import (
	"context"

	"github.com/google/uuid"
)

func (s *Service) UserWorkspacePosAtEnd(ctx context.Context, userID uuid.UUID) (string, error) {
	userWorkspaces, err := s.UserWorkspacePosRepo.GetUserWorkspacesByUserID(ctx, userID)
	if err != nil {
		return "", err
	}
	if len(userWorkspaces) > 0 {
		lastPos := userWorkspaces[len(userWorkspaces)-1].Pos
		newPos, err := s.generator.GenerateRankBetween(lastPos, "")
		if err != nil {
			return "", err
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween("", "")
	if err != nil {
		return "", err
	}
	return newPos, nil

}
