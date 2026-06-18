package document

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/Mininglamp-OSS/octo-lib/pkg/util"
)

type documentRepository interface {
	ListSpaces(uid, tenantSpaceID string) ([]*DocumentSpaceModel, error)
	EnsureDefaultSpace(uid, tenantSpaceID string) (*DocumentSpaceModel, error)
	GetSpace(spaceID, uid, tenantSpaceID string) (*DocumentSpaceModel, error)
	ListSpaceBindings(uid, tenantSpaceID string) ([]*DocumentSpaceBindingModel, error)
	SaveSpaceBinding(binding *DocumentSpaceBindingModel) error
	ListAssets(uid, tenantSpaceID string) ([]*DocumentAssetModel, error)
	GetAsset(assetID, uid, tenantSpaceID string) (*DocumentAssetModel, error)
	SaveAsset(asset *DocumentAssetModel) error
	UpdateAsset(asset *DocumentAssetModel) error
	AddEvent(event *DocumentEventModel) error
	ListEvents(uid, tenantSpaceID string, limit int) ([]*DocumentEventModel, error)
	CanAccessSource(uid, tenantSpaceID, sourceChannelID string, sourceChannelType uint8) (bool, error)
}

type DocumentService struct {
	repo documentRepository
}

func NewDocumentService(repo documentRepository) *DocumentService {
	return &DocumentService{repo: repo}
}

