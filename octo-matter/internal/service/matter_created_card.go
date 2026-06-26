package service

import (
	"fmt"
	"strings"

	"github.com/Mininglamp-OSS/octo-matter/internal/model"
)

func BuildMatterCreatedCardPayload(m *model.Matter, actorName string, assigneeIDs []string) map[string]interface{} {
	title := "Matter 已发起"
	status := string(model.MatterStatusOpen)
	matterID := ""
	spaceID := ""
	if m != nil {
		matterID = m.ID
		spaceID = m.SpaceID
		if strings.TrimSpace(m.Title) != "" {
			title = m.Title
		}
		if m.Status != "" {
			status = string(m.Status)
		}
	}

	matterNo := ""
	if m != nil && m.SeqNo > 0 {
		matterNo = fmt.Sprintf("M-%d", m.SeqNo)
	}
	sourceName := ""
	if m != nil && m.SourceName != nil {
		sourceName = strings.TrimSpace(*m.SourceName)
	}
	body := "Matter 已从群聊发起，后续状态会同步回到这里。"
	if m != nil && m.Description != nil && strings.TrimSpace(*m.Description) != "" {
		body = strings.TrimSpace(*m.Description)
	}
	if len(body) > 220 {
		body = body[:219] + "…"
	}

	channelID := ""
	var channelType uint8
	if m != nil && m.SourceChannelID != nil {
		channelID = *m.SourceChannelID
	}
	if m != nil && m.SourceChannelType != nil {
		channelType = *m.SourceChannelType
	}

	leader := ""
	if m != nil {
		leader = m.LeaderOrEmpty()
	}
	if leader == "" && len(assigneeIDs) > 0 {
		leader = assigneeIDs[0]
	}

	metrics := []map[string]string{}
	if leader != "" {
		metrics = append(metrics, map[string]string{"label": "现在该谁处理", "value": leader})
	}
	if sourceName != "" {
		metrics = append(metrics, map[string]string{"label": "来源", "value": sourceName})
	}
	metrics = append(metrics, map[string]string{"label": "进度", "value": createdCardProgressForStatus(status)})

	return map[string]interface{}{
		"type":                17,
		"card_id":             fmt.Sprintf("matter-%s-created", matterID),
		"card_type":           "matter_status",
		"title":               title,
		"subtitle":            strings.TrimSpace(strings.Join(createdCardNonEmpty([]string{matterNo, sourceName}), " · ")),
		"body":                body,
		"status":              status,
		"source":              "Matter",
		"actor":               actorName,
		"entity_id":           matterID,
		"entity_type":         "matter",
		"source_channel_id":   channelID,
		"source_channel_type": channelType,
		"metrics":             metrics,
		"actions": []map[string]interface{}{
			{"label": "进入 Matter", "type": "open_matter_workspace", "kind": "primary"},
			{"label": "查看详情", "type": "open_matter", "kind": "secondary"},
		},
		"extra": map[string]interface{}{
			"matterNo":   matterNo,
			"statusText": createdCardMatterStatusText(status),
			"sourceName": sourceName,
			"sourceText": body,
			"agentName":  leader,
			"agentRole":  "负责",
			"progress":   createdCardProgressForStatus(status),
			"spaceId":    spaceID,
		},
	}
}

func createdCardProgressForStatus(status string) string {
	switch status {
	case string(model.MatterStatusDone), "closed", "completed":
		return "4/4"
	case string(model.MatterStatusReview):
		return "3/4"
	case string(model.MatterStatusInProgress), string(model.MatterStatusBlocked), "processing":
		return "2/4"
	case string(model.MatterStatusOpen), string(model.MatterStatusBacklog), "pending":
		return "1/4"
	default:
		return "0/4"
	}
}

func createdCardMatterStatusText(status string) string {
	switch status {
	case string(model.MatterStatusDone), "closed", "completed":
		return "已完成"
	case string(model.MatterStatusReview):
		return "待验收"
	case string(model.MatterStatusBlocked):
		return "受阻"
	case string(model.MatterStatusInProgress), "processing":
		return "处理中"
	case string(model.MatterStatusOpen), string(model.MatterStatusBacklog), "pending":
		return "待处理"
	default:
		return "已发起"
	}
}

func createdCardNonEmpty(values []string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			out = append(out, strings.TrimSpace(value))
		}
	}
	return out
}
