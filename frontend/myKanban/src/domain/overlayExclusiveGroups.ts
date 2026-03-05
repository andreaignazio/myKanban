/**
 * Explicit overlay exclusive group identifiers.
 * Only one overlay with the same group can be open at a time.
 * Use (string & {}) tail for backward compatibility with groups not yet listed here.
 */
export type OverlayExclusiveGroup =
    | "board-view-modals"     // CardDetailMenu, ListActionsMenu, BoardActionsMenu
    | "card-detail-modal"     // UserActivityOverlay
    | "share-action-modal"    // CardEditMenu, WorkspaceInbox, BoardCard, etc.
    | "modals"                // AppLayout domain modals
    | "dropdowns"             // Generic dropdowns (RoleBadge, description editor, etc.)
    | "toast-notifications"   // Toast overlay layer
    | "workspace-overlays"    // BoardCardAdd and workspace-level overlays
    | "share-offer-details"   // Share offer detail cards
    | "mention-user-card"     // Mention user picker in card comments
    | "user-card-hover"       // User hover cards
    | (string & {});          // backward compatibility for groups not yet in this type
