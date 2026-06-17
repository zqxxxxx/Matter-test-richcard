package notify

import (
	"testing"
	"time"
)

// === dedupTargets ===

func TestDedupTargets_Empty(t *testing.T) {
	result := dedupTargets(nil)
	if len(result) != 0 {
		t.Errorf("expected empty, got %v", result)
	}
}

func TestDedupTargets_NoDuplicates(t *testing.T) {
	result := dedupTargets([]string{"a", "b", "c"})
	if len(result) != 3 || result[0] != "a" || result[1] != "b" || result[2] != "c" {
		t.Errorf("expected [a b c], got %v", result)
	}
}

func TestDedupTargets_WithDuplicates(t *testing.T) {
	result := dedupTargets([]string{"a", "b", "a", "c", "b"})
	if len(result) != 3 || result[0] != "a" || result[1] != "b" || result[2] != "c" {
		t.Errorf("expected [a b c], got %v", result)
	}
}

func TestDedupTargets_EmptyStrings(t *testing.T) {
	result := dedupTargets([]string{"", "a", "", "b"})
	if len(result) != 2 || result[0] != "a" || result[1] != "b" {
		t.Errorf("expected [a b], got %v", result)
	}
}

// === NotifyBotUID ===

func TestNotifyBotUID(t *testing.T) {
	uid := NotifyBotUID()
	expected := "notification"
	if uid != expected {
		t.Errorf("expected %q, got %q", expected, uid)
	}

	// Verify static UID stays within VARCHAR(40)
	if len(uid) > 40 {
		t.Errorf("UID %q length %d exceeds VARCHAR(40)", uid, len(uid))
	}
}

// === memberCache ===

func TestMemberCache_InvalidateRemovesEntry(t *testing.T) {
	mc := newMemberCache()
	mc.entries["sp1"] = &memberCacheEntry{
		uids:     map[string]bool{"uid_a": true},
		expireAt: time.Now().Add(cacheTTL),
	}

	mc.invalidate("sp1")

	mc.mu.RLock()
	_, exists := mc.entries["sp1"]
	mc.mu.RUnlock()

	if exists {
		t.Error("expected sp1 to be invalidated")
	}
}

func TestMemberCache_InvalidateNonExistent(t *testing.T) {
	mc := newMemberCache()
	// Should not panic
	mc.invalidate("nonexistent")
}

// === model validation ===

func TestNotifyReq_Fields(t *testing.T) {
	req := NotifyReq{
		SpaceID:  "sp_abc",
		Service:  "todo-service",
		Event:    "todo.assigned",
		Targets:  []string{"uid_a", "uid_b"},
		ActorUID: "uid_x",
		Payload:  map[string]interface{}{"type": 1, "content": "test"},
	}
	if req.SpaceID != "sp_abc" {
		t.Error("SpaceID mismatch")
	}
	if len(req.Targets) != 2 {
		t.Error("Targets length mismatch")
	}
}

func TestBatchNotifyResp_HasErrors(t *testing.T) {
	resp := BatchNotifyResp{
		Results: []BatchNotifyResult{
			{NotifyResp: NotifyResp{Delivered: []string{"a"}}, Error: ""},
			{NotifyResp: NotifyResp{Delivered: []string{}}, Error: "space not found"},
		},
		HasErrors: true,
	}
	if !resp.HasErrors {
		t.Error("expected HasErrors=true")
	}
	if resp.Results[0].Error != "" {
		t.Error("first result should have no error")
	}
	if resp.Results[1].Error != "space not found" {
		t.Error("second result should have error")
	}
}

// === verify: uid casing canonicalization ===

func TestMemberCache_VerifyCanonicalizesCasing(t *testing.T) {
	mc := newMemberCache()
	mc.entries["s1"] = &memberCacheEntry{
		uids:     map[string]bool{"27A8InGz_bot": true, "admin": true},
		canon:    map[string]string{"27a8ingz_bot": "27A8InGz_bot", "admin": "admin"},
		expireAt: time.Now().Add(time.Minute),
	}

	members, filtered, err := mc.verify(nil, "s1", []string{"27a8ingz_bot", "ADMIN", "ghost"})
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if len(members) != 2 || members[0] != "27A8InGz_bot" || members[1] != "admin" {
		t.Errorf("expected canonical [27A8InGz_bot admin], got %v", members)
	}
	if filtered["ghost"] != "not_space_member" {
		t.Errorf("ghost should be filtered, got %v", filtered)
	}
}

func TestMemberCache_VerifyMergesCasingDuplicates(t *testing.T) {
	mc := newMemberCache()
	mc.entries["s1"] = &memberCacheEntry{
		uids:     map[string]bool{"Bot_A": true},
		canon:    map[string]string{"bot_a": "Bot_A"},
		expireAt: time.Now().Add(time.Minute),
	}

	members, filtered, err := mc.verify(nil, "s1", []string{"bot_a", "BOT_A", "Bot_A"})
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if len(members) != 1 || members[0] != "Bot_A" {
		t.Errorf("expected single canonical [Bot_A], got %v", members)
	}
	if len(filtered) != 0 {
		t.Errorf("nothing should be filtered, got %v", filtered)
	}
}
