package EventRegistry

import (
	"GoGORM/models"
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

type fakeBoardLookup struct {
	boards         map[uuid.UUID]*models.Board
	errByBoardID   map[uuid.UUID]error
	callsByBoardID map[uuid.UUID]int
}

func newFakeBoardLookup() *fakeBoardLookup {
	return &fakeBoardLookup{
		boards:         make(map[uuid.UUID]*models.Board),
		errByBoardID:   make(map[uuid.UUID]error),
		callsByBoardID: make(map[uuid.UUID]int),
	}
}

func (f *fakeBoardLookup) GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error) {
	f.callsByBoardID[boardID]++
	if err, ok := f.errByBoardID[boardID]; ok {
		return nil, err
	}
	if board, ok := f.boards[boardID]; ok {
		return board, nil
	}
	return nil, errors.New("not found")
}

func TestResolveWorkspaceID_CacheMissThenHit(t *testing.T) {
	fake := newFakeBoardLookup()
	boardID := uuid.New()
	workspaceID := uuid.New()
	fake.boards[boardID] = &models.Board{ID: boardID, WorkspaceID: workspaceID}

	resolver := NewCachedWorkspaceResolver(fake, 5*time.Minute, 10000, false)

	got1, err := resolver.ResolveWorkspaceID(context.Background(), boardID)
	if err != nil {
		t.Fatalf("first resolve failed: %v", err)
	}
	if got1 != workspaceID {
		t.Fatalf("first resolve mismatch: got=%s want=%s", got1, workspaceID)
	}

	got2, err := resolver.ResolveWorkspaceID(context.Background(), boardID)
	if err != nil {
		t.Fatalf("second resolve failed: %v", err)
	}
	if got2 != workspaceID {
		t.Fatalf("second resolve mismatch: got=%s want=%s", got2, workspaceID)
	}

	if fake.callsByBoardID[boardID] != 1 {
		t.Fatalf("expected 1 repo call, got %d", fake.callsByBoardID[boardID])
	}
}

func TestResolveWorkspaceID_ExpiredEntryRefreshes(t *testing.T) {
	fake := newFakeBoardLookup()
	boardID := uuid.New()
	workspaceID := uuid.New()
	fake.boards[boardID] = &models.Board{ID: boardID, WorkspaceID: workspaceID}

	resolver := NewCachedWorkspaceResolver(fake, 20*time.Millisecond, 10000, false)

	if _, err := resolver.ResolveWorkspaceID(context.Background(), boardID); err != nil {
		t.Fatalf("first resolve failed: %v", err)
	}
	time.Sleep(30 * time.Millisecond)
	if _, err := resolver.ResolveWorkspaceID(context.Background(), boardID); err != nil {
		t.Fatalf("second resolve failed: %v", err)
	}

	if fake.callsByBoardID[boardID] != 2 {
		t.Fatalf("expected 2 repo calls after expiry, got %d", fake.callsByBoardID[boardID])
	}
}

func TestResolveWorkspaceID_LRUEviction(t *testing.T) {
	fake := newFakeBoardLookup()
	board1 := uuid.New()
	board2 := uuid.New()
	board3 := uuid.New()
	ws1 := uuid.New()
	ws2 := uuid.New()
	ws3 := uuid.New()
	fake.boards[board1] = &models.Board{ID: board1, WorkspaceID: ws1}
	fake.boards[board2] = &models.Board{ID: board2, WorkspaceID: ws2}
	fake.boards[board3] = &models.Board{ID: board3, WorkspaceID: ws3}

	resolver := NewCachedWorkspaceResolver(fake, 5*time.Minute, 2, false)

	if _, err := resolver.ResolveWorkspaceID(context.Background(), board1); err != nil {
		t.Fatalf("resolve board1 failed: %v", err)
	}
	if _, err := resolver.ResolveWorkspaceID(context.Background(), board2); err != nil {
		t.Fatalf("resolve board2 failed: %v", err)
	}
	if _, err := resolver.ResolveWorkspaceID(context.Background(), board3); err != nil {
		t.Fatalf("resolve board3 failed: %v", err)
	}
	if _, err := resolver.ResolveWorkspaceID(context.Background(), board1); err != nil {
		t.Fatalf("resolve board1 again failed: %v", err)
	}

	if fake.callsByBoardID[board1] != 2 {
		t.Fatalf("expected board1 to be queried twice after eviction, got %d", fake.callsByBoardID[board1])
	}
}

func TestResolveWorkspaceID_RepoError(t *testing.T) {
	fake := newFakeBoardLookup()
	boardID := uuid.New()
	fake.errByBoardID[boardID] = errors.New("db down")

	resolver := NewCachedWorkspaceResolver(fake, 5*time.Minute, 10000, false)
	_, err := resolver.ResolveWorkspaceID(context.Background(), boardID)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
}
