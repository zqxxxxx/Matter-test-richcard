package app

import (
	"github.com/Mininglamp-OSS/octo-lib/config"
	"github.com/Mininglamp-OSS/octo-lib/pkg/log"
	"github.com/Mininglamp-OSS/octo-lib/pkg/wkhttp"
)

type App struct {
	ctx *config.Context
	log.Log
	service IService
}

func New(ctx *config.Context) *App {
	return &App{
		ctx:     ctx,
		Log:     log.NewTLog("App"),
		service: NewService(ctx),
	}
}

func (a *App) Route(r *wkhttp.WKHttp) {
}