func (s *DocumentService) State(uid, tenantSpaceID string) (*DocumentStateResp, error) {
	if strings.TrimSpace(uid) == "" {
		return nil, errors.New("uid is required")
	}
	if _, err := s.repo.EnsureDefaultSpace(uid, tenantSpaceID); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) Upload(uid, tenantSpaceID string, req UploadReq) (*DocumentStateResp, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("文件名不能为空")
	}
	space, err := s.resolveSpace(uid, tenantSpaceID, req.DocumentSpaceID)
	if err != nil {
		return nil, err
	}
	extension := normalizeExtension(req.Name, req.Extension)
	now := nowDBTime()
	asset := &DocumentAssetModel{
		AssetID:         "DOC-" + util.GenerUUID(),
		Name:            req.Name,
		Kind:            documentKind(extension),
		Extension:       extension,
		Size:            req.Size,
		StoragePath:     req.StoragePath,
		SourceType:      SourceTypeApp,
		SourceName:      SourceNameDirectUpload,
		UploaderUID:     uid,
		UploaderName:    uid,
		OwnerUID:        uid,
		OwnerName:       uid,
		TenantSpaceID:   tenantSpaceID,
		DocumentSpaceID: space.SpaceID,
		OriginalSpaceID: space.SpaceID,
		Visibility:      VisibilitySpace,
		Status:          StatusArchived,
		Downloads:       0,
		Previewable:     previewableForExtension(extension),
		LastAccessAt:    &now,
	}
	asset.CreatedAt = now
	asset.UpdatedAt = now
	if err := s.repo.SaveAsset(asset); err != nil {
		return nil, err
	}
	if err := s.addEvent(uid, tenantSpaceID, asset.AssetID, "上传", fmt.Sprintf("上传到%s", space.Name)); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) Archive(uid, tenantSpaceID string, req ArchiveReq) (*DocumentStateResp, error) {
	space, err := s.resolveSpace(uid, tenantSpaceID, req.DocumentSpaceID)
	if err != nil {
		return nil, err
	}
	asset, err := s.repo.GetAsset(req.AssetID, uid, tenantSpaceID)
	if err != nil {
		return nil, err
	}
	now := nowDBTime()
	if asset == nil {
		extension := normalizeExtension(req.Name, req.Extension)
		asset = &DocumentAssetModel{
			AssetID:           req.AssetID,
			Name:              req.Name,
			Kind:              documentKind(extension),
			Extension:         extension,
			Size:              req.Size,
			StoragePath:       req.StoragePath,
			SourceType:        fallbackString(req.SourceType, SourceTypeGroup),
			SourceChannelID:   req.SourceChannelID,
			SourceChannelType: req.SourceChannelType,
			SourceMessageID:   req.SourceMessageID,
			SourceName:        req.SourceName,
			UploaderUID:       fallbackString(req.UploaderUID, uid),
			UploaderName:      fallbackString(req.UploaderName, req.UploaderUID),
			OwnerUID:          uid,
			OwnerName:         uid,
			TenantSpaceID:     tenantSpaceID,
			DocumentSpaceID:   space.SpaceID,
			OriginalSpaceID:   space.SpaceID,
			Visibility:        VisibilitySpace,
			Status:            StatusArchived,
			Previewable:       previewableForExtension(extension),
			LastAccessAt:      &now,
		}
		if asset.AssetID == "" {
			asset.AssetID = "DOC-" + util.GenerUUID()
		}
		asset.CreatedAt = now
		asset.UpdatedAt = now
		if err := s.repo.SaveAsset(asset); err != nil {
			return nil, err
		}
	} else {
		asset.DocumentSpaceID = space.SpaceID
		if asset.OriginalSpaceID == "" {
			asset.OriginalSpaceID = space.SpaceID
		}
		asset.Visibility = VisibilitySpace
		asset.Status = StatusArchived
		asset.UpdatedAt = now
		asset.LastAccessAt = &now
		if err := s.repo.UpdateAsset(asset); err != nil {
			return nil, err
		}
	}
	if err := s.addEvent(uid, tenantSpaceID, asset.AssetID, "归档", fmt.Sprintf("归档到%s", space.Name)); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) BindConversation(uid, tenantSpaceID string, req BindConversationReq) (*DocumentStateResp, error) {
	space, err := s.resolveSpace(uid, tenantSpaceID, req.DocumentSpaceID)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(req.SourceChannelID) == "" {
		return nil, errors.New("来源会话不能为空")
	}
	if req.SourceChannelType == 0 {
		return nil, errors.New("来源会话类型不能为空")
	}
	sourceName := fallbackString(req.SourceName, req.SourceChannelID)
	now := nowDBTime()
	binding := &DocumentSpaceBindingModel{
		BindingID:         "BIND-" + util.GenerUUID(),
		DocumentSpaceID:   space.SpaceID,
		SourceChannelID:   req.SourceChannelID,
		SourceChannelType: req.SourceChannelType,
		SourceName:        sourceName,
		CreatedBy:         uid,
		TenantSpaceID:     tenantSpaceID,
		Status:            1,
	}
	binding.CreatedAt = now
	binding.UpdatedAt = now
	if err := s.repo.SaveSpaceBinding(binding); err != nil {
		return nil, err
	}
	if err := s.addEvent(uid, tenantSpaceID, space.SpaceID, "绑定群聊", fmt.Sprintf("%s 设为%s默认归档空间", sourceName, space.Name)); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) Preview(uid, tenantSpaceID, assetID string) (*DocumentStateResp, error) {
	asset, err := s.requireAsset(uid, tenantSpaceID, assetID)
	if err != nil {
		return nil, err
	}
	now := nowDBTime()
	asset.LastAccessAt = &now
	asset.UpdatedAt = now
	if err := s.repo.UpdateAsset(asset); err != nil {
		return nil, err
	}
	if err := s.addEvent(uid, tenantSpaceID, asset.AssetID, "预览", "在线预览"); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) Download(uid, tenantSpaceID, assetID string) (*DocumentStateResp, error) {
	asset, err := s.requireAsset(uid, tenantSpaceID, assetID)
	if err != nil {
		return nil, err
	}
	now := nowDBTime()
	asset.Downloads++
	asset.LastAccessAt = &now
	asset.UpdatedAt = now
	if err := s.repo.UpdateAsset(asset); err != nil {
		return nil, err
	}
	if err := s.addEvent(uid, tenantSpaceID, asset.AssetID, "下载", "下载文件"); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) Trash(uid, tenantSpaceID, assetID string) (*DocumentStateResp, error) {
	asset, err := s.requireAsset(uid, tenantSpaceID, assetID)
	if err != nil {
		return nil, err
	}
	now := nowDBTime()
	asset.Status = StatusDeleted
	asset.UpdatedAt = now
	if err := s.repo.UpdateAsset(asset); err != nil {
		return nil, err
	}
	if err := s.addEvent(uid, tenantSpaceID, asset.AssetID, "删除", "移动到回收站"); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) Restore(uid, tenantSpaceID, assetID string) (*DocumentStateResp, error) {
	asset, err := s.requireAsset(uid, tenantSpaceID, assetID)
	if err != nil {
		return nil, err
	}
	now := nowDBTime()
	if asset.DocumentSpaceID != "" || asset.OriginalSpaceID != "" {
		if asset.DocumentSpaceID == "" {
			asset.DocumentSpaceID = asset.OriginalSpaceID
		}
		asset.Status = StatusArchived
		asset.Visibility = VisibilitySpace
	} else {
		asset.Status = StatusConversation
		asset.Visibility = VisibilityConversation
	}
	asset.UpdatedAt = now
	if err := s.repo.UpdateAsset(asset); err != nil {
		return nil, err
	}
	if err := s.addEvent(uid, tenantSpaceID, asset.AssetID, "恢复", "从回收站恢复"); err != nil {
		return nil, err
	}
	return s.buildState(uid, tenantSpaceID)
}

