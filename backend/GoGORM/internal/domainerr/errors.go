package domainerr

import (
	"GoGORM/internal/rbac"
	"errors"
	"strings"
)

var ErrInvalidName = errors.New("Invalid name")
var ErrNotAuthorized = errors.New("User is not authorized")
var ErrForbidden = errors.New("Action is forbidden")
var ErrNotFound = errors.New("Resource not found")
var ErrConflict = errors.New("Resource conflict")
var ErrInternal = errors.New("Internal server error")
var ErrValidation = errors.New("Validation error")

var ErrInvalidSignature = errors.New("stripe: invalid signature")
var ErrUnsupportedEvent = errors.New("stripe: unsupported event type")
var ErrMissingPriceID = errors.New("stripe: missing price ID for the selected plan")
var ErrMissingUrl = errors.New("stripe: missing success or cancel URL in the checkout session request")

type AppError struct {
	Err error
	Msg string
	Ops []string
}

func (e *AppError) Error() string {
	if e == nil {
		return ""
	}
	base := ""
	if e.Err != nil {
		base = e.Err.Error()
	}
	if e.Msg != "" {
		if base != "" {
			base = base + ": " + e.Msg
		} else {
			base = e.Msg
		}
	}
	if len(e.Ops) > 0 {
		return strings.Join(e.Ops, " -> ") + ": " + base
	}
	return base
}

func (e *AppError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

func New(err error, msg string, ops ...string) error {
	return &AppError{Err: err, Msg: msg, Ops: ops}
}

func Wrap(err error, op string) error {
	if err == nil {
		return nil
	}
	if op == "" {
		return err
	}
	var appErr *AppError
	if errors.As(err, &appErr) {
		clone := *appErr
		clone.Ops = append([]string{op}, clone.Ops...)
		return &clone
	}
	return &AppError{Err: err, Ops: []string{op}}
}

func WithKind(err error, kind error) error {
	if err == nil {
		return nil
	}
	if kind == nil {
		return err
	}
	var appErr *AppError
	if errors.As(err, &appErr) {
		clone := *appErr
		clone.Err = kind
		return &clone
	}
	return &AppError{Err: kind}
}

func Message(err error) string {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Msg
	}
	return ""
}

func Ops(err error) []string {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return append([]string{}, appErr.Ops...)
	}
	return nil
}

func MapRepoErr(err error, notFoundAsForbidden bool) error {
	if err == nil {
		return nil
	}
	var kind error
	if errors.Is(err, ErrNotFound) {
		if notFoundAsForbidden {
			kind = ErrForbidden
		} else {
			kind = ErrNotFound
		}
	} else if errors.Is(err, ErrConflict) {
		kind = ErrConflict
	} else if errors.Is(err, ErrValidation) {
		kind = ErrValidation
	} else if errors.Is(err, ErrForbidden) {
		kind = ErrForbidden
	} else if errors.Is(err, ErrInternal) {
		kind = ErrInternal
	} else {
		kind = ErrInternal
	}

	return WithKind(Wrap(err, "service"), kind)
}

func ParseAndCheckRole(roleStr string, minRole rbac.Role) (rbac.Role, error) {
	role, ok := rbac.ParseRole(roleStr)
	if !ok {
		return 0, ErrValidation
	}
	if !rbac.AtLeast(role, minRole) {
		return 0, ErrForbidden
	}
	return role, nil
}
