export type labelEventTypes =
    | "board.label.created"
    | "board.label.patched"
    | "board.label.deleted"
    | "card.label.added"
    | "card.label.removed";

export type CardMemberEventTypes =
    | "card.member.added"
    | "card.member.removed";

export type ChecklistEventTypes =
    | "checklist.created"
    | "checklist.copied"
    | "checklist.patched"
    | "checklist.deleted"
    | "checklist.moved"
    | "checklist.entry.created"
    | "checklist.entry.patched"
    | "checklist.entry.deleted"
    | "checklist.entry.moved"
    | "checklist.entry.converted"
    | "checklist.entry.member.added"
    | "checklist.entry.member.removed"
    | "checklist.entry.crossmoved";

export type CardCommentEventTypes =
    | "card.comment.created"
    | "card.comment.edited"
    | "card.comment.deleted"
    | "card.comment.patched";

export type CardEventTypes =
    | "card.created"
    | "card.patched"
    | "card.mirrored"
    | "card.mirrored.target"
    | "card.mirrored.source";

export type ListEventTypes =
    | "list.patched"
    | "listcard.crossboard.moved";

export type WorkspaceEventTypes =
    | "workspace.board.created"
    | "workspace.board.closed"
    | "workspace.board.restored"
    | "workspace.board.purged"
    | "workspace.member.role.changed"
    | "workspace.member.removed"
    | "workspace.access.claimed"
    | "workspace.shareoffer.created"
    | "workspace.shareoffer.invite.accepted"
    | "workspace.shareoffer.invite.rejected"
    | "workspace.shareoffer.invite.revoked"
    | "workspace.shareoffer.request.accepted"
    | "workspace.shareoffer.request.rejected"
    | "workspace.shareoffer.request.revoked"
    | "workspace.sharelink.created"
    | "workspace.sharelink.revoked"
    | "workspace.subscription.created"
    | "workspace.subscription.updated"
    | "workspace.subscription.canceled"
    | "workspace.member.suspension.updated"
    | "workspace.board.suspension.updated";



export type BoradEventTypes =
    | "board.member.removed"
    | "board.access.claimed"
    | "board.shareoffer.invite.created"
    | "board.shareoffer.invite.accepted"
    | "board.shareoffer.invite.rejected"
    | "board.shareoffer.invite.revoked"
    | "board.shareoffer.request.created"
    | "board.shareoffer.request.accepted"
    | "board.shareoffer.request.rejected"
    | "board.shareoffer.request.revoked"
    | "board.sharelink.created"
    | "board.sharelink.revoked"
    | "board.listcards.detached";


export type CardsUserEventTypes =
    | "cards.user.member.added"
    | "cards.user.member.removed";

export type InboxEventTypes =
    | "inbox.rootcard.moved"
    | "inbox.cards.invalidated"
    | "inbox.card.created"
    | "inbox.card.mirrored"
    | "inbox.card.moved"
    | "inbox.card.detatched"
    | "inbox.card.converted"
    | "inbox.card.patched";

export type DomainEventTypes =
    | CardEventTypes
    | labelEventTypes
    | CardMemberEventTypes
    | ChecklistEventTypes
    | CardCommentEventTypes
    | ListEventTypes
    | WorkspaceEventTypes
    | CardsUserEventTypes
    | InboxEventTypes
    | BoradEventTypes
    | BoardListEventTypes;

export type UserEventTypes =
    | "user.notification.created"
    | "user.notification.read"
    | "user.notification.read_all"
    | "inbox.cards.invalidated"
    | "inbox.rootcard.moved"
    | "inbox.card.created"
    | "inbox.card.mirrored"
    | "inbox.card.moved"
    | "inbox.card.detatched"
    | "inbox.card.converted"
    | "inbox.card.patched"
    | "cards.user.member.added"
    | "cards.user.member.removed"
    | "workspace.user.board.restored"
    | "workspace.user.member.role.changed"
    | "workspace.user.member.removed"
    | "board.user.member.removed"
    | "board.user.member.role.changed"
    | "workspace.user.shareoffer.created"
    | "workspace.user.shareoffer.admin.invite.created"
    | "workspace.user.shareoffer.nonadmin.invite.created"
    | "workspace.user.shareoffer.admin.request.created"
    | "workspace.user.shareoffer.nonadmin.request.created"
    | "workspace.user.shareoffer.admin.request.accepted"
    | "workspace.user.shareoffer.nonadmin.request.accepted"
    | "workspace.user.shareoffer.admin.request.rejected"
    | "workspace.user.shareoffer.nonadmin.request.rejected"
    | "workspace.user.shareoffer.admin.request.revoked"
    | "workspace.user.shareoffer.nonadmin.request.revoked"
    | "workspace.user.shareoffer.invite.accepted"
    | "workspace.user.shareoffer.invite.rejected"
    | "workspace.user.shareoffer.invite.revoked"
    | "board.user.shareoffer.admin.request.created"
    | "board.user.shareoffer.nonadmin.request.created"
    | "board.user.shareoffer.admin.request.accepted"
    | "board.user.shareoffer.nonadmin.request.accepted"
    | "board.user.shareoffer.admin.request.rejected"
    | "board.user.shareoffer.nonadmin.request.rejected"
    | "board.user.shareoffer.admin.request.revoked"
    | "board.user.shareoffer.nonadmin.request.revoked"
    | "board.user.shareoffer.admin.invite.created"
    | "board.user.shareoffer.nonadmin.invite.created"
    | "board.user.shareoffer.admin.invite.accepted"
    | "board.user.shareoffer.nonadmin.invite.accepted"
    | "board.user.shareoffer.admin.invite.rejected"
    | "board.user.shareoffer.nonadmin.invite.rejected"
    | "board.user.shareoffer.admin.invite.revoked"
    | "board.user.shareoffer.nonadmin.invite.revoked"
    | "workspace.user.member.suspension.updated"

export type BoardListEventTypes =
    | "board.list.created"
    | "board.list.patched"
    | "board.list.deleted"
    | "board.list.moved"
    | "board.list.mirrored"
    | "board.list.mirrored.target"
    | "board.list.mirrored.source"
    | "board.listcard.detatched";