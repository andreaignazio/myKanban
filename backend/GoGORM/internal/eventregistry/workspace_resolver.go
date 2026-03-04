package EventRegistry

import (
	"GoGORM/models"
	"container/list"
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

type BoardWorkspaceLookup interface {
	GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
}

type WorkspaceResolver interface {
	ResolveWorkspaceID(ctx context.Context, boardID uuid.UUID) (uuid.UUID, error)
}

type cacheEntry struct {
	boardID     uuid.UUID
	workspaceID uuid.UUID
	expiresAt   time.Time
}

type CachedWorkspaceResolver struct {
	repo           BoardWorkspaceLookup
	ttl            time.Duration
	maxEntries     int
	includeDeleted bool

	mu    sync.RWMutex
	ll    *list.List
	items map[uuid.UUID]*list.Element
}

func NewCachedWorkspaceResolver(repo BoardWorkspaceLookup, ttl time.Duration, maxEntries int, includeDeleted bool) *CachedWorkspaceResolver {
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	if maxEntries <= 0 {
		maxEntries = 10_000
	}
	return &CachedWorkspaceResolver{
		repo:           repo,
		ttl:            ttl,
		maxEntries:     maxEntries,
		includeDeleted: includeDeleted,
		ll:             list.New(),
		items:          make(map[uuid.UUID]*list.Element),
	}
}

func (r *CachedWorkspaceResolver) ResolveWorkspaceID(ctx context.Context, boardID uuid.UUID) (uuid.UUID, error) {
	now := time.Now()

	r.mu.Lock()
	if el, ok := r.items[boardID]; ok {
		entry := el.Value.(*cacheEntry)
		if now.Before(entry.expiresAt) {
			r.ll.MoveToFront(el)
			wsID := entry.workspaceID
			r.mu.Unlock()
			return wsID, nil
		}
		r.removeElementLocked(el)
	}
	r.mu.Unlock()

	board, err := r.repo.GetBoard(ctx, boardID, r.includeDeleted)
	if err != nil {
		log.Printf("workspace resolver: failed board lookup boardID=%s err=%v", boardID, err)
		return uuid.Nil, fmt.Errorf("workspace resolver: board lookup failed: %w", err)
	}
	if board == nil || board.WorkspaceID == uuid.Nil {
		err := fmt.Errorf("workspace resolver: board has empty workspaceID boardID=%s", boardID)
		log.Printf("%v", err)
		return uuid.Nil, err
	}

	r.mu.Lock()
	r.setLocked(boardID, board.WorkspaceID, now.Add(r.ttl))
	r.mu.Unlock()
	return board.WorkspaceID, nil
}

func (r *CachedWorkspaceResolver) setLocked(boardID, workspaceID uuid.UUID, expiresAt time.Time) {
	if el, ok := r.items[boardID]; ok {
		entry := el.Value.(*cacheEntry)
		entry.workspaceID = workspaceID
		entry.expiresAt = expiresAt
		r.ll.MoveToFront(el)
		return
	}

	entry := &cacheEntry{
		boardID:     boardID,
		workspaceID: workspaceID,
		expiresAt:   expiresAt,
	}
	el := r.ll.PushFront(entry)
	r.items[boardID] = el
	if r.ll.Len() > r.maxEntries {
		r.removeElementLocked(r.ll.Back())
	}
}

func (r *CachedWorkspaceResolver) removeElementLocked(el *list.Element) {
	if el == nil {
		return
	}
	entry, ok := el.Value.(*cacheEntry)
	if ok {
		delete(r.items, entry.boardID)
	}
	r.ll.Remove(el)
}