func (s *DocumentService) CheckSource(uid, tenantSpaceID, assetID string) (bool, error) {
	asset, err := s.requireAsset(uid, tenantSpaceID, assetID)
	if err != nil {
		return false, err
	}
	if strings.TrimSpace(asset.SourceChannelID) == "" {
		return false, nil
	}
	return s.repo.CanAccessSource(uid, tenantSpaceID, asset.SourceChannelID, asset.SourceChannelType)
}

func (s *DocumentService) requireAsset(uid, tenantSpaceID, assetID string) (*DocumentAssetModel, error) {
	asset, err := s.repo.GetAsset(assetID, uid, tenantSpaceID)
	if err != nil {
		return nil, err
	}
	if asset == nil {
		return nil, errors.New("文件不存在")
	}
	return asset, nil
}

func (s *DocumentService) resolveSpace(uid, tenantSpaceID, documentSpaceID string) (*DocumentSpaceModel, error) {
	if strings.TrimSpace(documentSpaceID) != "" {
		space, err := s.repo.GetSpace(documentSpaceID, uid, tenantSpaceID)
		if err != nil {
			return nil, err
		}
		if space == nil {
			return nil, errors.New("目标空间不存在")
		}
		return space, nil
	}
	return s.repo.EnsureDefaultSpace(uid, tenantSpaceID)
}

func (s *DocumentService) addEvent(uid, tenantSpaceID, assetID, action, detail string) error {
	now := nowDBTime()
	event := &DocumentEventModel{
		EventID:       "EVT-" + util.GenerUUID(),
		AssetID:       assetID,
		ActorUID:      uid,
		Action:        action,
		Detail:        detail,
		TenantSpaceID: tenantSpaceID,
	}
	event.CreatedAt = now
	event.UpdatedAt = now
	return s.repo.AddEvent(event)
}

func (s *DocumentService) buildState(uid, tenantSpaceID string) (*DocumentStateResp, error) {
	spaces, err := s.repo.ListSpaces(uid, tenantSpaceID)
	if err != nil {
		return nil, err
	}
	assets, err := s.repo.ListAssets(uid, tenantSpaceID)
	if err != nil {
		return nil, err
	}
	bindings, err := s.repo.ListSpaceBindings(uid, tenantSpaceID)
	if err != nil {
		return nil, err
	}
	events, err := s.repo.ListEvents(uid, tenantSpaceID, 50)
	if err != nil {
		return nil, err
	}

	spaceByID := make(map[string]*DocumentSpaceModel, len(spaces))
	fileCountBySpace := make(map[string]int)
	bindingsBySpace := make(map[string][]string)
	for _, space := range spaces {
		spaceByID[space.SpaceID] = space
	}
	for _, binding := range bindings {
		if binding.Status == 1 && binding.DocumentSpaceID != "" {
			bindingsBySpace[binding.DocumentSpaceID] = append(bindingsBySpace[binding.DocumentSpaceID], binding.SourceName)
		}
	}
	for _, asset := range assets {
		if asset.Status == StatusArchived && asset.DocumentSpaceID != "" {
			fileCountBySpace[asset.DocumentSpaceID]++
		}
	}

	resp := &DocumentStateResp{
		Files:  make([]*DocumentAssetResp, 0, len(assets)),
		Spaces: make([]*DocumentSpaceResp, 0, len(spaces)),
		Audits: make([]*DocumentAuditResp, 0, len(events)),
	}
	for _, asset := range assets {
		resp.Files = append(resp.Files, assetToResp(asset, spaceByID[asset.DocumentSpaceID]))
	}
	for _, space := range spaces {
		resp.Spaces = append(resp.Spaces, &DocumentSpaceResp{
			ID:                 space.SpaceID,
			Name:               space.Name,
			Owner:              space.OwnerUID,
			FileCount:          fileCountBySpace[space.SpaceID],
			MemberCount:        0,
			Members:            []string{},
			BoundConversations: bindingsBySpace[space.SpaceID],
			PinnedFileIDs:      []string{},
			Description:        space.Description,
		})
	}
	for _, event := range events {
		resp.Audits = append(resp.Audits, &DocumentAuditResp{
			ID:     event.EventID,
			Time:   formatDBTime(event.CreatedAt),
			Actor:  event.ActorUID,
			Action: event.Action,
			Target: event.AssetID,
			Detail: event.Detail,
		})
	}
	return resp, nil
}

