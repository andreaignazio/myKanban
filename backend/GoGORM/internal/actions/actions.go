package actions

type Action string

const (
	WorkspacePatch             Action = "workspace:patch"
	InboxCardMoveToListInBoard Action = "inbox:card:move:board:list"
	InboxCardDetatch           Action = "inbox:card:detatch"

	CardInListPatch Action = "card:patch:board:list"
	ReadListCard    Action = "card:read:board:list"
	CreateListCard  Action = "card:create:board:list"
	CopyListCard    Action = "card:copy:board:list"
)
