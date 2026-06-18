package file

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Mininglamp-OSS/octo-lib/config"
	"github.com/Mininglamp-OSS/octo-lib/pkg/wkhttp"
	"github.com/stretchr/testify/require"
)

func newLocalFileTestContext(t *testing.T) *config.Context {
	t.Helper()
	cfg := config.New()
	cfg.RootDir = t.TempDir()
	cfg.FileService = config.FileService(fileServiceLocal)
	cfg.External.APIBaseURL = "http://octo.local/v1"
	return config.NewContext(cfg)
}

func TestLocalFileService_UploadReadAndSignDownload(t *testing.T) {
	ctx := newLocalFileTestContext(t)
	svc := NewLocalFileService(ctx)

	_, err := svc.UploadFile("common/documents/readme.txt", "text/plain; charset=utf-8", "", func(w io.Writer) error {
		_, copyErr := io.Copy(w, strings.NewReader("hello local file"))
		return copyErr
	})
	require.NoError(t, err)

	rc, contentType, err := svc.GetFile("common/documents/readme.txt")
	require.NoError(t, err)
	defer rc.Close()

	body, err := io.ReadAll(rc)
	require.NoError(t, err)
	require.Equal(t, "hello local file", string(body))
	require.Equal(t, "text/plain; charset=utf-8", contentType)

	signed, err := svc.PresignedGetURL("common/documents/readme.txt", "需求文档.txt", "inline", 30*time.Minute)
	require.NoError(t, err)

	parsed, err := url.Parse(signed)
	require.NoError(t, err)
	require.Equal(t, "http", parsed.Scheme)
	require.Equal(t, "octo.local", parsed.Host)
	require.Equal(t, "/v1/file/local", parsed.Path)
	require.Equal(t, "common/documents/readme.txt", parsed.Query().Get("path"))
	require.Equal(t, "inline", parsed.Query().Get("disposition"))
	require.NotEmpty(t, parsed.Query().Get("sig"))
}

func TestFile_LocalSignedRouteServesContentAndRejectsTampering(t *testing.T) {
	ctx := newLocalFileTestContext(t)
	f := New(ctx)
	svc, ok := f.service.(*Service).uploadService.(*LocalFileService)
	require.True(t, ok)
	_, err := svc.UploadFile("common/documents/readme.txt", "text/plain; charset=utf-8", "", func(w io.Writer) error {
		_, copyErr := io.Copy(w, strings.NewReader("hello route"))
		return copyErr
	})
	require.NoError(t, err)

	r := wkhttp.New()
	f.Route(r)

	signed, err := svc.PresignedGetURL("common/documents/readme.txt", "readme.txt", "attachment", 30*time.Minute)
	require.NoError(t, err)
	parsed, err := url.Parse(signed)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, parsed.RequestURI(), nil)
	req.Header.Set("Origin", "http://localhost:3001")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "hello route", rec.Body.String())
	require.Contains(t, rec.Header().Get("Content-Disposition"), "attachment")
	require.Equal(t, "http://localhost:3001", rec.Header().Get("Access-Control-Allow-Origin"))

	req = httptest.NewRequest(http.MethodHead, parsed.RequestURI(), nil)
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Empty(t, rec.Body.String())
	require.Contains(t, rec.Header().Get("Content-Disposition"), "attachment")

	req = httptest.NewRequest(http.MethodOptions, parsed.RequestURI(), nil)
	req.Header.Set("Origin", "http://localhost:3001")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	require.Equal(t, http.StatusNoContent, rec.Code)
	require.Equal(t, "http://localhost:3001", rec.Header().Get("Access-Control-Allow-Origin"))

	query := parsed.Query()
	query.Set("path", "common/documents/other.txt")
	parsed.RawQuery = query.Encode()
	req = httptest.NewRequest(http.MethodGet, parsed.RequestURI(), nil)
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	require.Equal(t, http.StatusForbidden, rec.Code)
}
