package actions

type Action string

const (
	WorkspacePatch             Action = "workspace:patch"
	InboxCardMoveToListInBoard Action = "inbox:card:move:board:list"
)
