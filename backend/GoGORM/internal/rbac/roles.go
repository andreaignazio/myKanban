package rbac

import (
	"database/sql/driver"
	"fmt"
	"strings"
)

type Role uint8

const (
	Viewer Role = iota
	Member
	Admin
	Owner
)

func (r Role) String() string {
	switch r {
	case Viewer:
		return "viewer"
	case Member:
		return "member"
	case Admin:
		return "admin"
	case Owner:
		return "owner"
	default:
		return "unknown"
	}
}

func ParseRole(r string) (Role, bool) {
	r = strings.ToLower(r)
	switch r {
	case "viewer":
		return Viewer, true
	case "member":
		return Member, true
	case "admin":
		return Admin, true
	case "owner":
		return Owner, true
	default:
		return Viewer, false
	}
}

func AtLeast(role, minRole Role) bool {
	if role >= minRole {
		return true
	}
	return false
}

func AllowedAtLeast(minRole Role) []string {
	out := []string{}
	for r := Viewer; r <= Owner; r++ {
		if AtLeast(r, minRole) {
			out = append(out, r.String())
		}
	}
	return out

}

func (r Role) Value() (driver.Value, error) {
	return r.String(), nil
}

func (r *Role) Scan(value interface{}) error {
	if value == nil {
		*r = Viewer
		return nil
	}

	switch v := value.(type) {
	case string:
		parsed, ok := ParseRole(v)
		if !ok {
			return fmt.Errorf("invalid role value: %q", v)
		}
		*r = parsed
		return nil
	case []byte:
		parsed, ok := ParseRole(string(v))
		if !ok {
			return fmt.Errorf("invalid role value: %q", string(v))
		}
		*r = parsed
		return nil
	default:
		return fmt.Errorf("unsupported role type: %T", value)
	}
}
