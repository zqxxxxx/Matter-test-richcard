package app

import (
	"errors"
	"strings"

	"github.com/Mininglamp-OSS/octo-lib/config"
	"github.com/Mininglamp-OSS/octo-lib/pkg/log"
	"github.com/Mininglamp-OSS/octo-lib/pkg/util"
)

type IService interface {
	GetApp(appID string) (*Resp, error)
	CreateApp(req Req) (*Resp, error)
	DeleteApp(appID string) error
}

type Service struct {
	db *DB
	log.Log
}

func NewService(ctx *config.Context) IService {
	return &Service{
		db:  NewDB(ctx),
		Log: log.NewTLog("AppService"),
	}
}

func (s *Service) GetApp(appID string) (*Resp, error) {
	if strings.TrimSpace(appID) == "" {
		return nil, nil
	}
	m, err := s.db.queryWithAppID(appID)
	if err != nil {
		return nil, err
	}
	return newResp(m), nil
}

func (s *Service) CreateApp(req Req) (*Resp, error) {
	appID := strings.TrimSpace(req.AppID)
	if appID == "" {
		return nil, errors.New("app_id不能为空")
	}

	existing, err := s.db.queryWithAppID(appID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		changed := false
		if strings.TrimSpace(req.AppName) != "" && existing.AppName != req.AppName {
			existing.AppName = req.AppName
			changed = true
		}
		if strings.TrimSpace(req.AppLogo) != "" && existing.AppLogo != req.AppLogo {
			existing.AppLogo = req.AppLogo
			changed = true
		}
		if existing.Status != StatusEnable {
			existing.Status = StatusEnable
			changed = true
		}
		if changed {
			if err := s.db.update(existing); err != nil {
				return nil, err
			}
		}
		return newResp(existing), nil
	}

	m := &model{
		AppID:   appID,
		AppKey:  util.GenerUUID(),
		AppName: strings.TrimSpace(req.AppName),
		AppLogo: strings.TrimSpace(req.AppLogo),
		Status:  StatusEnable,
	}
	if err := s.db.insert(m); err != nil {
		return nil, err
	}
	return s.GetApp(appID)
}

func (s *Service) DeleteApp(appID string) error {
	if strings.TrimSpace(appID) == "" {
		return nil
	}
	return s.db.delete(appID)
}
