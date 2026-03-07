package EventRegistry

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/guard"
	"GoGORM/internal/rbac"
	"context"

	"github.com/google/uuid"
)

func (s *EventRegistryService) GetBoardAuditLog(ctx context.Context, boardID uuid.UUID, userID uuid.UUID) (dto.AuditLogResponse, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, false); err != nil {
		return dto.AuditLogResponse{}, err
	}
	auditlogevent, err := s.repo.GetBoardAuditLog(ctx, boardID)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}
	return s.buildAuditLogResponse(ctx, auditlogevent)
}

func (s *EventRegistryService) GetBoardAuditLogPaginated(ctx context.Context, boardID uuid.UUID, userID uuid.UUID, cursor *dto.AuditCursor, limit int) (dto.AuditLogPaginatedResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, false); err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	auditlogevent, err := s.repo.GetBoardAuditLogPaginated(ctx, boardID, limit, cursor)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	events, err := s.buildAuditLogResponse(ctx, auditlogevent.Events)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	return dto.AuditLogPaginatedResponse{
		Events:     events,
		NextCursor: auditlogevent.NextCursor,
		HasMore:    auditlogevent.HasMore,
	}, nil
}

func (s *EventRegistryService) GetWorkspaceAuditLog(ctx context.Context, workspaceID uuid.UUID, userID uuid.UUID) (dto.AuditLogResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Viewer, false); err != nil {
		return dto.AuditLogResponse{}, err
	}
	auditlogevent, err := s.repo.GetWorkspaceAuditLog(ctx, workspaceID)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}
	return s.buildAuditLogResponse(ctx, auditlogevent)
}

func (s *EventRegistryService) GetWorkspaceUserActivity(ctx context.Context, workspaceID, requesterUserID, actorUserID uuid.UUID) (dto.AuditLogResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, requesterUserID, workspaceID, rbac.Viewer, false); err != nil {
		return dto.AuditLogResponse{}, err
	}
	if requesterUserID != actorUserID {
		if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, requesterUserID, workspaceID, rbac.Member, false); err != nil {
			return dto.AuditLogResponse{}, err
		}
	}

	auditlogevent, err := s.repo.GetWorkspaceUserActivity(ctx, workspaceID, actorUserID)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}
	return s.buildAuditLogResponse(ctx, auditlogevent)
}

func (s *EventRegistryService) GetWorkspaceUserActivityPaginated(ctx context.Context, workspaceID, requesterUserID, actorUserID uuid.UUID, cursor *dto.AuditCursor, limit int) (dto.AuditLogPaginatedResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, requesterUserID, workspaceID, rbac.Viewer, false); err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	if requesterUserID != actorUserID {
		if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, requesterUserID, workspaceID, rbac.Member, false); err != nil {
			return dto.AuditLogPaginatedResponse{}, err
		}
	}

	auditlogevent, err := s.repo.GetWorkspaceUserActivityPaginated(ctx, workspaceID, actorUserID, limit, cursor)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	events, err := s.buildAuditLogResponse(ctx, auditlogevent.Events)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	return dto.AuditLogPaginatedResponse{
		Events:     events,
		NextCursor: auditlogevent.NextCursor,
		HasMore:    auditlogevent.HasMore,
	}, nil
}

func (s *EventRegistryService) GetWorkspaceCardActivity(ctx context.Context, workspaceID, cardID, userID uuid.UUID) (dto.AuditLogResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Viewer, false); err != nil {
		return dto.AuditLogResponse{}, err
	}

	auditlogevent, err := s.repo.GetWorkspaceCardActivity(ctx, workspaceID, cardID)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}
	return s.buildAuditLogResponse(ctx, auditlogevent)
}

func (s *EventRegistryService) GetWorkspaceCardActivityPaginated(ctx context.Context, workspaceID, cardID, userID uuid.UUID, cursor *dto.AuditCursor, limit int) (dto.AuditLogPaginatedResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Viewer, false); err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}

	auditlogevent, err := s.repo.GetWorkspaceCardActivityPaginated(ctx, workspaceID, cardID, limit, cursor)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	events, err := s.buildAuditLogResponse(ctx, auditlogevent.Events)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	return dto.AuditLogPaginatedResponse{
		Events:     events,
		NextCursor: auditlogevent.NextCursor,
		HasMore:    auditlogevent.HasMore,
	}, nil
}

func (s *EventRegistryService) GetInboxCardActivity(ctx context.Context, cardID, userID uuid.UUID) (dto.AuditLogResponse, error) {
	owned, err := s.repo.IsInboxCardOwnedByUser(ctx, userID, cardID)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}
	if !owned {
		return dto.AuditLogResponse{}, domainerr.ErrForbidden
	}

	auditlogevent, err := s.repo.GetCardActivity(ctx, cardID)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}
	return s.buildAuditLogResponse(ctx, auditlogevent)
}

func (s *EventRegistryService) GetUserActivity(ctx context.Context, requesterUserID, actorUserID uuid.UUID) (dto.AuditLogResponse, error) {
	if requesterUserID != actorUserID {
		return dto.AuditLogResponse{}, domainerr.ErrForbidden
	}

	auditlogevent, err := s.repo.GetUserActivity(ctx, actorUserID)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}
	return s.buildAuditLogResponse(ctx, auditlogevent)
}

func (s *EventRegistryService) GetUserActivityPaginated(ctx context.Context, requesterUserID, actorUserID uuid.UUID, cursor *dto.AuditCursor, limit int) (dto.AuditLogPaginatedResponse, error) {
	if requesterUserID != actorUserID {
		return dto.AuditLogPaginatedResponse{}, domainerr.ErrForbidden
	}

	auditlogevent, err := s.repo.GetUserActivityPaginated(ctx, actorUserID, limit, cursor)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	events, err := s.buildAuditLogResponse(ctx, auditlogevent.Events)
	if err != nil {
		return dto.AuditLogPaginatedResponse{}, err
	}
	return dto.AuditLogPaginatedResponse{
		Events:     events,
		NextCursor: auditlogevent.NextCursor,
		HasMore:    auditlogevent.HasMore,
	}, nil
}
