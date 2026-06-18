package document

import (
	"time"

	"github.com/Mininglamp-OSS/octo-lib/config"
	"github.com/Mininglamp-OSS/octo-lib/pkg/util"
	"github.com/gocraft/dbr/v2"
)

type documentDB struct {
	ctx     *config.Context
	session *dbr.Session
}

func newDocumentDB(ctx *config.Context) *documentDB {
	return &documentDB{
		ctx:     ctx,
		session: ctx.DB(),
	}
}

func (d *documentDB) ListSpaces(uid, tenantSpaceID string) ([]*DocumentSpaceModel, error) {
	var spaces []*DocumentSpaceModel
	_, err := d.session.Select("*").From("document_space").
		Where("tenant_space_id=? and status=1", tenantSpaceID).
		OrderDesc("created_at").
		Load(&spaces)
	return spaces, err
}

func (d *documentDB) EnsureDefaultSpace(uid, tenantSpaceID string) (*DocumentSpaceModel, error) {
	spaces, err := d.ListSpaces(uid, tenantSpaceID)
	if err != nil {
		return nil, err
	}
	if len(spaces) > 0 {
		return spaces[0], nil
	}
	now := nowDBTime()
	space := &DocumentSpaceModel{
		SpaceID:       "DOCSPACE-" + util.GenerUUID(),
		Name:          "团队文档空间",
		Description:   "默认文档空间",
		OwnerUID:      uid,
		TenantSpaceID: tenantSpaceID,
		Status:        1,
	}
	space.CreatedAt = now
	space.UpdatedAt = now
	if _, err := d.session.InsertInto("document_space").Columns(util.AttrToUnderscore(space)...).Record(space).Exec(); err != nil {
		return nil, err
	}
	return space, nil
}

func (d *documentDB) GetSpace(spaceID, uid, tenantSpaceID string) (*DocumentSpaceModel, error) {
	var space *DocumentSpaceModel
	_, err := d.session.Select("*").From("document_space").
		Where("space_id=? and tenant_space_id=? and status=1", spaceID, tenantSpaceID).
		Load(&space)
	return space, err
}

func (d *documentDB) ListSpaceBindings(uid, tenantSpaceID string) ([]*DocumentSpaceBindingModel, error) {
	var bindings []*DocumentSpaceBindingModel
	_, err := d.session.Select("*").From("document_space_binding").
		Where("tenant_space_id=? and status=1", tenantSpaceID).
		OrderDesc("created_at").
		Load(&bindings)
	return bindings, err
}

func (d *documentDB) SaveSpaceBinding(binding *DocumentSpaceBindingModel) error {
	_, err := d.session.InsertBySql(
		`INSERT INTO document_space_binding
			(binding_id, document_space_id, source_channel_id, source_channel_type, source_name, created_by, tenant_space_id, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
			source_name=VALUES(source_name),
			created_by=VALUES(created_by),
			status=VALUES(status),
			updated_at=VALUES(updated_at)`,
		binding.BindingID,
		binding.DocumentSpaceID,
		binding.SourceChannelID,
		binding.SourceChannelType,
		binding.SourceName,
		binding.CreatedBy,
		binding.TenantSpaceID,
		binding.Status,
		binding.CreatedAt,
		binding.UpdatedAt,
	).Exec()
	return err
}

func (d *documentDB) ListAssets(uid, tenantSpaceID string) ([]*DocumentAssetModel, error) {
	var assets []*DocumentAssetModel
	_, err := d.session.Select("*").From("document_asset").
		Where("tenant_space_id=?", tenantSpaceID).
		OrderDesc("last_access_at").
		OrderDesc("created_at").
		Load(&assets)
	return assets, err
}

func (d *documentDB) GetAsset(assetID, uid, tenantSpaceID string) (*DocumentAssetModel, error) {
	var asset *DocumentAssetModel
	_, err := d.session.Select("*").From("document_asset").
		Where("asset_id=? and tenant_space_id=?", assetID, tenantSpaceID).
		Load(&asset)
	return asset, err
}

