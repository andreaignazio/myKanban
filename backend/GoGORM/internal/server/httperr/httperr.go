package httperr

import (
	"GoGORM/internal/domainerr"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Code    string   `json:"Code"`
	Message string   `json:"Message"`
	Details string   `json:"Details,omitempty"`
	Trace   []string `json:"Trace,omitempty"`
}

func Write(c *gin.Context, err error) {
	if err == nil {
		return
	}
	status, code, message := classify(err)
	res := ErrorResponse{
		Code:    code,
		Message: message,
	}
	if details := domainerr.Message(err); details != "" && status < 500 {
		res.Details = details
	}
	if trace := domainerr.Ops(err); len(trace) > 0 {
		res.Trace = trace
	}
	if status >= 500 {
		res.Details = ""
	}
	if status == http.StatusInternalServerError && res.Message == "" {
		res.Message = "internal error"
	}
	c.JSON(status, res)
}

func WriteOp(c *gin.Context, err error, op string) {
	Write(c, domainerr.Wrap(err, op))
}

func WriteBindingError(c *gin.Context, err error, op string) {
	msg := "invalid body"
	if err != nil {
		msg = err.Error()
	}
	Write(c, domainerr.New(domainerr.ErrValidation, msg, op))
}

func WriteParamsError(c *gin.Context, err error, op string) {
	msg := "invalid params"
	if err != nil {
		msg = err.Error()
	}
	Write(c, domainerr.New(domainerr.ErrValidation, msg, op))
}

func classify(err error) (int, string, string) {
	if errors.Is(err, domainerr.ErrNotFound) {
		return http.StatusNotFound, "not_found", "not found"
	}
	if errors.Is(err, domainerr.ErrForbidden) {
		return http.StatusForbidden, "forbidden", "forbidden"
	}
	if errors.Is(err, domainerr.ErrValidation) {
		return http.StatusBadRequest, "validation_error", "bad request"
	}
	if errors.Is(err, domainerr.ErrConflict) {
		return http.StatusConflict, "conflict", "conflict"
	}
	if errors.Is(err, domainerr.ErrInternal) {
		return http.StatusInternalServerError, "internal_error", "internal error"
	}
	return http.StatusInternalServerError, "internal_error", "internal error"
}
