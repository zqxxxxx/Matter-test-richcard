package service

import (
	"testing"

	"github.com/Mininglamp-OSS/octo-matter/internal/model"
)

func TestBuildMatterCreatedCardPayload(t *testing.T) {
	groupType := uint8(2)
	sourceID := "group-richcard"
	sourceName := "Richcard 验收群"
	leader := "brooks_bot"
	m := &model.Matter{
		ID:                "matter-1",
		SpaceID:           "space-1",
		SeqNo:             1001,
		Title:             "客户合同 v3 法务确认",
		Description:       createdCardStringPtr("请法务确认付款和违约条款。"),
		Status:            model.MatterStatusOpen,
		CreatorID:         "rc_demo_pm",
		LeaderUID:         &leader,
		SourceChannelID:   &sourceID,
		SourceChannelType: &groupType,
		SourceName:        &sourceName,
	}

	payload := BuildMatterCreatedCardPayload(m, "赵倩笑 PM", []string{"法务", "销售"})

	if payload["type"] != 17 {
		t.Fatalf("type = %v, want 17", payload["type"])
	}
	if payload["card_id"] != "matter-matter-1" {
		t.Fatalf("card_id = %v", payload["card_id"])
	}
	if payload["card_type"] != "matter_status" {
		t.Fatalf("card_type = %v, want matter_status", payload["card_type"])
	}
	if payload["status"] != "open" {
		t.Fatalf("status = %v, want open", payload["status"])
	}
	if payload["entity_id"] != "matter-1" {
		t.Fatalf("entity_id = %v, want matter-1", payload["entity_id"])
	}
	if payload["source_channel_id"] != "group-richcard" || payload["source_channel_type"] != uint8(2) {
		t.Fatalf("source channel = %#v/%#v", payload["source_channel_id"], payload["source_channel_type"])
	}
	actions, ok := payload["actions"].([]map[string]interface{})
	if !ok || len(actions) != 2 || actions[0]["type"] != "open_matter_workspace" {
		t.Fatalf("actions = %#v", payload["actions"])
	}
	extra, ok := payload["extra"].(map[string]interface{})
	if !ok {
		t.Fatalf("extra missing: %#v", payload["extra"])
	}
	if extra["matterNo"] != "M-1001" || extra["sourceName"] != "Richcard 验收群" {
		t.Fatalf("extra = %#v", extra)
	}
}

func TestBuildMatterCreatedCardPayloadUsesStableMatterIdentity(t *testing.T) {
	channelType := uint8(2)
	sourceName := "搜索测试群"
	m := &model.Matter{
		ID:                "matter-123",
		SeqNo:             9015,
		SpaceID:           "rc_demo_space",
		Title:             "QA Matter",
		Status:            model.MatterStatusOpen,
		SourceChannelID:   createdCardStringPtr("group-123"),
		SourceChannelType: &channelType,
		SourceName:        &sourceName,
	}

	payload := BuildMatterCreatedCardPayload(m, "赵倩笑 PM", []string{"rc_demo_pm"})

	if payload["card_type"] != "matter_status" {
		t.Fatalf("card_type = %v", payload["card_type"])
	}
	if payload["entity_id"] != "matter-123" {
		t.Fatalf("entity_id = %v", payload["entity_id"])
	}
	if payload["card_id"] != "matter-matter-123" {
		t.Fatalf("card_id = %v", payload["card_id"])
	}
	if payload["source_channel_id"] != "group-123" || payload["source_channel_type"] != channelType {
		t.Fatalf("source channel = %v/%v", payload["source_channel_id"], payload["source_channel_type"])
	}
}

func createdCardStringPtr(v string) *string {
	return &v
}
