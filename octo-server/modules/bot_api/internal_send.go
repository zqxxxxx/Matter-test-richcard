package bot_api

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"

	"github.com/Mininglamp-OSS/octo-lib/common"
	"github.com/Mininglamp-OSS/octo-lib/config"
	"github.com/Mininglamp-OSS/octo-lib/pkg/util"
	"github.com/Mininglamp-OSS/octo-lib/pkg/wkhttp"
	"github.com/Mininglamp-OSS/octo-server/pkg/errcode"
	"github.com/Mininglamp-OSS/octo-server/pkg/httperr"
	"github.com/Mininglamp-OSS/octo-server/pkg/mentionrewrite"
	"go.uber.org/zap"
)

// Internal (service-to-service) Bot API.
//
// Trusted backend services (octo-matter today) need to dispatch IM messages AS
// a bot — e.g. posting a matter's progress back into the group chat it came
// from — without holding that bot's token. The public /v1/bot/sendMessage
// requires a bot token; the internal notify API only reaches personal inboxes.
// This endpoint is the missing middle: X-Internal-Token auth (same shared
// secret as modules/notify), but the full sendMessage permission model still
// applies — the bot must genuinely be a member of the target channel, and the
// reserved-OBO-key payload validation runs unchanged. No OBO here by design:
// internal callers act as the bot itself, never as a human.
//
// POST /v1/internal/bot/sendMessage  {channel_id, channel_type, from_uid, payload}
// GET  /v1/internal/bot/groups?bot_uid=X[&space_id=Y]  → groups the bot is in
//      (feeds matter UI pickers: automation targets, send-back targets).

// InternalBotSendReq mirrors BotSendMessageReq minus OBO, plus the explicit
// bot identity (no token in play to derive it from).
type InternalBotSendReq struct {
	ChannelID   string                 `json:"channel_id"`
	ChannelType uint8                  `json:"channel_type"`
	FromUID     string                 `json:"from_uid"`
	StreamNo    string                 `json:"stream_no"`
	Payload     map[string]interface{} `json:"payload"`
}

// internalAuthMiddleware fails closed: unset NOTIFY_INTERNAL_TOKEN rejects
// everything (mirror of modules/notify's middleware).
func (ba *BotAPI) internalAuthMiddleware() wkhttp.HandlerFunc {
	token := os.Getenv("NOTIFY_INTERNAL_TOKEN")
	return func(c *wkhttp.Context) {
		if token == "" || subtle.ConstantTimeCompare([]byte(c.GetHeader("X-Internal-Token")), []byte(token)) != 1 {
			httperr.ResponseErrorL(c, errcode.ErrBotAPIAuthFailed, nil, nil)
			c.Abort()
			return
		}
		c.Next()
	}
}

func (ba *BotAPI) internalSendMessage(c *wkhttp.Context) {
	var req InternalBotSendReq
	if err := c.BindJSON(&req); err != nil {
		respondBotAPIRequestInvalid(c, "")
		return
	}
	if req.ChannelID == "" {
		respondBotAPIRequestInvalid(c, "channel_id")
		return
	}
	if req.ChannelType == 0 {
		respondBotAPIRequestInvalid(c, "channel_type")
		return
	}
	if req.FromUID == "" {
		respondBotAPIRequestInvalid(c, "from_uid")
		return
	}
	if len(req.Payload) == 0 {
		respondBotAPIRequestInvalid(c, "payload")
		return
	}
	// Same reserved-namespace guard as the public endpoint: even a trusted
	// internal caller must not forge OBO fan-out / sender-identity markers.
	if payloadHasReservedOBOKey(req.Payload) {
		httperr.ResponseErrorL(c, errcode.ErrBotAPIOBOReservedField, nil, nil)
		return
	}

	// Prefer the original bot-send path when from_uid is a robot. Some
	// trusted business services, such as smart-summary, intentionally send
	// cards as the human creator instead; those fall through to the user path
	// below and must still pass channel membership/friend checks.
	robot, err := ba.db.queryRobotByRobotID(req.FromUID)
	if err != nil {
		ba.Error("internal send: query robot failed", zap.Error(err), zap.String("from_uid", req.FromUID))
		httperr.ResponseErrorL(c, errcode.ErrBotAPIQueryFailed, nil, nil)
		return
	}
	if robot != nil {
		ba.internalSendAsBot(c, req)
		return
	}
	ba.internalSendAsUser(c, req)
}

func (ba *BotAPI) internalSendAsBot(c *wkhttp.Context, req InternalBotSendReq) {
	// Full membership/friendship gate, no OBO bypass.
	if err := ba.checkSendPermission(c, BotKindUser, req.FromUID, req.ChannelID, req.ChannelType, false); err != nil {
		respondSendPermissionError(c, err)
		return
	}

	channelID := ba.resolveSpaceChannelID(req.FromUID, req.ChannelID, req.ChannelType)

	payload := req.Payload
	if req.ChannelType == common.ChannelTypePerson.Uint8() {
		payload = ba.enrichBotPayloadWithSpaceID(c, req.FromUID, payload)
	}
	payload = mentionrewrite.RewriteMention(payload)
	wirePayload := mentionrewrite.CloneForExpansion(payload)
	wirePayload = mentionrewrite.ExpandAisToBotUIDs(wirePayload, req.ChannelType, channelID, ba.fetchBotMemberUIDs)

	result, err := ba.dispatchMsgSendReq(&config.MsgSendReq{
		Header:      config.MsgHeader{RedDot: 1},
		StreamNo:    req.StreamNo,
		ChannelID:   channelID,
		ChannelType: req.ChannelType,
		FromUID:     req.FromUID,
		Payload:     []byte(util.ToJson(wirePayload)),
	})
	if err != nil {
		ba.Error("internal send: dispatch failed", zap.Error(err), zap.String("from_uid", req.FromUID), zap.String("channel_id", channelID))
		httperr.ResponseErrorL(c, errcode.ErrBotAPISendFailed, nil, nil)
		return
	}
	c.Response(result)
}

