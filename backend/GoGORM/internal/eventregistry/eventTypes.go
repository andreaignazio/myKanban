package EventRegistry

type DomainEventType string

const (
	EventCardCreated              DomainEventType = "card.created"
	EventCardPatched              DomainEventType = "card.patched"
	EventBoardPatched             DomainEventType = "board.patched"
	EventBoardLabelCreated        DomainEventType = "board.label.created"
	EventBoardLabelDeleted        DomainEventType = "board.label.deleted"
	EventBoardLabelPatched        DomainEventType = "board.label.patched"
	EventCardLabelAdded           DomainEventType = "card.label.added"
	EventCardLabelRemoved         DomainEventType = "card.label.removed"
	EventCardMemberAdded          DomainEventType = "card.member.added"
	EventCardMemberRemoved        DomainEventType = "card.member.removed"
	EventChecklistCreated         DomainEventType = "checklist.created"
	EventChecklistCopied          DomainEventType = "checklist.copied"
	EventChecklistPatched         DomainEventType = "checklist.patched"
	EventChecklistDeleted         DomainEventType = "checklist.deleted"
	EventChecklistMoved           DomainEventType = "checklist.moved"
	EventChecklistEntryCreated    DomainEventType = "checklist.entry.created"
	EventChecklistEntryPatched    DomainEventType = "checklist.entry.patched"
	EventChecklistEntryDeleted    DomainEventType = "checklist.entry.deleted"
	EventChecklistEntryMoved      DomainEventType = "checklist.entry.moved"
	EventChecklistEntryConverted  DomainEventType = "checklist.entry.converted"
	EventEntryMemberAdded         DomainEventType = "checklist.entry.member.added"
	EventEntryMemberRemoved       DomainEventType = "checklist.entry.member.removed"
	EventChecklistEntryCrossMoved DomainEventType = "checklist.entry.crossmoved"
	EventCardCommentCreated       DomainEventType = "card.comment.created"
	EventCardCommentDeleted       DomainEventType = "card.comment.deleted"
	EventCardCommentEdited        DomainEventType = "card.comment.edited"
	EventListPatched              DomainEventType = "list.patched"
	EventCardMirrored             DomainEventType = "card.mirrored"
	EventCardMirroredTarget       DomainEventType = "card.mirrored.target"
	EventCardMirroredSource       DomainEventType = "card.mirrored.source"
	EventListCardCrossBoardMoved  DomainEventType = "listcard.crossboard.moved"
	EventInboxRootCardMoved       DomainEventType = "inbox.rootcard.moved"
	EventWorkspaceBoardCreated    DomainEventType = "workspace.board.created"
	EventWorkspaceBoardClosed     DomainEventType = "workspace.board.closed"
	EventWorkspaceBoardRestored   DomainEventType = "workspace.board.restored"
	EventWorkspaceBoardPurged     DomainEventType = "workspace.board.purged"
	EventWorkspacePatched         DomainEventType = "workspace.patched"

	EventWorkspaceMemberRoleChanged DomainEventType = "workspace.member.role.changed"
	EventWorkspaceMemberRemoved     DomainEventType = "workspace.member.removed"
	EventBoardMemberRemoved         DomainEventType = "board.member.removed"

	EventCardsUserMemberAdded               DomainEventType = "cards.user.member.added"
	EventCardsUserMemberRemoved             DomainEventType = "cards.user.member.removed"
	EventWorkspaceShareOfferCreated         DomainEventType = "workspace.shareoffer.created"
	EventWorkspaceShareOfferInviteAccepted  DomainEventType = "workspace.shareoffer.invite.accepted"
	EventWorkspaceShareOfferInviteRejected  DomainEventType = "workspace.shareoffer.invite.rejected"
	EventWorkspaceShareOfferInviteRevoked   DomainEventType = "workspace.shareoffer.invite.revoked"
	EventWorkspaceShareOfferRequestAccepted DomainEventType = "workspace.shareoffer.request.accepted"
	EventWorkspaceShareOfferRequestRejected DomainEventType = "workspace.shareoffer.request.rejected"
	EventWorkspaceShareOfferRequestRevoked  DomainEventType = "workspace.shareoffer.request.revoked"
	EventWorkspaceAccessClaimed             DomainEventType = "workspace.access.claimed"

	EventBoardShareRequestCreated  DomainEventType = "board.shareoffer.request.created"
	EventBoardShareRequestAccepted DomainEventType = "board.shareoffer.request.accepted"
	EventBoardShareRequestRejected DomainEventType = "board.shareoffer.request.rejected"
	EventBoardShareRequestRevoked  DomainEventType = "board.shareoffer.request.revoked"
	EventBoardShareInviteCreated   DomainEventType = "board.shareoffer.invite.created"
	EventBoardShareInviteAccepted  DomainEventType = "board.shareoffer.invite.accepted"
	EventBoardShareInviteRejected  DomainEventType = "board.shareoffer.invite.rejected"

	EventBoardShareOfferInviteRevoked DomainEventType = "board.shareoffer.invite.revoked"
	EventBoardAccessClaimed           DomainEventType = "board.access.claimed"

	EventBoardListCreated        DomainEventType = "board.list.created"
	EventBoardListDetatched      DomainEventType = "board.list.detatched"
	EventBoardListRestored       DomainEventType = "board.list.restored"
	EventBoardListPurged         DomainEventType = "board.list.purged"
	EventBoardListMoved          DomainEventType = "board.list.moved"
	EventBoardListPatched        DomainEventType = "board.list.patched"
	EventBoardListMirrored       DomainEventType = "board.list.mirrored"
	EventBoardListMirroredTarget DomainEventType = "board.list.mirrored.target"
	EventBoardListMirroredSource DomainEventType = "board.list.mirrored.source"
	EventBoardListCardDetatched  DomainEventType = "board.listcard.detatched"
	EventBoardListCardMoved      DomainEventType = "board.listcard.moved"
	EventBoardListCardRestored   DomainEventType = "board.listcard.restored"
	EventBoardListCardPurged     DomainEventType = "board.listcard.purged"
	EventBoardListCardsDetatched DomainEventType = "board.listcards.detatched"
)

