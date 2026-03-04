package EventRegistry

import (
	"GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"GoGORM/models"
	"context"
)

type ChecklistHandlerMode string

const (
	ChecklistHandlerModeChecklistCreated   ChecklistHandlerMode = "checklist.created"
	ChecklistHandlerModeChecklistPatched   ChecklistHandlerMode = "checklist.patched"
	ChecklistHandlerModeChecklistDeleted   ChecklistHandlerMode = "checklist.deleted"
	ChecklistHandlerModeChecklistMoved     ChecklistHandlerMode = "checklist.moved"
	ChecklistHandlerModeEntryCreated       ChecklistHandlerMode = "checklist.entry.created"
	ChecklistHandlerModeEntryPatched       ChecklistHandlerMode = "checklist.entry.patched"
	ChecklistHandlerModeEntryDeleted       ChecklistHandlerMode = "checklist.entry.deleted"
	ChecklistHandlerModeEntryMoved         ChecklistHandlerMode = "checklist.entry.moved"
	ChecklistHandlerModeEntryMemberAdded   ChecklistHandlerMode = "checklist.entry.member.added"
	ChecklistHandlerModeEntryMemberRemoved ChecklistHandlerMode = "checklist.entry.member.removed"
)

type ChecklistEventHandler struct {
	auditReopo auditcontext.Reader
	mode       ChecklistHandlerMode
}

func NewChecklistCreatedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeChecklistCreated,
	}
}
func NewChecklistPatchedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeChecklistPatched,
	}
}
func NewChecklistDeletedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeChecklistDeleted,
	}
}
func NewChecklistMovedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeChecklistMoved,
	}
}
func NewChecklistEntryCreatedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeEntryCreated,
	}
}
func NewChecklistEntryPatchedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeEntryPatched,
	}
}
func NewChecklistEntryDeletedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeEntryDeleted,
	}
}
func NewChecklistEntryMovedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeEntryMoved,
	}
}
func NewEntryMemberAddedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeEntryMemberAdded,
	}
}
func NewEntryMemberRemovedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeEntryMemberRemoved,
	}
}
func NewChecklistEntryCrossMovedHandler(auditRepo auditcontext.Reader) *ChecklistEventHandler {
	return &ChecklistEventHandler{
		auditReopo: auditRepo,
		mode:       ChecklistHandlerModeEntryMoved,
	}
}

func (h *ChecklistEventHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	actor, err := h.auditReopo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	cardID := evt.Targets[0].EntityID
	boardMeta, err := h.auditReopo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	listMeta, err := h.auditReopo.GetListMetaByCardID(ctx, *evt.BoardID, cardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	cardMeta, err := h.auditReopo.GetCardMeta(ctx, cardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	var checklistMeta *dto.ChecklistResponse
	if h.mode == ChecklistHandlerModeChecklistCreated || h.mode == ChecklistHandlerModeChecklistDeleted || h.mode == ChecklistHandlerModeChecklistPatched {
		checklistId := evt.Targets[1].EntityID

		chk := evt.Payload.StatePayload.Checklists[checklistId]
		checklistMeta = &chk
	} else {
		checklist, err := h.auditReopo.GetChecklistMeta(ctx, evt.Targets[1].EntityID)
		if err != nil {
			return EventBuildResult{}, err
		}
		res := dto.ChecklistToResponse(checklist)
		checklistMeta = &res
	}

	cardLink := AuditEntityLink{
		EntityType:  "card",
		EntityID:    cardID,
		BoardID:     evt.Targets[0].BoardID,
		WorkspaceID: evt.Targets[0].WorkspaceID,
	}
	listLink := AuditEntityLink{
		EntityType:  "list",
		EntityID:    listMeta.ID,
		BoardID:     evt.Targets[0].BoardID,
		WorkspaceID: evt.Targets[0].WorkspaceID,
	}
	boardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    boardMeta.ID,
		BoardID:     evt.Targets[0].BoardID,
		WorkspaceID: evt.Targets[0].WorkspaceID,
	}
	checklistLink := AuditEntityLink{
		EntityType:  "checklist",
		EntityID:    checklistMeta.ID,
		BoardID:     evt.Targets[0].BoardID,
		WorkspaceID: evt.Targets[0].WorkspaceID,
	}
	links := map[string]AuditEntityLink{
		"card":      cardLink,
		"list":      listLink,
		"board":     boardLink,
		"checklist": checklistLink,
	}

	params := map[string]interface{}{
		"cardTitle":      cardMeta.Title,
		"listTitle":      listMeta.Title,
		"boardName":      boardMeta.Name,
		"checklistTitle": checklistMeta.Title,
	}

	var targetUser *models.UserLite
	if h.mode == ChecklistHandlerModeEntryMemberAdded || h.mode == ChecklistHandlerModeEntryMemberRemoved {
		targetUserID := evt.Payload.StatePayload.EntryMembers[0].UserID
		targetUser, err = h.auditReopo.GetUserLiteWithBoardRoleByID(ctx, targetUserID, *evt.WorkspaceID, *evt.BoardID)
		if err != nil {
			return EventBuildResult{}, err
		}
		params["entryMemberUserName"] = targetUser.Name

		entryMemberLink := AuditEntityLink{
			EntityType:  "user",
			EntityID:    targetUserID,
			BoardID:     evt.Targets[0].BoardID,
			WorkspaceID: evt.Targets[0].WorkspaceID,
		}
		links["entryMemberUser"] = entryMemberLink
	}

	var templateKey AuditTemplateKey
	switch h.mode {
	case ChecklistHandlerModeChecklistCreated:
		templateKey = AuditTemplateChecklistCreated
	case ChecklistHandlerModeChecklistPatched:
		templateKey = AuditTemplateChecklistPatched
	case ChecklistHandlerModeChecklistDeleted:
		templateKey = AuditTemplateChecklistDeleted
	case ChecklistHandlerModeChecklistMoved:
		templateKey = AuditTemplateChecklistMoved
	case ChecklistHandlerModeEntryCreated:
		templateKey = AuditTemplateChecklistEntryCreated
	case ChecklistHandlerModeEntryPatched:
		templateKey = AuditTemplateChecklistEntryPatched
	case ChecklistHandlerModeEntryDeleted:
		templateKey = AuditTemplateChecklistEntryDeleted
	case ChecklistHandlerModeEntryMoved:
		templateKey = AuditTemplateChecklistEntryMoved
	case ChecklistHandlerModeEntryMemberAdded:
		templateKey = AuditTemplateChecklistEntryMemberAdded
	case ChecklistHandlerModeEntryMemberRemoved:
		templateKey = AuditTemplateChecklistEntryMemberRemoved
	}
	if h.mode == ChecklistHandlerModeEntryMemberAdded || h.mode == ChecklistHandlerModeEntryMemberRemoved {
		if actor.ID == targetUser.ID {
			if h.mode == ChecklistHandlerModeEntryMemberAdded {
				templateKey = AuditTemplateChecklistEntryMemberAddedSelf
			} else if h.mode == ChecklistHandlerModeEntryMemberRemoved {
				templateKey = AuditTemplateChecklistEntryMemberRemovedSelf
			}
		}
	}

	feedPayload := &AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params:      params,
		Links:       links,
	}
	eventBuildResult := EventBuildResult{
		StatePayload:    evt.Payload.StatePayload,
		RealtimePayload: evt.Payload.RealtimePayload,
		FeedPayload:     *feedPayload,
		Targets:         evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "card",
			EntityID:   cardID,
		},
	}
	return eventBuildResult, nil
}
