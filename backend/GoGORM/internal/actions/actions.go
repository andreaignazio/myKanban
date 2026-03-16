package actions

type Action string

const (
	WorkspacePatch             Action = "workspace:patch"
	WorkspaceDelete            Action = "workspace:delete"
	InboxCardMoveToListInBoard Action = "inbox:card:move:board:list"
	InboxCardDetatch           Action = "inbox:card:detatch"

	PatchBoardCard       Action = "card:patch:board:list"
	PatchInboxMirrorCard Action = "card:patch:inbox:mirror"
	ReadListCard         Action = "card:read:board:list"
	CreateListCard       Action = "card:create:board:list"
	CopyListCard         Action = "card:copy:board:list"
)
