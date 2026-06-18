package user

import "github.com/Mininglamp-OSS/octo-lib/pkg/wkhttp"

func (u *User) stickerCategories(c *wkhttp.Context) {
	c.Response([]stickerCategoryResp{})
}

func (u *User) stickers(c *wkhttp.Context) {
	c.Response(stickerListResp{List: []stickerResp{}})
}

type stickerCategoryResp struct {
	Category string `json:"category"`
	Cover    string `json:"cover"`
}

type stickerListResp struct {
	List []stickerResp `json:"list"`
}

type stickerResp struct {
	Category    string `json:"category"`
	Path        string `json:"path"`
	Placeholder string `json:"placeholder"`
	Format      string `json:"format"`
}
