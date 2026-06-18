package message

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Mininglamp-OSS/octo-lib/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConversationExtraUpdate_PostCommitNotifyFailureRespondsOK(t *testing.T) {
	s, ctx := newTestServer()
	im := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "send failed", http.StatusInternalServerError)
	}))
	defer im.Close()
	ctx.GetConfig().WuKongIM.APIURL = im.URL

	conversation := NewConversation(ctx)
	conversation.Route(s.GetRoute())

	body := bytes.NewBufferString(`{"browse_to":7,"keep_message_seq":7,"keep_offset_y":24,"draft":""}`)
	req, err := http.NewRequest(http.MethodPost, "/v1/conversations/group-a/2/extra", body)
	require.NoError(t, err)
	req.Header.Set("token", testutil.Token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.GetRoute().ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code, "committed conversation extra update should not fail when only sync notification fails: %s", w.Body.String())
	var resp struct {
		Version int64 `json:"version"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Greater(t, resp.Version, int64(0))

	var saved conversationExtraModel
	_, err = ctx.DB().Select("*").
		From("conversation_extra").
		Where("uid=? AND channel_id=? AND channel_type=?", testutil.UID, "group-a", 2).
		Load(&saved)
	require.NoError(t, err)
	assert.Equal(t, uint32(7), saved.BrowseTo)
	assert.Equal(t, uint32(7), saved.KeepMessageSeq)
	assert.Equal(t, 24, saved.KeepOffsetY)
}
