package subscriptionplan

import "strings"

type Plan string

const (
	Free    Plan = "free"
	Pro     Plan = "pro"
	Premium Plan = "premium"
)

func Parse(raw string) (Plan, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(Free):
		return Free, true
	case string(Pro):
		return Pro, true
	case string(Premium):
		return Premium, true
	default:
		return "", false
	}
}

func (p Plan) String() string {
	return string(p)
}

func (p Plan) IsValid() bool {
	_, ok := rank(p)
	return ok
}

func (p Plan) Compare(other Plan) (int, bool) {
	left, ok := rank(p)
	if !ok {
		return 0, false
	}
	right, ok := rank(other)
	if !ok {
		return 0, false
	}
	return left - right, true
}

func (p Plan) AtLeast(min Plan) (bool, bool) {
	cmp, ok := p.Compare(min)
	if !ok {
		return false, false
	}
	return cmp >= 0, true
}

func rank(plan Plan) (int, bool) {
	switch plan {
	case Free:
		return 0, true
	case Pro:
		return 1, true
	case Premium:
		return 2, true
	default:
		return 0, false
	}
}
