package app

import (
	"time"

	"github.com/Mininglamp-OSS/octo-lib/pkg/db"
)

const (
	StatusDisable = 0
	StatusEnable  = 1
)

type Req struct {
	AppID   string `json:"app_id"`
	AppName string `json:"app_name"`
	AppLogo string `json:"app_logo"`
}

type Resp struct {
	AppID     string `json:"app_id"`
	AppKey    string `json:"app_key"`
	AppName   string `json:"app_name"`
	AppLogo   string `json:"app_logo"`
	Status    int    `json:"status"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type model struct {
	AppID     string
	AppKey    string
	AppName   string
	AppLogo   string
	Status    int
	CreatedAt time.Time
	UpdatedAt time.Time
	db.BaseModel
}

func newResp(m *model) *Resp {
	if m == nil {
		return nil
	}
	return &Resp{
		AppID:     m.AppID,
		AppKey:    m.AppKey,
		AppName:   m.AppName,
		AppLogo:   m.AppLogo,
		Status:    m.Status,
		CreatedAt: m.CreatedAt.Format(time.RFC3339),
		UpdatedAt: m.UpdatedAt.Format(time.RFC3339),
	}
}