func assetToResp(asset *DocumentAssetModel, space *DocumentSpaceModel) *DocumentAssetResp {
	spaceName := "会话文件"
	if space != nil {
		spaceName = space.Name
	}
	createdAt := formatDBTime(asset.CreatedAt)
	lastAccessAt := createdAt
	if asset.LastAccessAt != nil {
		lastAccessAt = asset.LastAccessAt.String()
	}
	owner := fallbackString(asset.OwnerName, asset.OwnerUID)
	uploader := fallbackString(asset.UploaderName, asset.UploaderUID)
	flow := []string{}
	if asset.SourceName != "" {
		flow = append(flow, "来自"+asset.SourceName)
	}
	if asset.Status == StatusArchived && spaceName != "" {
		flow = append(flow, "归档到"+spaceName)
	}
	if asset.SourceType == SourceTypeApp {
		flow = []string{"直接上传", "保存到" + spaceName}
	}
	if asset.Status == StatusDeleted {
		flow = append(flow, "移动到回收站")
	}
	return &DocumentAssetResp{
		ID:                asset.AssetID,
		Name:              asset.Name,
		Kind:              asset.Kind,
		Extension:         strings.TrimPrefix(asset.Extension, "."),
		Size:              asset.Size,
		StoragePath:       asset.StoragePath,
		Owner:             owner,
		Uploader:          uploader,
		SourceName:        asset.SourceName,
		SourceChannelID:   asset.SourceChannelID,
		SourceChannelType: asset.SourceChannelType,
		SourceType:        asset.SourceType,
		SpaceName:         spaceName,
		Visibility:        asset.Visibility,
		Status:            asset.Status,
		CreatedAt:         createdAt,
		LastAccessAt:      lastAccessAt,
		Downloads:         asset.Downloads,
		Previewable:       asset.Previewable == 1,
		Flow:              flow,
	}
}

func fallbackString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

type memoryRepository struct {
	spaces            []*DocumentSpaceModel
	bindings          []*DocumentSpaceBindingModel
	assets            []*DocumentAssetModel
	events            []*DocumentEventModel
	accessibleSources map[string]map[string]bool
}

func newMemoryRepository() *memoryRepository {
	return &memoryRepository{}
}

func (r *memoryRepository) ListSpaces(uid, tenantSpaceID string) ([]*DocumentSpaceModel, error) {
	items := make([]*DocumentSpaceModel, 0, len(r.spaces))
	for _, space := range r.spaces {
		if space.Status == 1 && space.TenantSpaceID == tenantSpaceID {
			items = append(items, cloneSpace(space))
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.String() > items[j].CreatedAt.String() })
	return items, nil
}

