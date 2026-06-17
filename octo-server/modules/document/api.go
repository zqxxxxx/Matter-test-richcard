package document

import (
	"github.com/Mininglamp-OSS/octo-lib/config"
	"github.com/Mininglamp-OSS/octo-lib/pkg/log"
	"github.com/Mininglamp-OSS/octo-lib/pkg/wkhttp"
	spacepkg "github.com/Mininglamp-OSS/octo-server/pkg/space"
	appwkhttp "github.com/Mininglamp-OSS/octo-server/pkg/wkhttp"
	"go.uber.org/zap"
)

type Document struct {
	ctx *config.Context
	log.Log
	service *DocumentService
}

func New(ctx *config.Context) *Document {
	return &Document{
		ctx:     ctx,
		Log:     log.NewTLog("Document"),
		service: NewDocumentService(newDocumentDB(ctx)),
	}
}

func (d *Document) Route(r *wkhttp.WKHttp) {
	uidLimit := appwkhttp.SharedUIDRateLimiter(r, d.ctx)
	auth := r.Group("/v1/documents", d.ctx.AuthMiddleware(r), uidLimit, spacepkg.SpaceMiddleware(d.ctx))
	{
		auth.GET("/state", d.state)
		auth.POST("/upload", d.upload)
		auth.POST("/archive", d.archive)
		auth.POST("/:asset_id/preview", d.preview)
		auth.POST("/:asset_id/download", d.download)
		auth.POST("/:asset_id/trash", d.trash)
		auth.POST("/:asset_id/restore", d.restore)
		auth.GET("/source/check", d.checkSource)
	}
}

func (d *Document) state(c *wkhttp.Context) {
	state, err := d.service.State(c.GetLoginUID(), tenantSpaceID(c))
	d.respondState(c, state, err)
}

func (d *Document) upload(c *wkhttp.Context) {
	var req UploadReq
	if err := c.BindJSON(&req); err != nil {
		c.ResponseError(err)
		return
	}
	state, err := d.service.Upload(c.GetLoginUID(), tenantSpaceID(c), req)
	d.respondState(c, state, err)
}

func (d *Document) archive(c *wkhttp.Context) {
	var req ArchiveReq
	if err := c.BindJSON(&req); err != nil {
		c.ResponseError(err)
		return
	}
	state, err := d.service.Archive(c.GetLoginUID(), tenantSpaceID(c), req)
	d.respondState(c, state, err)
}

func (d *Document) preview(c *wkhttp.Context) {
	state, err := d.service.Preview(c.GetLoginUID(), tenantSpaceID(c), c.Param("asset_id"))
	d.respondState(c, state, err)
}

func (d *Document) download(c *wkhttp.Context) {
	state, err := d.service.Download(c.GetLoginUID(), tenantSpaceID(c), c.Param("asset_id"))
	d.respondState(c, state, err)
}

func (d *Document) trash(c *wkhttp.Context) {
	state, err := d.service.Trash(c.GetLoginUID(), tenantSpaceID(c), c.Param("asset_id"))
	d.respondState(c, state, err)
}

func (d *Document) restore(c *wkhttp.Context) {
	state, err := d.service.Restore(c.GetLoginUID(), tenantSpaceID(c), c.Param("asset_id"))
	d.respondState(c, state, err)
}

func (d *Document) checkSource(c *wkhttp.Context) {
	assetID := c.Query("asset_id")
	accessible, err := d.service.CheckSource(c.GetLoginUID(), tenantSpaceID(c), assetID)
	if err != nil {
		d.Error("检查来源会话失败", zap.Error(err))
		c.ResponseError(err)
		return
	}
	c.Response(map[string]bool{"accessible": accessible})
}

func (d *Document) respondState(c *wkhttp.Context, state *DocumentStateResp, err error) {
	if err != nil {
		d.Error("文档中心请求失败", zap.Error(err))
		c.ResponseError(err)
		return
	}
	c.Response(state)
}

func tenantSpaceID(c *wkhttp.Context) string {
	if spaceID := spacepkg.GetSpaceID(c); spaceID != "" {
		return spaceID
	}
	if spaceID := c.Query("space_id"); spaceID != "" {
		return spaceID
	}
	if spaceID := c.GetHeader("X-Space-ID"); spaceID != "" {
		return spaceID
	}
	return "default"
}
