package service

import (
	"testing"

	"github.com/Mininglamp-OSS/octo-matter/internal/model"
)

func TestHomecomingBellAllowsHumanSenderForSourceConversation(t *testing.T) {
	channelType := uint8(2)
	leader := "rc_demo_pm"
	m := &model.Matter{
		ID:                "matter-1",
		CreatorID:         "rc_demo_pm",
		LeaderUID:         &leader,
		SourceChannelID:   transitionStringPtr("group-richcard"),
		SourceChannelType: &channelType,
	}

	bell := homecomingBell(m, TransitionInput{Summary: "done"}, map[string]any{"Title": "QA Matter"})

	if bell == nil {
		t.Fatalf("expected homecoming bell for human sender")
	}
	if bell.target != "rc_demo_pm" {
		t.Fatalf("target = %q", bell.target)
	}
	if bell.event != DoorbellHomecoming {
		t.Fatalf("event = %q", bell.event)
	}
	if bell.params["channel_id"] != "group-richcard" || bell.params["channel_type"] != channelType {
		t.Fatalf("channel params = %#v", bell.params)
	}
}

func transitionStringPtr(v string) *string {
	return &v
}
