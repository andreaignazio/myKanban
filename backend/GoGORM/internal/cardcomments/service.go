package cardcomments

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/guard"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CardCommentsService struct {
	db             *gorm.DB
	EventRegistry  *EventRegistry.EventRegistryService
	Repo           CardCommentsRepository
	IncludeDeleted bool
	MembershipRepo MembershipRepo
}

type CardCommentsRepository interface {
	CreateCardCommentTX(ctx context.Context, tx *gorm.DB, comment *models.CardComment) error
	CreateCommentMentionsTX(ctx context.Context, tx *gorm.DB, mentions []models.CommentMention) error
	GetCardCommentByID(ctx context.Context, commentID uuid.UUID, includeDeleted bool) (*models.CardComment, error)
	DeleteCardCommentByID(ctx context.Context, commentID uuid.UUID) (*models.CardComment, error)
	UpdateCardCommentTX(ctx context.Context, tx *gorm.DB, commentID uuid.UUID, updateMap map[string]any) (*models.CardComment, error)
	DeleteCommentMentionsByCommentIDAndMentionedUserIDsTX(ctx context.Context, tx *gorm.DB, commentID uuid.UUID, mentionedUserIDs []uuid.UUID) error
	GetCardCommentsByCardID(ctx context.Context, cardID uuid.UUID, includeDeleted bool) ([]models.CardComment, error)
}

func NewCardCommentsService(db *gorm.DB, repo CardCommentsRepository, membershipRepo MembershipRepo, includeDeleted bool, eventRegistry *EventRegistry.EventRegistryService) *CardCommentsService {
	return &CardCommentsService{
		db:             db,
		EventRegistry:  eventRegistry,
		Repo:           repo,
		MembershipRepo: membershipRepo,
		IncludeDeleted: includeDeleted,
	}
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserLitesByIDs(ctx context.Context, workspaceID uuid.UUID, userIDs []uuid.UUID) ([]models.UserLite, error)
}

func (s *CardCommentsService) CreateCardComment(ctx context.Context, userID, workspaceID, boardID, cardID, correlationID uuid.UUID,
	req *CreateCardCommentRequest) (*dto.CardCommentResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}

	comment := &models.CardComment{
		ID:              uuid.New(),
		CardID:          cardID,
		Content:         req.Content,
		CreatedByUserID: userID,
	}

	var mentions []models.CommentMention
	for _, mentionedUserID := range req.MentionedUserIDs {
		mentions = append(mentions, models.CommentMention{
			CardCommentID:   comment.ID,
			MentionedUserID: mentionedUserID,
			CreatedByUserID: userID,
		})
	}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.Repo.CreateCardCommentTX(ctx, tx, comment); err != nil {
			return err
		}
		if len(mentions) > 0 {
			if err := s.Repo.CreateCommentMentionsTX(ctx, tx, mentions); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	comment.CommentMentions = mentions

	commentResponse := dto.CardCommentToResponse(comment)

	payload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &dto.BoardDetailResponse{
			CardComments: []dto.CardCommentResponse{commentResponse},
		},
	}

	cardTarget := EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}

	targets := []EventRegistry.TargetRef{cardTarget}

	event := EventRegistry.DomainEvent{
		Type:             EventRegistry.EventCardCommentCreated,
		WorkspaceID:      &workspaceID,
		BoardID:          &boardID,
		ActorUserID:      &userID,
		CorrelationID:    &correlationID,
		Payload:          payload,
		Targets:          targets,
		MentionedUserIDs: req.MentionedUserIDs,
		OccurredAt:       time.Now(),
	}
	s.EventRegistry.Emit(ctx, s.db, event)

	return &commentResponse, nil
}

func (s *CardCommentsService) DeleteCardComment(ctx context.Context, userID, workspaceID, boardID, cardID, commentID, correlationID uuid.UUID) (*dto.CardCommentResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}
	commentToBeDeleted, err := s.Repo.GetCardCommentByID(ctx, commentID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	if commentToBeDeleted.CreatedByUserID != userID {
		return nil, domainerr.ErrForbidden
	}
	deletedComment, err := s.Repo.DeleteCardCommentByID(ctx, commentID)
	if err != nil {
		return nil, err
	}
	commentResponse := dto.CardCommentToResponse(deletedComment)

	payload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &dto.BoardDetailResponse{
			CardComments: []dto.CardCommentResponse{commentResponse},
		},
	}
	cardTarget := EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	targets := []EventRegistry.TargetRef{cardTarget}
	event := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventCardCommentDeleted,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       payload,
		Targets:       targets,
	}
	s.EventRegistry.Emit(ctx, s.db, event)
	return &commentResponse, nil
}

