package media

import (
	"sync"
	"time"
)

type cacheEntry struct {
	Value     UnsplashSearchResponse
	ExpiresAt time.Time
}

type SearchCache struct {
	mu       sync.RWMutex
	ttl      time.Duration
	maxItems int
	items    map[string]cacheEntry
}

func NewSearchCache(ttl time.Duration, maxItems int) *SearchCache {
	return &SearchCache{
		ttl:      ttl,
		maxItems: maxItems,
		items:    map[string]cacheEntry{},
	}
}

func (c *SearchCache) Get(key string) (UnsplashSearchResponse, bool) {
	now := time.Now()

	c.mu.RLock()
	entry, ok := c.items[key]
	c.mu.RUnlock()

	if !ok {
		return UnsplashSearchResponse{}, false
	}
	if now.After(entry.ExpiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return UnsplashSearchResponse{}, false
	}
	return entry.Value, true
}

func (c *SearchCache) Set(key string, value UnsplashSearchResponse) {
	now := time.Now()

	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.items) >= c.maxItems {
		for k, v := range c.items {
			if now.After(v.ExpiresAt) {
				delete(c.items, k)
				break
			}
		}
		if len(c.items) >= c.maxItems {
			for k := range c.items {
				delete(c.items, k)
				break
			}
		}
	}

	c.items[key] = cacheEntry{
		Value:     value,
		ExpiresAt: now.Add(c.ttl),
	}
}
