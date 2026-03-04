package rbac

import "errors"

type BoardListAccessMode string

const (
	BoardListEditable BoardListAccessMode = "editable"
	BoardListReadonly BoardListAccessMode = "readonly"
)

func (b BoardListAccessMode) String() string {
	return string(b)
}
func ParseBoardListAccessMode(mode string) (BoardListAccessMode, error) {
	switch mode {
	case string(BoardListEditable):
		return BoardListEditable, nil
	case string(BoardListReadonly):
		return BoardListReadonly, nil
	default:
		return "", errors.New("invalidRole")
	}
}