func (r *memoryRepository) EnsureDefaultSpace(uid, tenantSpaceID string) (*DocumentSpaceModel, error) {
	for _, space := range r.spaces {
		if space.TenantSpaceID == tenantSpaceID && space.Status == 1 {
			return cloneSpace(space), nil
		}
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
	r.spaces = append(r.spaces, space)
	return cloneSpace(space), nil
}

func (r *memoryRepository) GetSpace(spaceID, uid, tenantSpaceID string) (*DocumentSpaceModel, error) {
	for _, space := range r.spaces {
		if space.SpaceID == spaceID && space.TenantSpaceID == tenantSpaceID && space.Status == 1 {
			return cloneSpace(space), nil
		}
	}
	return nil, nil
}

func (r *memoryRepository) ListSpaceBindings(uid, tenantSpaceID string) ([]*DocumentSpaceBindingModel, error) {
	items := make([]*DocumentSpaceBindingModel, 0, len(r.bindings))
	for _, binding := range r.bindings {
		if binding.TenantSpaceID == tenantSpaceID && binding.Status == 1 {
			items = append(items, cloneBinding(binding))
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.String() > items[j].CreatedAt.String() })
	return items, nil
}

func (r *memoryRepository) SaveSpaceBinding(binding *DocumentSpaceBindingModel) error {
	for i, item := range r.bindings {
		if item.TenantSpaceID == binding.TenantSpaceID &&
			item.DocumentSpaceID == binding.DocumentSpaceID &&
			item.SourceChannelID == binding.SourceChannelID &&
			item.SourceChannelType == binding.SourceChannelType {
			r.bindings[i] = cloneBinding(binding)
			return nil
		}
	}
	r.bindings = append(r.bindings, cloneBinding(binding))
	return nil
}

func (r *memoryRepository) ListAssets(uid, tenantSpaceID string) ([]*DocumentAssetModel, error) {
	items := make([]*DocumentAssetModel, 0, len(r.assets))
	for _, asset := range r.assets {
		if asset.TenantSpaceID == tenantSpaceID {
			items = append(items, cloneAsset(asset))
		}
	}
	sort.Slice(items, func(i, j int) bool {
		left := items[i].CreatedAt.String()
		right := items[j].CreatedAt.String()
		if items[i].LastAccessAt != nil {
			left = items[i].LastAccessAt.String()
		}
		if items[j].LastAccessAt != nil {
			right = items[j].LastAccessAt.String()
		}
		return left > right
	})
	return items, nil
}

func (r *memoryRepository) GetAsset(assetID, uid, tenantSpaceID string) (*DocumentAssetModel, error) {
	for _, asset := range r.assets {
		if asset.AssetID == assetID && asset.TenantSpaceID == tenantSpaceID {
			return cloneAsset(asset), nil
		}
	}
	return nil, nil
}

func (r *memoryRepository) SaveAsset(asset *DocumentAssetModel) error {
	r.assets = append(r.assets, cloneAsset(asset))
	return nil
}

func (r *memoryRepository) UpdateAsset(asset *DocumentAssetModel) error {
	for i, item := range r.assets {
		if item.AssetID == asset.AssetID && item.TenantSpaceID == asset.TenantSpaceID {
			r.assets[i] = cloneAsset(asset)
			return nil
		}
	}
	return errors.New("asset not found")
}

func (r *memoryRepository) AddEvent(event *DocumentEventModel) error {
	r.events = append([]*DocumentEventModel{cloneEvent(event)}, r.events...)
	return nil
}

func (r *memoryRepository) ListEvents(uid, tenantSpaceID string, limit int) ([]*DocumentEventModel, error) {
	items := make([]*DocumentEventModel, 0, len(r.events))
	for _, event := range r.events {
		if event.TenantSpaceID == tenantSpaceID {
			items = append(items, cloneEvent(event))
		}
		if limit > 0 && len(items) >= limit {
			break
		}
	}
	return items, nil
}

func (r *memoryRepository) CanAccessSource(uid, tenantSpaceID, sourceChannelID string, sourceChannelType uint8) (bool, error) {
	if r.accessibleSources == nil {
		return sourceChannelID != "", nil
	}
	members := r.accessibleSources[fmt.Sprintf("%s:%d", sourceChannelID, sourceChannelType)]
	if members == nil {
		return false, nil
	}
	return members[uid], nil
}

func cloneSpace(space *DocumentSpaceModel) *DocumentSpaceModel {
	if space == nil {
		return nil
	}
	cp := *space
	return &cp
}

func cloneAsset(asset *DocumentAssetModel) *DocumentAssetModel {
	if asset == nil {
		return nil
	}
	cp := *asset
	if asset.LastAccessAt != nil {
		v := *asset.LastAccessAt
		cp.LastAccessAt = &v
	}
	return &cp
}

func cloneBinding(binding *DocumentSpaceBindingModel) *DocumentSpaceBindingModel {
	if binding == nil {
		return nil
	}
	cp := *binding
	return &cp
}

func cloneEvent(event *DocumentEventModel) *DocumentEventModel {
	if event == nil {
		return nil
	}
	cp := *event
	return &cp
}
