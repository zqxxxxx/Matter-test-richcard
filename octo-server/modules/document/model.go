package document

import (
	"path/filepath"
	"strings"
	"time"

	dbbase "github.com/Mininglamp-OSS/octo-server/pkg/db"
)

const (
	StatusConversation = "conversation"
	StatusArchived     = "archived"
	StatusDeleted      = "deleted"

	VisibilityConversation = "conversation"
	VisibilitySpace        = "space"

	KindPDF   = "pdf"
	KindDoc   = "doc"
	KindSheet = "sheet"
	KindImage = "image"
	KindZip   = "zip"

	SourceTypePerson = "单聊"
	SourceTypeGroup  = "群聊"
	SourceTypeApp    = "应用"

	SourceNameDirectUpload = "直接上传"
)

type DocumentSpaceModel struct {
	SpaceID       string
	Name          string
	Description   string
	OwnerUID      string
	TenantSpaceID string
	Status        int
	dbbase.BaseModel
}

type DocumentSpaceBindingModel struct {
	BindingID         string
	DocumentSpaceID   string
	SourceChannelID   string
	SourceChannelType uint8
	SourceName        string
	CreatedBy         string
	TenantSpaceID     string
	Status            int
	dbbase.BaseModel
}

type DocumentAssetModel struct {
	AssetID           string
	Name              string
	Kind              string
	Extension         string
	Size              int64
	StoragePath       string
	SourceType        string
	SourceChannelID   string
	SourceChannelType uint8
	SourceMessageID   string
	SourceName        string
	UploaderUID       string
	UploaderName      string
	OwnerUID          string
	OwnerName         string
	TenantSpaceID     string
	DocumentSpaceID   string
	OriginalSpaceID   string
	Visibility        string
	Status            string
	Downloads         int
	Previewable       int
	LastAccessAt      *dbbase.Time
	dbbase.BaseModel
}

type DocumentEventModel struct {
	EventID       string
	AssetID       string
	ActorUID      string
	Action        string
	Detail        string
	TenantSpaceID string
	dbbase.BaseModel
}

type DocumentAssetResp struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Kind              string   `json:"kind"`
	Extension         string   `json:"extension"`
	Size              int64    `json:"size"`
	StoragePath       string   `json:"storagePath"`
	Owner             string   `json:"owner"`
	Uploader          string   `json:"uploader"`
	SourceName        string   `json:"sourceName"`
	SourceChannelID   string   `json:"sourceChannelId"`
	SourceChannelType uint8    `json:"sourceChannelType"`
	SourceType        string   `json:"sourceType"`
	SpaceName         string   `json:"spaceName"`
	Visibility        string   `json:"visibility"`
	Status            string   `json:"status"`
	CreatedAt         string   `json:"createdAt"`
	LastAccessAt      string   `json:"lastAccessAt"`
	Downloads         int      `json:"downloads"`
	Previewable       bool     `json:"previewable"`
	Flow              []string `json:"flow"`
}

type DocumentSpaceResp struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	Owner              string   `json:"owner"`
	FileCount          int      `json:"fileCount"`
	MemberCount        int      `json:"memberCount"`
	Members            []string `json:"members"`
	BoundConversations []string `json:"boundConversations"`
	PinnedFileIDs      []string `json:"pinnedFileIds"`
	Description        string   `json:"description"`
}

type DocumentAuditResp struct {
	ID     string `json:"id"`
	Time   string `json:"time"`
	Actor  string `json:"actor"`
	Action string `json:"action"`
	Target string `json:"target"`
	Detail string `json:"detail"`
}

type DocumentStateResp struct {
	Files  []*DocumentAssetResp `json:"files"`
	Spaces []*DocumentSpaceResp `json:"spaces"`
	Audits []*DocumentAuditResp `json:"audits"`
}

type UploadReq struct {
	Name            string `json:"name"`
	Extension       string `json:"extension"`
	Size            int64  `json:"size"`
	StoragePath     string `json:"storage_path"`
	DocumentSpaceID string `json:"document_space_id"`
}

type ArchiveReq struct {
	AssetID           string `json:"asset_id"`
	DocumentSpaceID   string `json:"document_space_id"`
	Name              string `json:"name"`
	Extension         string `json:"extension"`
	Size              int64  `json:"size"`
	StoragePath       string `json:"storage_path"`
	SourceType        string `json:"source_type"`
	SourceChannelID   string `json:"source_channel_id"`
	SourceChannelType uint8  `json:"source_channel_type"`
	SourceMessageID   string `json:"source_message_id"`
	SourceName        string `json:"source_name"`
	UploaderUID       string `json:"uploader_uid"`
	UploaderName      string `json:"uploader_name"`
}

type BindConversationReq struct {
	DocumentSpaceID   string `json:"document_space_id"`
	SourceChannelID   string `json:"source_channel_id"`
	SourceChannelType uint8  `json:"source_channel_type"`
	SourceName        string `json:"source_name"`
}

func documentKind(extension string) string {
	ext := strings.ToLower(strings.TrimPrefix(extension, "."))
	switch ext {
	case "pdf":
		return KindPDF
	case "xls", "xlsx", "csv":
		return KindSheet
	case "png", "jpg", "jpeg", "gif", "webp":
		return KindImage
	case "zip", "rar", "7z":
		return KindZip
	default:
		return KindDoc
	}
}

func normalizeExtension(name, extension string) string {
	ext := strings.TrimSpace(extension)
	if ext == "" {
		ext = filepath.Ext(name)
	}
	if ext == "" {
		return ""
	}
	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}
	return strings.ToLower(ext)
}

func previewableForExtension(extension string) int {
	switch strings.ToLower(strings.TrimPrefix(extension, ".")) {
	case "zip", "rar", "7z":
		return 0
	default:
		return 1
	}
}

func formatDBTime(t dbbase.Time) string {
	return t.String()
}

func nowDBTime() dbbase.Time {
	return dbbase.Time(time.Now())
}
