package EventRegistry

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
	"context"
	"encoding/json"
	"sort"
	"strings"

	"github.com/google/uuid"
)

type auditPayloadLinks struct {
	Links map[string]AuditEntityLink `json:"Links"`
}

type AuditEntityRows struct {
	Workspaces       []models.Workspace
	Boards           []models.Board
	Lists            []models.List
	Cards            []models.Card
	Users            []models.UserLite
	UserWorkspaces   []models.UserWorkspace
	BoardLists       []models.BoardList
	ListCards        []models.ListCard
	CardMembers      []models.CardMember
	CardLabelLinks   []models.CardLabelLink
	EntryMembers     []models.EntryMember
	ListWatches      []models.ListWatch
	CardWatches      []models.CardWatch
	BoardWatches     []models.BoardWatch
	Checklists       []models.Checklist
	Entries          []models.Entry
	ChecklistEntries []models.ChecklistEntry
	CardChecklists   []models.CardChecklist
}

func normalizeEntityType(entityType string) string {
	normalized := strings.ToLower(strings.TrimSpace(entityType))
	switch normalized {
	case "watch_list":
		return "list_watch"
	case "watch_card":
		return "card_watch"
	case "watch_board":
		return "board_watch"
	case "checklist_entry_member":
		return "entry_member"
	default:
		return normalized
	}
}

func addEntityID(entityIDSet map[string]map[uuid.UUID]struct{}, entityType string, entityID uuid.UUID) {
	if entityID == uuid.Nil {
		return
	}
	normalizedType := normalizeEntityType(entityType)
	if normalizedType == "" {
		return
	}
	if _, exists := entityIDSet[normalizedType]; !exists {
		entityIDSet[normalizedType] = map[uuid.UUID]struct{}{}
	}
	entityIDSet[normalizedType][entityID] = struct{}{}
}

func flattenEntityIDSet(entityIDSet map[string]map[uuid.UUID]struct{}) map[string][]uuid.UUID {
	result := make(map[string][]uuid.UUID, len(entityIDSet))
	for entityType, ids := range entityIDSet {
		result[entityType] = make([]uuid.UUID, 0, len(ids))
		for id := range ids {
			result[entityType] = append(result[entityType], id)
		}
	}
	return result
}

func sortedUnresolvedTypes(entityIDsByType map[string][]uuid.UUID) []string {
	known := map[string]struct{}{
		"workspace":       {},
		"board":           {},
		"list":            {},
		"card":            {},
		"user":            {},
		"user_workspace":  {},
		"board_list":      {},
		"list_card":       {},
		"card_member":     {},
		"card_label_link": {},
		"entry_member":    {},
		"list_watch":      {},
		"card_watch":      {},
		"board_watch":     {},
		"checklist":       {},
		"entry":           {},
		"checklist_entry": {},
		"card_checklist":  {},
	}

	unresolved := make([]string, 0)
	for entityType, ids := range entityIDsByType {
		if len(ids) == 0 {
			continue
		}
		if _, ok := known[entityType]; !ok {
			unresolved = append(unresolved, entityType)
		}
	}
	sort.Strings(unresolved)
	return unresolved
}

func collectEntityIDsFromAuditEvents(audits []models.BoardAuditEvent) map[string][]uuid.UUID {
	entityIDSet := make(map[string]map[uuid.UUID]struct{})
	for _, event := range audits {
		addEntityID(entityIDSet, "user", event.ActorUserID)
		addEntityID(entityIDSet, event.MainEntityType, event.MainEntityID)

		var payload auditPayloadLinks
		if len(event.Payload) > 0 {
			if err := json.Unmarshal(event.Payload, &payload); err == nil && payload.Links != nil {
				for _, link := range payload.Links {
					addEntityID(entityIDSet, link.EntityType, link.EntityID)
				}
			}
		}
	}
	return flattenEntityIDSet(entityIDSet)
}

func (s *EventRegistryService) buildAuditLogResponse(ctx context.Context, auditEvents []models.BoardAuditEvent) (dto.AuditLogResponse, error) {
	auditsResponse := dto.BoardAuditEventsToResponses(auditEvents)
	entityIDsByType := collectEntityIDsFromAuditEvents(auditEvents)
	entityRows, err := s.repo.GetAuditEntitiesDetails(ctx, entityIDsByType)
	if err != nil {
		return dto.AuditLogResponse{}, err
	}

	users := make([]dto.UserLiteRespone, 0, len(entityRows.Users))
	for i := range entityRows.Users {
		users = append(users, dto.UserLiteToResponse(&entityRows.Users[i]))
	}
	userWorkspaces := make([]dto.UserWorkspaceResponse, 0, len(entityRows.UserWorkspaces))
	for i := range entityRows.UserWorkspaces {
		userWorkspaces = append(userWorkspaces, dto.UserWorkspaceToResponse(&entityRows.UserWorkspaces[i]))
	}
	boardLists := make([]dto.BoardListResponse, 0, len(entityRows.BoardLists))
	for i := range entityRows.BoardLists {
		boardLists = append(boardLists, dto.BoardListToResponse(&entityRows.BoardLists[i]))
	}
	listCards := make([]dto.ListCardResponse, 0, len(entityRows.ListCards))
	for i := range entityRows.ListCards {
		listCards = append(listCards, dto.ListCardToResponse(&entityRows.ListCards[i]))
	}

	entities := dto.AuditEntitiesResponse{
		Workspaces:       make([]dto.WorkspaceResponse, 0, len(entityRows.Workspaces)),
		Boards:           make([]dto.BoardResponse, 0, len(entityRows.Boards)),
		Lists:            make([]dto.ListResponse, 0, len(entityRows.Lists)),
		Cards:            make([]dto.CardResponse, 0, len(entityRows.Cards)),
		Users:            users,
		UserWorkspaces:   userWorkspaces,
		BoardLists:       boardLists,
		ListCards:        listCards,
		CardMembers:      dto.CardMembersToResponses(entityRows.CardMembers),
		CardLabelLinks:   dto.CardLabelLinksToResponses(entityRows.CardLabelLinks),
		EntryMembers:     dto.EntryMembersToResponses(entityRows.EntryMembers),
		ListWatches:      dto.ListWatchesToResponses(entityRows.ListWatches),
		CardWatches:      dto.CardWatchesToResponses(entityRows.CardWatches),
		BoardWatches:     dto.BoardWatchesToResponses(entityRows.BoardWatches),
		Checklists:       dto.ChecklistsToResponses(entityRows.Checklists),
		Entries:          dto.EntriesToResponses(entityRows.Entries),
		ChecklistEntries: dto.ChecklistEntriesToResponses(entityRows.ChecklistEntries),
		CardChecklists:   dto.CardChecklistsToResponses(entityRows.CardChecklists),
		UnresolvedTypes:  sortedUnresolvedTypes(entityIDsByType),
	}

	for i := range entityRows.Workspaces {
		entities.Workspaces = append(entities.Workspaces, dto.WorkspaceToResponse(&entityRows.Workspaces[i]))
	}
	for i := range entityRows.Boards {
		entities.Boards = append(entities.Boards, dto.BoardToResponse(&entityRows.Boards[i]))
	}
	for i := range entityRows.Lists {
		entities.Lists = append(entities.Lists, dto.ListToResponse(&entityRows.Lists[i]))
	}
	for i := range entityRows.Cards {
		entities.Cards = append(entities.Cards, dto.CardToResponse(&entityRows.Cards[i]))
	}

	return dto.AuditLogResponse{
		Audits:   auditsResponse,
		Entities: entities,
	}, nil
}