func (d *documentDB) SaveAsset(asset *DocumentAssetModel) error {
	var lastAccessAt interface{}
	if asset.LastAccessAt != nil {
		lastAccessAt = asset.LastAccessAt.String()
	}
	_, err := d.session.InsertBySql(
		`INSERT INTO document_asset
			(asset_id, name, kind, extension, size, storage_path,
			 source_type, source_channel_id, source_channel_type, source_message_id, source_name,
			 uploader_uid, uploader_name, owner_uid, owner_name, tenant_space_id,
			 document_space_id, original_space_id, visibility, status, downloads, previewable,
			 last_access_at, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?,
			 ?, ?, ?, ?, ?,
			 ?, ?, ?, ?, ?,
			 ?, ?, ?, ?, ?, ?,
			 ?, ?, ?)`,
		asset.AssetID,
		asset.Name,
		asset.Kind,
		asset.Extension,
		asset.Size,
		asset.StoragePath,
		asset.SourceType,
		asset.SourceChannelID,
		asset.SourceChannelType,
		asset.SourceMessageID,
		asset.SourceName,
		asset.UploaderUID,
		asset.UploaderName,
		asset.OwnerUID,
		asset.OwnerName,
		asset.TenantSpaceID,
		asset.DocumentSpaceID,
		asset.OriginalSpaceID,
		asset.Visibility,
		asset.Status,
		asset.Downloads,
		asset.Previewable,
		lastAccessAt,
		asset.CreatedAt.String(),
		asset.UpdatedAt.String(),
	).Exec()
	return err
}

func (d *documentDB) UpdateAsset(asset *DocumentAssetModel) error {
	var lastAccessAt interface{}
	if asset.LastAccessAt != nil {
		lastAccessAt = asset.LastAccessAt.String()
	}
	_, err := d.session.Update("document_asset").
		Set("document_space_id", asset.DocumentSpaceID).
		Set("original_space_id", asset.OriginalSpaceID).
		Set("visibility", asset.Visibility).
		Set("status", asset.Status).
		Set("downloads", asset.Downloads).
		Set("last_access_at", lastAccessAt).
		Set("updated_at", time.Now()).
		Where("asset_id=? and tenant_space_id=?", asset.AssetID, asset.TenantSpaceID).
		Exec()
	return err
}

func (d *documentDB) AddEvent(event *DocumentEventModel) error {
	_, err := d.session.InsertInto("document_asset_event").Columns(util.AttrToUnderscore(event)...).Record(event).Exec()
	return err
}

func (d *documentDB) ListEvents(uid, tenantSpaceID string, limit int) ([]*DocumentEventModel, error) {
	var events []*DocumentEventModel
	query := d.session.Select("*").From("document_asset_event").
		Where("tenant_space_id=?", tenantSpaceID).
		OrderDesc("created_at").
		OrderDesc("id")
	if limit > 0 {
		query = query.Limit(uint64(limit))
	}
	_, err := query.Load(&events)
	return events, err
}

func (d *documentDB) CanAccessSource(uid, tenantSpaceID, sourceChannelID string, sourceChannelType uint8) (bool, error) {
	if sourceChannelID == "" {
		return false, nil
	}
	if sourceChannelType == 2 {
		var count int
		_, err := d.session.SelectBySql(
			`SELECT count(*)
			 FROM group_member gm
			 INNER JOIN `+"`group`"+` g ON g.group_no=gm.group_no AND g.status=1 AND g.space_id=?
			 WHERE gm.group_no=? AND gm.uid=? AND gm.status=1 AND gm.is_deleted=0`,
			tenantSpaceID,
			sourceChannelID,
			uid,
		).Load(&count)
		return count > 0, err
	}
	return sourceChannelID == uid, nil
}
