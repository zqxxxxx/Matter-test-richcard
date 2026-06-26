package notification

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSendUserChannelPayloadPostsMessageSendShape(t *testing.T) {
	var gotHeader http.Header
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/message/send" {
			t.Fatalf("path = %s, want /v1/message/send", r.URL.Path)
		}
		gotHeader = r.Header.Clone()
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":200}`))
	}))
	defer server.Close()

	notifier := NewOctoNotifier(server.URL, "internal-token", "zh-CN")
	err := notifier.SendUserChannelPayload(
		"user-token",
		"space-1",
		"group-richcard",
		2,
		map[string]interface{}{
			"type":      17,
			"card_type": "matter_status",
			"title":     "客户合同 v3 法务确认",
		},
	)
	if err != nil {
		t.Fatalf("SendUserChannelPayload returned error: %v", err)
	}

	if gotHeader.Get("token") != "user-token" {
		t.Fatalf("token header = %q", gotHeader.Get("token"))
	}
	if gotHeader.Get("X-Space-Id") != "space-1" {
		t.Fatalf("X-Space-Id header = %q", gotHeader.Get("X-Space-Id"))
	}
	if gotBody["receive_channel_id"] != "group-richcard" {
		t.Fatalf("receive_channel_id = %#v", gotBody["receive_channel_id"])
	}
	if gotBody["receive_channel_type"] != float64(2) {
		t.Fatalf("receive_channel_type = %#v", gotBody["receive_channel_type"])
	}
	if gotBody["is_verify"] != float64(1) {
		t.Fatalf("is_verify = %#v", gotBody["is_verify"])
	}
	payload, ok := gotBody["payload"].(map[string]any)
	if !ok {
		t.Fatalf("payload = %#v", gotBody["payload"])
	}
	if payload["type"] != float64(17) || payload["card_type"] != "matter_status" {
		t.Fatalf("payload = %#v", payload)
	}
}
