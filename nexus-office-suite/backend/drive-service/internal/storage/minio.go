package storage

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/nexus/drive-service/config"
)

// StorageService defines the interface for file storage operations
type StorageService interface {
	UploadFile(ctx context.Context, tenantID, fileID uuid.UUID, filename string, reader io.Reader, size int64, contentType string) (string, error)
	DownloadFile(ctx context.Context, storagePath string) (io.ReadCloser, error)
	DeleteFile(ctx context.Context, storagePath string) error
	GetFileURL(ctx context.Context, storagePath string, expiryDuration time.Duration) (string, error)
	CopyFile(ctx context.Context, sourcePath, destPath string) error
	FileExists(ctx context.Context, storagePath string) (bool, error)
}

// MinIOStorage implements StorageService using MinIO
type MinIOStorage struct {
	client *minio.Client
	bucket string
}

// NewMinIOStorage creates a new MinIO storage service
func NewMinIOStorage(cfg *config.MinIOConfig) (*MinIOStorage, error) {
	// Initialize MinIO client
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	storage := &MinIOStorage{
		client: client,
		bucket: cfg.Bucket,
	}

	// Ensure bucket exists
	if err := storage.ensureBucket(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ensure bucket exists: %w", err)
	}

	return storage, nil
}

// ensureBucket creates the bucket if it doesn't exist
func (s *MinIOStorage) ensureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return err
	}

	if !exists {
		err = s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{})
		if err != nil {
			return err
		}
	}

	return nil
}

// UploadFile uploads a file to MinIO
func (s *MinIOStorage) UploadFile(ctx context.Context, tenantID, fileID uuid.UUID, filename string, reader io.Reader, size int64, contentType string) (string, error) {
	// Generate storage path: tenantID/year/month/fileID/filename
	now := time.Now()
	storagePath := fmt.Sprintf(
		"%s/%d/%02d/%s/%s",
		tenantID.String(),
		now.Year(),
		now.Month(),
		fileID.String(),
		filename,
	)

	// Upload file
	_, err := s.client.PutObject(ctx, s.bucket, storagePath, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	return storagePath, nil
}

// DownloadFile downloads a file from MinIO
func (s *MinIOStorage) DownloadFile(ctx context.Context, storagePath string) (io.ReadCloser, error) {
	object, err := s.client.GetObject(ctx, s.bucket, storagePath, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to download file: %w", err)
	}

	// Verify the object exists by checking stats
	_, err = object.Stat()
	if err != nil {
		object.Close()
		return nil, fmt.Errorf("file not found: %w", err)
	}

	return object, nil
}

// DeleteFile deletes a file from MinIO
func (s *MinIOStorage) DeleteFile(ctx context.Context, storagePath string) error {
	err := s.client.RemoveObject(ctx, s.bucket, storagePath, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// GetFileURL generates a presigned URL for file access
func (s *MinIOStorage) GetFileURL(ctx context.Context, storagePath string, expiryDuration time.Duration) (string, error) {
	url, err := s.client.PresignedGetObject(ctx, s.bucket, storagePath, expiryDuration, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}
	return url.String(), nil
}

// CopyFile copies a file within MinIO
func (s *MinIOStorage) CopyFile(ctx context.Context, sourcePath, destPath string) error {
	src := minio.CopySrcOptions{
		Bucket: s.bucket,
		Object: sourcePath,
	}

	dst := minio.CopyDestOptions{
		Bucket: s.bucket,
		Object: destPath,
	}

	_, err := s.client.CopyObject(ctx, dst, src)
	if err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return nil
}

// FileExists checks if a file exists in MinIO
func (s *MinIOStorage) FileExists(ctx context.Context, storagePath string) (bool, error) {
	_, err := s.client.StatObject(ctx, s.bucket, storagePath, minio.StatObjectOptions{})
	if err != nil {
		errResponse := minio.ToErrorResponse(err)
		if errResponse.Code == "NoSuchKey" {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// GetStoragePath generates a storage path for a file
func GetStoragePath(tenantID, fileID uuid.UUID, filename string) string {
	now := time.Now()
	ext := filepath.Ext(filename)
	return fmt.Sprintf(
		"%s/%d/%02d/%s%s",
		tenantID.String(),
		now.Year(),
		now.Month(),
		fileID.String(),
		ext,
	)
}
