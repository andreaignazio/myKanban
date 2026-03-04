package userWatch

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rank"
	"GoGORM/models"
	"context"
	"sort"

	"github.com/google/uuid"
)

// Generic contract to re-use one position algorithm with different watch entities.
// This is the closest practical "generic interface" for return handling in Go,
// since model structs are external and cannot be extended with methods here.
type WatchListGetter[T any] func(ctx context.Context, userID uuid.UUID) ([]T, error)

type WatchIDSelector[T any] func(item T) uuid.UUID

type WatchPosSelector[T any] func(item T) string

func sortedByPos[T any](items []T, posSelector WatchPosSelector[T]) []T {
	out := append([]T(nil), items...)
	sort.Slice(out, func(i, j int) bool {
		return posSelector(out[i]) < posSelector(out[j])
	})
	return out
}

func posAtEnd[T any](
	generator *rank.RankGenerator,
	ctx context.Context,
	userID uuid.UUID,
	getter WatchListGetter[T],
	posSelector WatchPosSelector[T],
) (string, error) {
	items, err := getter(ctx, userID)
	if err != nil {
		return "", err
	}
	if len(items) == 0 {
		return generator.GenerateRankBetween("", "")
	}
	ordered := sortedByPos(items, posSelector)
	return generator.GenerateRankBetween(posSelector(ordered[len(ordered)-1]), "")
}

func posAtStart[T any](
	generator *rank.RankGenerator,
	ctx context.Context,
	userID uuid.UUID,
	getter WatchListGetter[T],
	posSelector WatchPosSelector[T],
) (string, error) {
	items, err := getter(ctx, userID)
	if err != nil {
		return "", err
	}
	if len(items) == 0 {
		return generator.GenerateRankBetween("", "")
	}
	ordered := sortedByPos(items, posSelector)
	return generator.GenerateRankBetween("", posSelector(ordered[0]))
}

func posAfterID[T any](
	generator *rank.RankGenerator,
	ctx context.Context,
	userID, afterID uuid.UUID,
	getter WatchListGetter[T],
	idSelector WatchIDSelector[T],
	posSelector WatchPosSelector[T],
) (string, error) {
	items, err := getter(ctx, userID)
	if err != nil {
		return "", err
	}
	if len(items) == 0 {
		return "", domainerr.ErrValidation
	}

	ordered := sortedByPos(items, posSelector)
	idx := -1
	for i, item := range ordered {
		if idSelector(item) == afterID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}

	prevPos := posSelector(ordered[idx])
	if idx+1 < len(ordered) {
		return generator.GenerateRankBetween(prevPos, posSelector(ordered[idx+1]))
	}
	return generator.GenerateRankBetween(prevPos, "")
}

func posBeforeID[T any](
	generator *rank.RankGenerator,
	ctx context.Context,
	userID, beforeID uuid.UUID,
	getter WatchListGetter[T],
	idSelector WatchIDSelector[T],
	posSelector WatchPosSelector[T],
) (string, error) {
	items, err := getter(ctx, userID)
	if err != nil {
		return "", err
	}
	if len(items) == 0 {
		return "", domainerr.ErrValidation
	}

	ordered := sortedByPos(items, posSelector)
	idx := -1
	for i, item := range ordered {
		if idSelector(item) == beforeID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}

	nextPos := posSelector(ordered[idx])
	if idx > 0 {
		return generator.GenerateRankBetween(posSelector(ordered[idx-1]), nextPos)
	}
	return generator.GenerateRankBetween("", nextPos)
}

func (s *UserWatchService) BoardWatchPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error) {
	return posAtEnd(s.generator, ctx, userID, s.repo.GetUserBoardWatches, func(item models.BoardWatch) string {
		return item.Pos
	})
}

func (s *UserWatchService) BoardWatchPosAtStart(ctx context.Context, userID uuid.UUID) (string, error) {
	return posAtStart(s.generator, ctx, userID, s.repo.GetUserBoardWatches, func(item models.BoardWatch) string {
		return item.Pos
	})
}

func (s *UserWatchService) BoardWatchPosAfterID(ctx context.Context, userID, afterID uuid.UUID) (string, error) {
	return posAfterID(
		s.generator,
		ctx,
		userID,
		afterID,
		s.repo.GetUserBoardWatches,
		func(item models.BoardWatch) uuid.UUID { return item.BoardID },
		func(item models.BoardWatch) string { return item.Pos },
	)
}

func (s *UserWatchService) BoardWatchPosBeforeID(ctx context.Context, userID, beforeID uuid.UUID) (string, error) {
	return posBeforeID(
		s.generator,
		ctx,
		userID,
		beforeID,
		s.repo.GetUserBoardWatches,
		func(item models.BoardWatch) uuid.UUID { return item.BoardID },
		func(item models.BoardWatch) string { return item.Pos },
	)
}

func (s *UserWatchService) ListWatchPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error) {
	return posAtEnd(s.generator, ctx, userID, s.repo.GetUserListWatches, func(item models.ListWatch) string {
		return item.Pos
	})
}

func (s *UserWatchService) ListWatchPosAtStart(ctx context.Context, userID uuid.UUID) (string, error) {
	return posAtStart(s.generator, ctx, userID, s.repo.GetUserListWatches, func(item models.ListWatch) string {
		return item.Pos
	})
}

func (s *UserWatchService) ListWatchPosAfterID(ctx context.Context, userID, afterID uuid.UUID) (string, error) {
	return posAfterID(
		s.generator,
		ctx,
		userID,
		afterID,
		s.repo.GetUserListWatches,
		func(item models.ListWatch) uuid.UUID { return item.ListID },
		func(item models.ListWatch) string { return item.Pos },
	)
}

func (s *UserWatchService) ListWatchPosBeforeID(ctx context.Context, userID, beforeID uuid.UUID) (string, error) {
	return posBeforeID(
		s.generator,
		ctx,
		userID,
		beforeID,
		s.repo.GetUserListWatches,
		func(item models.ListWatch) uuid.UUID { return item.ListID },
		func(item models.ListWatch) string { return item.Pos },
	)
}

func (s *UserWatchService) CardWatchPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error) {
	return posAtEnd(s.generator, ctx, userID, s.repo.GetUserCardWatches, func(item models.CardWatch) string {
		return item.Pos
	})
}

func (s *UserWatchService) CardWatchPosAtStart(ctx context.Context, userID uuid.UUID) (string, error) {
	return posAtStart(s.generator, ctx, userID, s.repo.GetUserCardWatches, func(item models.CardWatch) string {
		return item.Pos
	})
}

func (s *UserWatchService) CardWatchPosAfterID(ctx context.Context, userID, afterID uuid.UUID) (string, error) {
	return posAfterID(
		s.generator,
		ctx,
		userID,
		afterID,
		s.repo.GetUserCardWatches,
		func(item models.CardWatch) uuid.UUID { return item.CardID },
		func(item models.CardWatch) string { return item.Pos },
	)
}

func (s *UserWatchService) CardWatchPosBeforeID(ctx context.Context, userID, beforeID uuid.UUID) (string, error) {
	return posBeforeID(
		s.generator,
		ctx,
		userID,
		beforeID,
		s.repo.GetUserCardWatches,
		func(item models.CardWatch) uuid.UUID { return item.CardID },
		func(item models.CardWatch) string { return item.Pos },
	)
}