func (e DomainEventType) IsValidEventType() bool {
	switch e {
	case EventCardCreated,
		EventCardPatched,
		EventBoardPatched,
		EventBoardLabelCreated,
		EventBoardLabelDeleted,
		EventBoardLabelPatched,
		EventCardLabelAdded,
		EventCardLabelRemoved,
		EventCardMemberAdded,
		EventCardMemberRemoved,
		EventChecklistCreated,
		EventChecklistCopied,
		EventChecklistPatched,
		EventChecklistDeleted,
		EventChecklistMoved,
		EventChecklistEntryCreated,
		EventChecklistEntryPatched,
		EventChecklistEntryDeleted,
		EventChecklistEntryMoved,
		EventChecklistEntryConverted,
		EventEntryMemberAdded,
		EventEntryMemberRemoved,
		EventChecklistEntryCrossMoved,
		EventCardCommentCreated,
		EventCardCommentDeleted,
		EventCardCommentEdited,
		EventListPatched,
		EventCardMirrored,
		EventCardMirroredTarget,
		EventCardMirroredSource,
		EventListCardCrossBoardMoved,
		EventInboxRootCardMoved,
		EventWorkspaceBoardCreated,
		EventWorkspaceBoardClosed,
		EventWorkspaceBoardRestored,
		EventWorkspaceBoardPurged,
		EventWorkspacePatched,
		EventWorkspaceMemberRoleChanged,
		EventWorkspaceMemberRemoved,
		EventBoardMemberRemoved,
		EventCardsUserMemberAdded,
		EventCardsUserMemberRemoved,
		EventWorkspaceShareOfferCreated,
		EventWorkspaceShareOfferInviteAccepted,
		EventWorkspaceShareOfferInviteRejected,
		EventWorkspaceShareOfferInviteRevoked,
		EventWorkspaceShareOfferRequestAccepted,
		EventWorkspaceShareOfferRequestRejected,
		EventWorkspaceShareOfferRequestRevoked,
		EventWorkspaceAccessClaimed,
		EventBoardShareInviteCreated,
		EventBoardShareInviteAccepted,
		EventBoardShareInviteRejected,
		EventBoardShareOfferInviteRevoked,
		EventBoardShareRequestCreated,
		EventBoardShareRequestAccepted,
		EventBoardShareRequestRejected,
		EventBoardShareRequestRevoked,
		EventBoardAccessClaimed,
		EventBoardListCreated,
		EventBoardListDetatched,
		EventBoardListRestored,
		EventBoardListPurged,
		EventBoardListMoved,
		EventBoardListPatched,
		EventBoardListMirrored,
		EventBoardListMirroredTarget,
		EventBoardListMirroredSource,
		EventBoardListCardDetatched,
		EventBoardListCardMoved,
		EventBoardListCardRestored,
		EventBoardListCardPurged,
		EventBoardListCardsDetatched:

		return true
	default:
		return false
	}
}

