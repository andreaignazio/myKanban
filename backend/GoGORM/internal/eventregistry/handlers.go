package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"fmt"
)

func buildHandlers(auditRepo auditcontext.Reader) map[DomainEventType]EventHandler {
	return map[DomainEventType]EventHandler{
		EventCardCreated:                        NewCardCreatedHandler(auditRepo),
		EventCardPatched:                        NewCardPatchedHandler(auditRepo),
		EventBoardPatched:                       NewBoardPatchedHandler(auditRepo),
		EventBoardLabelCreated:                  NewBoardLabelCreatedHandler(auditRepo),
		EventBoardLabelDeleted:                  NewBoardLabelDeletedHandler(auditRepo),
		EventBoardLabelPatched:                  NewBoardLabelPatchedHandler(auditRepo),
		EventCardLabelAdded:                     NewCardLabelAddedHandler(auditRepo),
		EventCardLabelRemoved:                   NewCardLabelRemovedHandler(auditRepo),
		EventCardMemberAdded:                    NewCardMemberAddedHandler(auditRepo),
		EventCardMemberRemoved:                  NewCardMemberRemovedHandler(auditRepo),
		EventChecklistCreated:                   NewChecklistCreatedHandler(auditRepo),
		EventChecklistCopied:                    NewChecklistCreatedHandler(auditRepo),
		EventChecklistPatched:                   NewChecklistPatchedHandler(auditRepo),
		EventChecklistDeleted:                   NewChecklistDeletedHandler(auditRepo),
		EventChecklistMoved:                     NewChecklistMovedHandler(auditRepo),
		EventChecklistEntryCreated:              NewChecklistEntryCreatedHandler(auditRepo),
		EventChecklistEntryPatched:              NewChecklistEntryPatchedHandler(auditRepo),
		EventChecklistEntryDeleted:              NewChecklistEntryDeletedHandler(auditRepo),
		EventChecklistEntryMoved:                NewChecklistEntryMovedHandler(auditRepo),
		EventChecklistEntryConverted:            NewChecklistEntryMovedHandler(auditRepo),
		EventEntryMemberAdded:                   NewEntryMemberAddedHandler(auditRepo),
		EventEntryMemberRemoved:                 NewEntryMemberRemovedHandler(auditRepo),
		EventChecklistEntryCrossMoved:           NewChecklistEntryCrossMovedHandler(auditRepo),
		EventCardCommentCreated:                 NewCardCommentCreatedHandler(auditRepo),
		EventCardCommentDeleted:                 NewCardCommentDeletedHandler(auditRepo),
		EventCardCommentEdited:                  NewCardCommentEditedHandler(auditRepo),
		EventListPatched:                        NewListPatchedHandler(auditRepo),
		EventCardMirrored:                       NewCardMirrorHandler(auditRepo),
		EventCardMirroredTarget:                 NewCardMirrorHandler(auditRepo),
		EventCardMirroredSource:                 NewCardMirrorHandler(auditRepo),
		EventWorkspaceBoardCreated:              NewWorkspaceBoardCreatedHandler(auditRepo),
		EventWorkspaceBoardClosed:               NewWorkspaceBoardClosedHandler(auditRepo),
		EventWorkspaceBoardRestored:             NewWorkspaceBoardRestoredHandler(auditRepo),
		EventWorkspaceBoardPurged:               NewWorkspaceBoardPurgedHandler(auditRepo),
		EventWorkspacePatched:                   NewWorkspacePatchedHandler(auditRepo),
		EventWorkspaceMemberRoleChanged:         NewWorkspaceMembershipHandlerRoleChanged(auditRepo),
		EventWorkspaceMemberRemoved:             NewWorkspaceMembershipHandlerRemoved(auditRepo),
		EventBoardMemberRemoved:                 NewBoardMembershipRemovedHandler(auditRepo),
		EventBoardMemberRoleChanged:             NewBoardMemberRoleChangedHandler(auditRepo),
		EventWorkspaceShareOfferCreated:         NewWorkspaceShareOfferCreatedHandler(auditRepo),
		EventWorkspaceShareOfferInviteAccepted:  NewWorkspaceShareOfferInviteAcceptedHandler(auditRepo),
		EventWorkspaceShareOfferInviteRejected:  NewWorkspaceShareOfferInviteRejectedHandler(auditRepo),
		EventWorkspaceShareOfferInviteRevoked:   NewWorkspaceShareOfferInviteRevokedHandler(auditRepo),
		EventWorkspaceShareOfferRequestAccepted: NewWorkspaceShareOfferRequestAcceptedHandler(auditRepo),
		EventWorkspaceShareOfferRequestRejected: NewWorkspaceShareOfferRequestRejectedHandler(auditRepo),
		EventWorkspaceShareOfferRequestRevoked:  NewWorkspaceShareOfferRequestRevokedHandler(auditRepo),
		EventWorkspaceAccessClaimed:             NewWorkspaceAccessClaimedHandler(auditRepo),
		EventBoardShareInviteCreated:            NewBoardShareInviteCreatedHandler(auditRepo),
		EventBoardShareInviteAccepted:           NewBoardShareInviteAcceptedHandler(auditRepo),
		EventBoardShareInviteRejected:           NewBoardShareInviteRejectedHandler(auditRepo),
		EventBoardShareOfferInviteRevoked:       NewBoardShareInviteRevokedHandler(auditRepo),
		EventBoardShareRequestCreated:           NewBoardShareRequestCreatedHandler(auditRepo),
		EventCardsUserMemberAdded:               NewCardsUserMemberAddedHandler(auditRepo),
		EventCardsUserMemberRemoved:             NewCardsUserMemberRemovedHandler(auditRepo),
		EventBoardShareRequestAccepted:          NewBoardShareRequestAcceptedHandler(auditRepo),
		EventBoardShareRequestRejected:          NewBoardShareRequestRejectedHandler(auditRepo),
		EventBoardShareRequestRevoked:           NewBoardShareRequestRevokedHandler(auditRepo),
		EventBoardAccessClaimed:                 NewBoardAccessClaimedHandler(auditRepo),
		EventBoardListCreated:                   NewBoardListCreatedHandler(auditRepo),
		EventBoardListDetatched:                 NewBoardListDetatchedHandler(auditRepo),
		EventBoardListRestored:                  NewBoardListRestoredHandler(auditRepo),
		EventBoardListPurged:                    NewBoardListPurgedHandler(auditRepo),
		EventBoardListMoved:                     NewBoardListMovedHandler(auditRepo),
		EventBoardListPatched:                   NewBoardListPatchedHandler(auditRepo),
		EventBoardListMirrored:                  NewBoardListMirroredHandler(auditRepo),
		EventBoardListMirroredTarget:            NewBoardListMirroredHandler(auditRepo),
		EventBoardListMirroredSource:            NewBoardListMirroredHandler(auditRepo),
		EventBoardListCardMoved:                 NewBoardListCardMovedHandler(auditRepo),
		EventBoardListCardRestored:              NewBoardListCardRestoredHandler(auditRepo),
		EventBoardListCardPurged:                NewBoardListCardPurgedHandler(auditRepo),
		EventBoardListCardDetatched:             NewBoardListCardDetatchedHandler(auditRepo),
		EventBoardListCardsDetatched:            NewBoardListCardDetatchedHandler(auditRepo),
	}
}

func getHandler(handlers map[DomainEventType]EventHandler, eventType DomainEventType) (EventHandler, error) {
	h, ok := handlers[eventType]
	if !ok {
		return nil, fmt.Errorf("unsupported event type: %s", eventType)
	}
	return h, nil
}
