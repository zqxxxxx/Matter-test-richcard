package notify

import (
	"strings"
	"sync"
	"time"

	"github.com/gocraft/dbr/v2"
	"golang.org/x/sync/singleflight"
)

const (
	cacheTTL     = 60 * time.Second
	maxCacheSize = 10000 // 防止无限增长
)

// memberCache 实例级 Space 成员缓存。
type memberCache struct {
	mu      sync.RWMutex
	entries map[string]*memberCacheEntry
	sf      singleflight.Group
}

type memberCacheEntry struct {
	uids map[string]bool
	// canon maps LOWER(uid) → stored casing. WuKongIM channels are
	// case-sensitive while several upstream paths normalize uids to
	// lowercase (channel adapters, bots echoing ids); delivering to the
	// caller's casing can target a channel nobody listens on. Targets are
	// therefore canonicalized to the DB casing before send.
	canon    map[string]string
	expireAt time.Time
}

func newMemberCache() *memberCache {
	return &memberCache{
		entries: make(map[string]*memberCacheEntry),
	}
}

// verify 校验 targets 中哪些是 spaceID 的活跃成员。
// 命中的成员以 DB 存储的大小写返回（WuKongIM 频道大小写敏感，错壳投递=虚空频道）。
func (mc *memberCache) verify(db *dbr.Session, spaceID string, targets []string) (members []string, filtered map[string]string, err error) {
	filtered = make(map[string]string)
	if len(targets) == 0 {
		return
	}

	entry, err := mc.getEntry(db, spaceID)
	if err != nil {
		return nil, nil, err
	}

	seen := make(map[string]bool, len(targets))
	for _, uid := range targets {
		canonical := ""
		if entry != nil {
			if entry.uids[uid] {
				canonical = uid
			} else if c, ok := entry.canon[strings.ToLower(uid)]; ok {
				canonical = c
			}
		}
		if canonical == "" {
			filtered[uid] = "not_space_member"
			continue
		}
		if seen[canonical] { // 同一成员的不同壳合并成一次投递
			continue
		}
		seen[canonical] = true
		members = append(members, canonical)
	}
	return
}

// getEntry 从缓存或 DB 获取成员条目。
// B3 修复：cache miss 时先 refresh（单次全量查询），再从缓存过滤。单次 DB 往返。
func (mc *memberCache) getEntry(db *dbr.Session, spaceID string) (*memberCacheEntry, error) {
	mc.mu.RLock()
	entry, ok := mc.entries[spaceID]
	mc.mu.RUnlock()

	if !ok || time.Now().After(entry.expireAt) {
		if _, err, _ := mc.sf.Do(spaceID, func() (interface{}, error) {
			return nil, mc.refresh(db, spaceID)
		}); err != nil {
			return nil, err
		}
		mc.mu.RLock()
		entry, ok = mc.entries[spaceID]
		mc.mu.RUnlock()
		if !ok {
			return nil, nil
		}
	}
	return entry, nil
}

// refresh 同步加载全量成员到缓存。超过 maxCacheSize 时清理过期条目。
func (mc *memberCache) refresh(db *dbr.Session, spaceID string) error {
	var allUIDs []string
	_, err := db.Select("uid").From("space_member").
		Where("space_id = ? AND status = 1", spaceID).
		Load(&allUIDs)
	if err != nil {
		return err
	}

	uidSet := make(map[string]bool, len(allUIDs))
	canon := make(map[string]string, len(allUIDs))
	for _, uid := range allUIDs {
		uidSet[uid] = true
		canon[strings.ToLower(uid)] = uid
	}

	mc.mu.Lock()
	if len(mc.entries) >= maxCacheSize {
		now := time.Now()
		for k, v := range mc.entries {
			if now.After(v.expireAt) {
				delete(mc.entries, k)
			}
		}
	}
	mc.entries[spaceID] = &memberCacheEntry{
		uids:     uidSet,
		canon:    canon,
		expireAt: time.Now().Add(cacheTTL),
	}
	mc.mu.Unlock()
	return nil
}

// invalidate 删除指定 Space 的缓存。
func (mc *memberCache) invalidate(spaceID string) {
	mc.mu.Lock()
	delete(mc.entries, spaceID)
	mc.mu.Unlock()
}
