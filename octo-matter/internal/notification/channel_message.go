package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// ChannelSender posts a message into an IM conversation AS a bot — the
// homecoming leg (审核中/受阻 → 自动发回来源会话). Backed by octo-server's
// internal endpoint; the bot must genuinely be a member of the channel,
// octo-server re-checks.
type ChannelSender interface {
	SendChannelMessage(fromUID, channelID string, channelType uint8, content string, mentionUIDs []string) error
}

// ChannelPayloadSender posts a fully-formed IM payload. It is used by rich
// cards whose payload type is not plain text. SendChannelMessage remains the
// text fallback for deployments that only implement the older interface.
type ChannelPayloadSender interface {
	SendChannelPayload(fromUID, channelID string, channelType uint8, payload map[string]interface{}) error
}

// UserChannelPayloadSender posts a fully-formed payload through Octo's normal
// user message ingress. It preserves membership checks and sender identity by
// forwarding the caller's user token to /v1/message/send.
type UserChannelPayloadSender interface {
	SendUserChannelPayload(userToken, spaceID, channelID string, channelType uint8, payload map[string]interface{}) error
}

// BotGroup is one conversation a bot is a member of — picker data for the
// automation "send result to" target (no human ever types a channel id).
type BotGroup struct {
	GroupNo string `json:"group_no"`
	Name    string `json:"name"`
	SpaceID string `json:"space_id,omitempty"`
}

// BotGroupLister is implemented by OctoNotifier; handlers type-assert so the
// Noop notifier (notifications off) degrades to "picker unavailable".
type BotGroupLister interface {
	ListBotGroups(botUID string) ([]BotGroup, error)
}

// ListBotGroups proxies octo-server GET /v1/internal/bot/groups.
func (n *OctoNotifier) ListBotGroups(botUID string) ([]BotGroup, error) {
	req, err := http.NewRequest(http.MethodGet, n.baseURL+"/v1/internal/bot/groups?bot_uid="+url.QueryEscape(botUID), nil)
	if err != nil {
		return nil, err
	}
	if n.token != "" {
		req.Header.Set("X-Internal-Token", n.token)
	}
	resp, err := n.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		io.Copy(io.Discard, resp.Body)
		return nil, fmt.Errorf("bot groups returned %d", resp.StatusCode)
	}
	var groups []BotGroup
	if err := json.NewDecoder(resp.Body).Decode(&groups); err != nil {
		return nil, err
	}
	return groups, nil
}

// SendChannelMessage posts via octo-server POST /v1/internal/bot/sendMessage
// (X-Internal-Token). Synchronous like SendDoorbell: the outbox dispatcher
// owns retries, so failures must surface.
func (n *OctoNotifier) SendChannelMessage(fromUID, channelID string, channelType uint8, content string, mentionUIDs []string) error {
	if fromUID == "" || channelID == "" {
		return nil
	}
	payload := map[string]interface{}{
		"type":    1,
		"content": content,
		"message": content,
	}
	if len(mentionUIDs) > 0 {
		payload["mention"] = map[string]interface{}{"uids": mentionUIDs}
	}
	return n.SendChannelPayload(fromUID, channelID, channelType, payload)
}

// SendChannelPayload posts via octo-server POST /v1/internal/bot/sendMessage
// (X-Internal-Token). The payload is forwarded as-is after octo-server's
// normal internal validation/enrichment.
func (n *OctoNotifier) SendChannelPayload(fromUID, channelID string, channelType uint8, payload map[string]interface{}) error {
	if fromUID == "" || channelID == "" {
		return nil
	}
	body, err := json.Marshal(map[string]interface{}{
		"channel_id":   channelID,
		"channel_type": channelType,
		"from_uid":     fromUID,
		"payload":      payload,
	})
	if err != nil {
		return fmt.Errorf("marshal channel message: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, n.baseURL+"/v1/internal/bot/sendMessage", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build channel message request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if n.token != "" {
		req.Header.Set("X-Internal-Token", n.token)
	}
	resp, err := n.client.Do(req)
	if err != nil {
		return fmt.Errorf("channel message POST: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("channel message returned %d", resp.StatusCode)
	}
	return nil
}

// SendUserChannelPayload posts via octo-server POST /v1/message/send as the
// authenticated user represented by userToken. This is used for user-initiated
// source-conversation cards such as "Matter created", where sending as a bot
// would misrepresent who started the work.
func (n *OctoNotifier) SendUserChannelPayload(userToken, spaceID, channelID string, channelType uint8, payload map[string]interface{}) error {
	if userToken == "" || channelID == "" {
		return nil
	}
	body, err := json.Marshal(map[string]interface{}{
		"token":                userToken,
		"receive_channel_id":   channelID,
		"receive_channel_type": channelType,
		"payload":              payload,
		"is_verify":            1,
	})
	if err != nil {
		return fmt.Errorf("marshal user channel message: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, n.baseURL+"/v1/message/send", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build user channel message request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("token", userToken)
	if spaceID != "" {
		req.Header.Set("X-Space-Id", spaceID)
	}
	resp, err := n.client.Do(req)
	if err != nil {
		return fmt.Errorf("user channel message POST: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("user channel message returned %d", resp.StatusCode)
	}
	return nil
}