func (ba *BotAPI) internalSendAsUser(c *wkhttp.Context, req InternalBotSendReq) {
	userModel, err := ba.userDB.QueryByUID(req.FromUID)
	if err != nil {
		ba.Error("internal send: query user failed", zap.Error(err), zap.String("from_uid", req.FromUID))
		httperr.ResponseErrorL(c, errcode.ErrBotAPIQueryFailed, nil, nil)
		return
	}
	if userModel == nil || userModel.Status == 0 || userModel.IsDestroy == 2 {
		respondBotAPIRequestInvalid(c, "from_uid")
		return
	}
	if err := ba.checkInternalUserSendPermission(req.FromUID, req.ChannelID, req.ChannelType); err != nil {
		respondSendPermissionError(c, err)
		return
	}

	payload := mentionrewrite.RewriteMention(req.Payload)
	wirePayload := mentionrewrite.CloneForExpansion(payload)
	wirePayload = mentionrewrite.ExpandAisToBotUIDs(wirePayload, req.ChannelType, req.ChannelID, ba.fetchBotMemberUIDs)

	result, err := ba.dispatchMsgSendReq(&config.MsgSendReq{
		Header:      config.MsgHeader{RedDot: 1},
		StreamNo:    req.StreamNo,
		ChannelID:   req.ChannelID,
		ChannelType: req.ChannelType,
		FromUID:     req.FromUID,
		Payload:     []byte(util.ToJson(wirePayload)),
	})
	if err != nil {
		ba.Error("internal send: dispatch user message failed", zap.Error(err), zap.String("from_uid", req.FromUID), zap.String("channel_id", req.ChannelID))
		httperr.ResponseErrorL(c, errcode.ErrBotAPISendFailed, nil, nil)
		return
	}
	c.Response(result)
}

func (ba *BotAPI) checkInternalUserSendPermission(fromUID, channelID string, channelType uint8) error {
	switch channelType {
	case common.ChannelTypeGroup.Uint8():
		ok, err := ba.userIsGroupMember(fromUID, channelID)
		if err != nil {
			ba.Error("internal send: query group member failed", zap.Error(err), zap.String("from_uid", fromUID), zap.String("channel_id", channelID))
			return errBotSendPermCheckFailed
		}
		if !ok {
			return errBotSendPermNotGroupMember
		}
		return nil
	case common.ChannelTypeCommunityTopic.Uint8():
		parts := strings.SplitN(channelID, threadChannelIDSeparator, 2)
		if len(parts) != 2 || parts[0] == "" {
			return errBotSendPermBadThreadChan
		}
		ok, err := ba.userIsGroupMember(fromUID, parts[0])
		if err != nil {
			ba.Error("internal send: query topic parent member failed", zap.Error(err), zap.String("from_uid", fromUID), zap.String("channel_id", channelID))
			return errBotSendPermCheckFailed
		}
		if !ok {
			return errBotSendPermNotGroupMember
		}
		return nil
	case common.ChannelTypePerson.Uint8():
		if fromUID == channelID {
			return nil
		}
		if ba.userService == nil {
			return errBotSendPermCheckFailed
		}
		ok, err := ba.userService.IsFriend(fromUID, channelID)
		if err != nil {
			ba.Error("internal send: query friendship failed", zap.Error(err), zap.String("from_uid", fromUID), zap.String("channel_id", channelID))
			return errBotSendPermCheckFailed
		}
		if !ok {
			return errBotSendPermNotFriend
		}
		return nil
	default:
		return errBotSendPermCheckFailed
	}
}

// internalBotGroups lists the groups a bot is a member of — the data source
// for matter-side channel pickers (automation "send result to", homecoming
// targets). Same query as the public GET /v1/bot/groups, identity from query
// param instead of bot-token auth.
func (ba *BotAPI) internalBotGroups(c *wkhttp.Context) {
	botUID := c.Query("bot_uid")
	if botUID == "" {
		respondBotAPIRequestInvalid(c, "bot_uid")
		return
	}
	type GroupInfo struct {
		GroupNo string `json:"group_no"`
		Name    string `json:"name"`
		SpaceID string `json:"space_id,omitempty"`
	}
	spaceID := c.Query("space_id")
	var groups []GroupInfo
	var err error
	if spaceID != "" {
		_, err = ba.ctx.DB().SelectBySql(
			"SELECT gm.group_no, g.name, g.space_id FROM group_member gm INNER JOIN `group` g ON gm.group_no = g.group_no WHERE gm.uid = ? AND gm.is_deleted = 0 AND g.space_id = ?",
			botUID, spaceID,
		).Load(&groups)
	} else {
		_, err = ba.ctx.DB().SelectBySql(
			"SELECT gm.group_no, g.name, g.space_id FROM group_member gm INNER JOIN `group` g ON gm.group_no = g.group_no WHERE gm.uid = ? AND gm.is_deleted = 0",
			botUID,
		).Load(&groups)
	}
	if err != nil {
		ba.Error("internal send: query bot groups failed", zap.Error(err), zap.String("bot_uid", botUID))
		httperr.ResponseErrorL(c, errcode.ErrBotAPIQueryFailed, nil, nil)
		return
	}
	c.JSON(http.StatusOK, groups)
}
