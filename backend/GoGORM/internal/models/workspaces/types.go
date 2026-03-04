package workspaces

import "GoGORM/models"

type WorkspaceMemberRow struct {
	User          models.User          `gorm:"embedded;embeddedPrefix:user_"`
	UserWorkspace models.UserWorkspace `gorm:"embedded;embeddedPrefix:uw_"`
}

func WorkspaceMemberRowsToModels(rows []WorkspaceMemberRow) ([]models.User, []models.UserWorkspace) {
	users := make([]models.User, 0, len(rows))
	userWorkspaces := make([]models.UserWorkspace, 0, len(rows))
	for _, row := range rows {
		users = append(users, row.User)
		userWorkspaces = append(userWorkspaces, row.UserWorkspace)
	}
	return users, userWorkspaces
}
