package service

import (
	"testing"

	"github.com/Mininglamp-OSS/octo-matter/internal/model"
)

func TestBuildMatterHomecomingCardPayload(t *testing.T) {
	params := map[string]any{
		"Title":        "客户合同 v3 法务确认",
		"Seq":          float64(1001),
		"Edge":         "in_progress->review",
		"Summary":      "风险条款已经整理完成，等待 PM 验收。",
		"channel_id":   "group-richcard",
		"channel_type": float64(2),
		"source_name":  "Richcard 验收群",
		"leader_uid":   "matter_bot",
		"events_seq":   float64(7),
		"epoch":        float64(1),
	}

	payload := buildMatterHomecomingCardPayload(&model.OutboxRow{
		SpaceID:   "space-1",
		MatterID:  "matter-1",
		TargetUID: "matter_bot",
	}, params, "fallback text")

	if payload["type"] != 17 {
		t.Fatalf("type = %v, want 17", payload["type"])
	}
	if payload["card_type"] != "matter_status" {
		t.Fatalf("card_type = %v, want matter_status", payload["card_type"])
	}
	if payload["status"] != "review" {
		t.Fatalf("status = %v, want review", payload["status"])
	}
	if payload["entity_id"] != "matter-1" {
		t.Fatalf("entity_id = %v, want matter-1", payload["entity_id"])
	}
	if payload["source_channel_id"] != "group-richcard" {
		t.Fatalf("source_channel_id = %v", payload["source_channel_id"])
	}
	actions, ok := payload["actions"].([]map[string]interface{})
	if !ok || len(actions) != 2 || actions[0]["type"] != "open_matter_workspace" {
		t.Fatalf("actions = %#v", payload["actions"])
	}
	extra, ok := payload["extra"].(map[string]interface{})
	if !ok {
		t.Fatalf("extra missing: %#v", payload["extra"])
	}
	if extra["matterNo"] != "M-1001" || extra["statusText"] != "东西回来了，等你确认" {
		t.Fatalf("extra = %#v", extra)
	}
}