func (e DomainEventType) IsBoardCoreToastEvent() bool {
	switch e {
	case EventCardCreated,
		EventCardPatched,
		EventBoardPatched,
		EventBoardLabelCreated,
		EventBoardLabelDeleted,
		EventBoardLabelPatched,
		EventCardLabelAdded,
		EventCardLabelRemoved,
		EventCardMemberAdded,
		EventCardMemberRemoved,
		EventChecklistCreated,
		EventChecklistCopied,
		EventChecklistPatched,
		EventChecklistDeleted,
		EventChecklistMoved,
		EventChecklistEntryCreated,
		EventChecklistEntryPatched,
		EventChecklistEntryDeleted,
		EventChecklistEntryMoved,
		EventChecklistEntryConverted,
		EventEntryMemberAdded,
		EventEntryMemberRemoved,
		EventChecklistEntryCrossMoved,
		EventCardCommentCreated,
		EventCardCommentDeleted,
		EventCardCommentEdited,
		EventListPatched,
		EventCardMirrored,
		EventCardMirroredTarget,
		EventCardMirroredSource,
		EventListCardCrossBoardMoved,
		EventInboxRootCardMoved,
		EventWorkspaceBoardCreated,
		EventWorkspaceBoardClosed,
		EventWorkspaceBoardRestored,
		EventBoardShareInviteCreated,
		EventBoardShareInviteAccepted,
		EventBoardShareInviteRejected,
		EventBoardShareOfferInviteRevoked,
		EventBoardShareRequestCreated,
		EventBoardShareRequestAccepted,
		EventBoardShareRequestRejected,
		EventBoardShareRequestRevoked,
		EventBoardAccessClaimed,
		EventBoardMemberRemoved,

		EventBoardListCreated,
		EventBoardListDetatched,
		EventBoardListRestored,
		EventBoardListPurged,
		EventBoardListMoved,
		EventBoardListPatched,
		EventBoardListMirrored,
		EventBoardListMirroredTarget,
		EventBoardListMirroredSource,
		EventBoardListCardDetatched,
		EventBoardListCardMoved,
		EventBoardListCardRestored,
		EventBoardListCardPurged,
		EventBoardListCardsDetatched:

		return true
	default:
		return false
	}
}

func (e DomainEventType) IsWorkspaceCoreToastEvent() bool {
	switch e {
	case EventWorkspaceBoardCreated,
		EventWorkspaceBoardClosed,
		EventWorkspaceBoardRestored,
		EventWorkspaceBoardPurged,
		EventWorkspacePatched,
		EventWorkspaceMemberRoleChanged,
		EventWorkspaceMemberRemoved,
		EventWorkspaceShareOfferCreated,
		EventWorkspaceShareOfferInviteAccepted,
		EventWorkspaceShareOfferInviteRejected,
		EventWorkspaceShareOfferInviteRevoked,
		EventWorkspaceShareOfferRequestAccepted,
		EventWorkspaceShareOfferRequestRejected,
		EventWorkspaceShareOfferRequestRevoked,
		EventWorkspaceAccessClaimed,
		EventBoardShareInviteCreated,
		EventBoardShareInviteAccepted,
		EventBoardShareInviteRejected,
		EventBoardShareOfferInviteRevoked,
		EventBoardShareRequestCreated,
		EventBoardShareRequestAccepted,
		EventBoardShareRequestRejected,
		EventBoardShareRequestRevoked,
		EventBoardAccessClaimed,
		EventBoardMemberRemoved,
		EventListPatched:
		return true
	default:
		return false
	}
}

func (e DomainEventType) IsUserFanOutEvent() bool {
	switch e {
	case EventWorkspaceBoardRestored,
		EventWorkspaceMemberRoleChanged,
		EventWorkspaceMemberRemoved,
		EventCardsUserMemberAdded,
		EventCardsUserMemberRemoved,
		EventWorkspaceShareOfferCreated,
		EventWorkspaceShareOfferInviteAccepted,
		EventWorkspaceShareOfferInviteRejected,
		EventWorkspaceShareOfferInviteRevoked,
		EventWorkspaceShareOfferRequestAccepted,
		EventWorkspaceShareOfferRequestRejected,
		EventWorkspaceShareOfferRequestRevoked,
		EventBoardMemberRemoved,
		EventBoardShareInviteCreated,
		EventBoardShareInviteAccepted,
		EventBoardShareInviteRejected,
		EventBoardShareOfferInviteRevoked,
		EventBoardShareRequestCreated,
		EventBoardShareRequestAccepted,
		EventBoardShareRequestRejected,
		EventBoardShareRequestRevoked:
		return true
	default:
		return false
	}
}
