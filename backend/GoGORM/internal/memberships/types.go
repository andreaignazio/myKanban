package memberships

import "GoGORM/models"

type BoardUserRow struct {
	User          models.User          `gorm:"embedded;embeddedPrefix:user_"`
	UserBoard     models.UserBoard     `gorm:"embedded;embeddedPrefix:ub_"`
	UserWorkspace models.UserWorkspace `gorm:"embedded;embeddedPrefix:uw_"`
}
