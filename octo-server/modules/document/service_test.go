package document

import (
	"testing"
)

func TestServiceUploadCreatesSpaceAsset(t *testing.T) {
	repo := newMemoryRepository()
	repo.spaces = []*DocumentSpaceModel{{
		SpaceID:       "doc-space-1",
		Name:          "产品部公共空间",
		OwnerUID:      "u1",
		TenantSpaceID: "tenant-1",
		Status:        1,
	}}
	service := NewDocumentService(repo)

	state, err := service.Upload("u1", "tenant-1", UploadReq{
		Name:            "需求清单.xlsx",
		Extension:       ".xlsx",
		Size:            2048,
		StoragePath:     "/documents/需求清单.xlsx",
		DocumentSpaceID: "doc-space-1",
	})

	if err != nil {
		t.Fatalf("Upload returned error: %v", err)
	}
	if len(state.Files) != 1 {
		t.Fatalf("expected one file, got %d", len(state.Files))
	}
	file := state.Files[0]
	if file.Name != "需求清单.xlsx" {
		t.Fatalf("unexpected file name: %s", file.Name)
	}
	if file.Status != StatusArchived {
		t.Fatalf("expected archived status, got %s", file.Status)
	}
	if file.SourceName != SourceNameDirectUpload {
		t.Fatalf("expected direct upload source, got %s", file.SourceName)
	}
	if state.Spaces[0].FileCount != 1 {
		t.Fatalf("expected space file count 1, got %d", state.Spaces[0].FileCount)
	}
}

func TestServiceArchiveMessageFileMovesConversationAssetToSpace(t *testing.T) {
	repo := newMemoryRepository()
	repo.spaces = []*DocumentSpaceModel{{
		SpaceID:       "doc-space-1",
		Name:          "华东交付部空间",
		OwnerUID:      "u1",
		TenantSpaceID: "tenant-1",
		Status:        1,
	}}
	repo.assets = []*DocumentAssetModel{{
		AssetID:           "asset-1",
		Name:              "现场计划.pdf",
		Kind:              KindPDF,
		Extension:         ".pdf",
		Size:              4096,
		SourceType:        SourceTypeGroup,
		SourceName:        "华东项目交付群",
		SourceChannelID:   "group-1",
		SourceChannelType: 2,
		UploaderUID:       "u2",
		UploaderName:      "张沐",
		OwnerUID:          "u2",
		TenantSpaceID:     "tenant-1",
		DocumentSpaceID:   "",
		Visibility:        VisibilityConversation,
		Status:            StatusConversation,
		Previewable:       1,
	}}
	service := NewDocumentService(repo)

	state, err := service.Archive("u1", "tenant-1", ArchiveReq{
		AssetID:         "asset-1",
		DocumentSpaceID: "doc-space-1",
	})

	if err != nil {
		t.Fatalf("Archive returned error: %v", err)
	}
	file := state.Files[0]
	if file.Status != StatusArchived {
		t.Fatalf("expected archived, got %s", file.Status)
	}
	if file.SpaceName != "华东交付部空间" {
		t.Fatalf("expected target space name, got %s", file.SpaceName)
	}
	if state.Spaces[0].FileCount != 1 {
		t.Fatalf("expected target space count 1, got %d", state.Spaces[0].FileCount)
	}
}

func TestServiceTrashAndRestoreKeepBusinessClosedLoop(t *testing.T) {
	repo := newMemoryRepository()
	repo.spaces = []*DocumentSpaceModel{{
		SpaceID:       "doc-space-1",
		Name:          "公司制度空间",
		OwnerUID:      "u1",
		TenantSpaceID: "tenant-1",
		Status:        1,
	}}
	repo.assets = []*DocumentAssetModel{{
		AssetID:         "asset-1",
		Name:            "制度更新说明.docx",
		Kind:            KindDoc,
		Extension:       ".docx",
		Size:            1024,
		SourceType:      SourceTypeGroup,
		SourceName:      "行政制度发布群",
		UploaderUID:     "u1",
		UploaderName:    "周岚",
		OwnerUID:        "u1",
		TenantSpaceID:   "tenant-1",
		DocumentSpaceID: "doc-space-1",
		Visibility:      VisibilitySpace,
		Status:          StatusArchived,
		Previewable:     1,
	}}
	service := NewDocumentService(repo)

	deleted, err := service.Trash("u1", "tenant-1", "asset-1")
	if err != nil {
		t.Fatalf("Trash returned error: %v", err)
	}
	if deleted.Files[0].Status != StatusDeleted {
		t.Fatalf("expected deleted, got %s", deleted.Files[0].Status)
	}
	if deleted.Spaces[0].FileCount != 0 {
		t.Fatalf("expected space count 0 after trash, got %d", deleted.Spaces[0].FileCount)
	}

	restored, err := service.Restore("u1", "tenant-1", "asset-1")
	if err != nil {
		t.Fatalf("Restore returned error: %v", err)
	}
	if restored.Files[0].Status != StatusArchived {
		t.Fatalf("expected archived after restore, got %s", restored.Files[0].Status)
	}
	if restored.Spaces[0].FileCount != 1 {
		t.Fatalf("expected space count 1 after restore, got %d", restored.Spaces[0].FileCount)
	}
}

func TestServiceBindConversationShowsOnDocumentSpace(t *testing.T) {
	repo := newMemoryRepository()
	repo.spaces = []*DocumentSpaceModel{{
		SpaceID:       "doc-space-1",
		Name:          "产品部公共空间",
		OwnerUID:      "u1",
		TenantSpaceID: "tenant-1",
		Status:        1,
	}}
	service := NewDocumentService(repo)

	state, err := service.BindConversation("u1", "tenant-1", BindConversationReq{
		DocumentSpaceID:   "doc-space-1",
		SourceChannelID:   "grp_product_docs",
		SourceChannelType: 2,
		SourceName:        "产品方案讨论群",
	})

	if err != nil {
		t.Fatalf("BindConversation returned error: %v", err)
	}
	if len(state.Spaces) != 1 {
		t.Fatalf("expected one space, got %d", len(state.Spaces))
	}
	if got := state.Spaces[0].BoundConversations; len(got) != 1 || got[0] != "产品方案讨论群" {
		t.Fatalf("expected bound conversation, got %#v", got)
	}
}

func TestServiceCheckSourceRequiresAccessibleConversation(t *testing.T) {
	repo := newMemoryRepository()
	repo.assets = []*DocumentAssetModel{{
		AssetID:           "asset-1",
		Name:              "产品方案.pdf",
		Kind:              KindPDF,
		Extension:         ".pdf",
		SourceType:        SourceTypeGroup,
		SourceChannelID:   "grp_product_docs",
		SourceChannelType: 2,
		SourceName:        "产品方案讨论群",
		TenantSpaceID:     "tenant-1",
		Status:            StatusConversation,
		Visibility:        VisibilityConversation,
		Previewable:       1,
	}}
	repo.accessibleSources = map[string]map[string]bool{
		"grp_product_docs:2": {
			"u1": true,
			"u2": false,
		},
	}
	service := NewDocumentService(repo)

	allowed, err := service.CheckSource("u1", "tenant-1", "asset-1")
	if err != nil {
		t.Fatalf("CheckSource returned error for allowed user: %v", err)
	}
	if !allowed {
		t.Fatalf("expected allowed user to access source")
	}

	denied, err := service.CheckSource("u2", "tenant-1", "asset-1")
	if err != nil {
		t.Fatalf("CheckSource returned error for denied user: %v", err)
	}
	if denied {
		t.Fatalf("expected denied user to be blocked from source")
	}
}