func (s *CardCommentsService) EditCardComment(ctx context.Context, userID, workspaceID, boardID, cardID, commentID, correlationID uuid.UUID,
	req *EditCardCommentRequest) (*dto.CardCommentResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}
	comment, err := s.Repo.GetCardCommentByID(ctx, commentID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	if comment.CreatedByUserID != userID {
		return nil, domainerr.ErrForbidden
	}
	if req == nil {
		return nil, domainerr.ErrValidation
	}

	var mentionsToAdd []models.CommentMention
	var mentionsToDelete []models.CommentMention
	existingMentionsMap := make(map[uuid.UUID]models.CommentMention)
	requestedMentionsMap := make(map[uuid.UUID]struct{})

	updateMap := make(map[string]any)
	for _, mention := range comment.CommentMentions {
		existingMentionsMap[mention.MentionedUserID] = mention
	}
	if req.MentionedUserIDs != nil {
		for _, mentionedUserID := range *req.MentionedUserIDs {
			requestedMentionsMap[mentionedUserID] = struct{}{}
			if _, exists := existingMentionsMap[mentionedUserID]; !exists {
				mentionsToAdd = append(mentionsToAdd, models.CommentMention{
					CardCommentID:   comment.ID,
					MentionedUserID: mentionedUserID,
					CreatedByUserID: userID,
				})
			}
		}
		for _, mention := range comment.CommentMentions {
			if _, exists := requestedMentionsMap[mention.MentionedUserID]; !exists {
				mentionsToDelete = append(mentionsToDelete, mention)
			}
		}
	}

	if req.Content != nil {
		updateMap["content"] = *req.Content
	}
	if len(updateMap) == 0 && req.MentionedUserIDs == nil {
		commentResponse := dto.CardCommentToResponse(comment)
		return &commentResponse, nil
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if len(updateMap) > 0 {
			if _, err := s.Repo.UpdateCardCommentTX(ctx, tx, commentID, updateMap); err != nil {
				return err
			}
		}
		if len(mentionsToAdd) > 0 {
			if err := s.Repo.CreateCommentMentionsTX(ctx, tx, mentionsToAdd); err != nil {
				return err
			}
		}
		if len(mentionsToDelete) > 0 {
			var mentionedUserIDsToDelete []uuid.UUID
			for _, mention := range mentionsToDelete {
				mentionedUserIDsToDelete = append(mentionedUserIDsToDelete, mention.MentionedUserID)
			}
			if err := s.Repo.DeleteCommentMentionsByCommentIDAndMentionedUserIDsTX(ctx, tx, commentID, mentionedUserIDsToDelete); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	updatedComment, err := s.Repo.GetCardCommentByID(ctx, commentID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	commentResponse := dto.CardCommentToResponse(updatedComment)

	payload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &dto.BoardDetailResponse{
			CardComments: []dto.CardCommentResponse{commentResponse},
		},
	}
	cardTarget := EventRegistry.TargetRef{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     &boardID,
		WorkspaceID: &workspaceID,
	}
	targets := []EventRegistry.TargetRef{cardTarget}
	mentionedUserIDs := []uuid.UUID{}
	if req.MentionedUserIDs != nil {
		mentionedUserIDs = *req.MentionedUserIDs
	}
	event := EventRegistry.DomainEvent{
		Type:             EventRegistry.EventCardCommentEdited,
		WorkspaceID:      &workspaceID,
		BoardID:          &boardID,
		ActorUserID:      &userID,
		CorrelationID:    &correlationID,
		Payload:          payload,
		Targets:          targets,
		MentionedUserIDs: mentionedUserIDs,
	}
	s.EventRegistry.Emit(ctx, s.db, event)
	return &commentResponse, nil

}

func (s *CardCommentsService) GetCardComments(ctx context.Context, userID, workspaceID, boardID, cardID uuid.UUID) (*CardCommentResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}
	comments, err := s.Repo.GetCardCommentsByCardID(ctx, cardID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	var commentResponses []dto.CardCommentResponse
	for _, comment := range comments {
		commentResponses = append(commentResponses, dto.CardCommentToResponse(&comment))
	}
	mentionedUserIdsSet := make(map[uuid.UUID]struct{})
	for _, comment := range comments {
		for _, mention := range comment.CommentMentions {
			mentionedUserIdsSet[mention.MentionedUserID] = struct{}{}
		}
	}
	var mentionedUserIds []uuid.UUID
	for userID := range mentionedUserIdsSet {
		mentionedUserIds = append(mentionedUserIds, userID)
	}
	users, err := s.MembershipRepo.GetUserLitesByIDs(ctx, workspaceID, mentionedUserIds)
	if err != nil {
		return nil, err
	}
	userResponses := make([]dto.UserLiteRespone, 0, len(users))
	for _, user := range users {
		userResponses = append(userResponses, dto.UserLiteToResponse(&user))
	}

	cardCommentsResponse := &CardCommentResponse{
		CardComments: commentResponses,
		Users:        userResponses,
	}

	return cardCommentsResponse, nil
}
