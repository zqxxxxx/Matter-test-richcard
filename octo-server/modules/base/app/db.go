package app

import (
	"github.com/Mininglamp-OSS/octo-lib/config"
	"github.com/Mininglamp-OSS/octo-lib/pkg/util"
	"github.com/gocraft/dbr/v2"
)

type DB struct {
	session *dbr.Session
	ctx     *config.Context
}

func NewDB(ctx *config.Context) *DB {
	return &DB{
		session: ctx.DB(),
		ctx:     ctx,
	}
}

func (d *DB) queryWithAppID(appID string) (*model, error) {
	var m *model
	_, err := d.session.Select("*").From("app").Where("app_id=?", appID).Load(&m)
	return m, err
}

func (d *DB) insert(m *model) error {
	_, err := d.session.InsertInto("app").Columns(util.AttrToUnderscore(m)...).Record(m).Exec()
	return err
}

func (d *DB) update(m *model) error {
	values := map[string]interface{}{
		"app_key":  m.AppKey,
		"app_name": m.AppName,
		"app_logo": m.AppLogo,
		"status":   m.Status,
	}
	_, err := d.session.Update("app").SetMap(values).Where("app_id=?", m.AppID).Exec()
	return err
}

func (d *DB) delete(appID string) error {
	_, err := d.session.DeleteFrom("app").Where("app_id=?", appID).Exec()
	return err
}
