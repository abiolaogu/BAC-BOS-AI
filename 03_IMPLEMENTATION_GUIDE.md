# Multi-Engine DBaaS Platform - Implementation Guide

## Overview

This document provides complete implementation code for the DBaaS platform, organized into:
1. Backend (Go)
2. Frontend (React TypeScript)
3. Kubernetes Operators & CRDs
4. Infrastructure as Code
5. CI/CD Pipelines

---

## PART 1: BACKEND IMPLEMENTATION (Go)

### Project Structure

```
backend/
├── cmd/
│   ├── api/
│   │   └── main.go                    # API server entrypoint
│   └── provisioner/
│       └── main.go                    # Provisioning controller
├── internal/
│   ├── api/
│   │   ├── handlers/                  # HTTP handlers
│   │   │   ├── service.go
│   │   │   ├── backup.go
│   │   │   └── tenant.go
│   │   ├── middleware/                # Authentication, logging
│   │   │   ├── auth.go
│   │   │   ├── logging.go
│   │   │   └── ratelimit.go
│   │   └── router.go                  # Route setup
│   ├── models/                        # Data models
│   │   ├── service.go
│   │   ├── backup.go
│   │   └── tenant.go
│   ├── services/                      # Business logic
│   │   ├── service_manager.go
│   │   ├── backup_manager.go
│   │   └── provisioner.go
│   ├── repository/                    # Data access
│   │   ├── postgres/
│   │   │   ├── service_repo.go
│   │   │   └── tenant_repo.go
│   │   └── interfaces.go
│   ├── k8s/                          # Kubernetes clients
│   │   ├── client.go
│   │   ├── crd.go
│   │   └── helm.go
│   ├── config/                       # Configuration
│   │   └── config.go
│   └── util/                         # Utilities
│       ├── errors.go
│       └── logger.go
├── pkg/                              # Public packages
│   └── apiclient/                   # API client library
│       └── client.go
├── deployments/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   └── Dockerfile.provisioner
│   └── k8s/
│       ├── deployment.yaml
│       └── service.yaml
├── migrations/                       # Database migrations
│   ├── 001_initial_schema.sql
│   └── 002_add_metrics.sql
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

### Key Backend Files

#### cmd/api/main.go

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/dbaas/backend/internal/api"
	"github.com/dbaas/backend/internal/config"
	"github.com/dbaas/backend/internal/repository/postgres"
	"github.com/dbaas/backend/internal/services"
	"github.com/dbaas/backend/internal/util"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		panic(fmt.Sprintf("Failed to load config: %v", err))
	}

	// Initialize logger
	logger := util.NewLogger(cfg.LogLevel)

	// Connect to PostgreSQL
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		logger.Fatal("Failed to connect to database", "error", err)
	}

	// Initialize repositories
	serviceRepo := postgres.NewServiceRepository(db)
	tenantRepo := postgres.NewTenantRepository(db)
	backupRepo := postgres.NewBackupRepository(db)

	// Initialize services
	serviceManager := services.NewServiceManager(
		serviceRepo,
		logger,
		cfg.KubernetesConfig,
	)
	backupManager := services.NewBackupManager(backupRepo, logger)

	// Setup Gin router
	router := gin.Default()
	
	// Setup routes
	api.SetupRoutes(router, serviceManager, backupManager, tenantRepo, cfg)

	// Create HTTP server
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting API server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", "error", err)
	}

	logger.Info("Server exited")
}
```

#### internal/models/service.go

```go
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type ServiceStatus string

const (
	StatusPending      ServiceStatus = "pending"
	StatusProvisioning ServiceStatus = "provisioning"
	StatusActive       ServiceStatus = "active"
	StatusFailed       ServiceStatus = "failed"
	StatusDeleting     ServiceStatus = "deleting"
	StatusDeleted      ServiceStatus = "deleted"
)

type DatabaseEngine string

const (
	EngineYugabyte   DatabaseEngine = "yugabyte"
	EngineVitess     DatabaseEngine = "vitess"
	EngineScylla     DatabaseEngine = "scylla"
	EngineDragonfly  DatabaseEngine = "dragonfly"
	EngineAerospike  DatabaseEngine = "aerospike"
	EngineMongoDB    DatabaseEngine = "mongodb"
)

type ServicePlan string

const (
	PlanShared    ServicePlan = "shared"
	PlanDedicated ServicePlan = "dedicated"
	PlanClustered ServicePlan = "clustered"
	PlanGlobal    ServicePlan = "global"
)

type ServiceInstance struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	OrganizationID uuid.UUID      `gorm:"type:uuid;not null;index" json:"organizationId"`
	Name           string         `gorm:"type:varchar(255);not null" json:"name"`
	Engine         DatabaseEngine `gorm:"type:varchar(50);not null" json:"engine"`
	Plan           ServicePlan    `gorm:"type:varchar(50);not null" json:"plan"`
	Region         string         `gorm:"type:varchar(50);not null" json:"region"`
	Status         ServiceStatus  `gorm:"type:varchar(50);not null;default:'pending'" json:"status"`
	StatusMessage  string         `gorm:"type:text" json:"statusMessage,omitempty"`
	ConnectionInfo datatypes.JSON `gorm:"type:jsonb" json:"connectionInfo,omitempty"`
	Config         datatypes.JSON `gorm:"type:jsonb;not null" json:"config"`
	Endpoints      datatypes.JSON `gorm:"type:jsonb" json:"endpoints,omitempty"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt      *time.Time     `gorm:"index" json:"deletedAt,omitempty"`
}

type ServiceConfig struct {
	Version          string                 `json:"version"`
	StorageSize      string                 `json:"storageSize"`
	StorageClass     string                 `json:"storageClass"`
	ReplicationFactor int                   `json:"replicationFactor,omitempty"`
	Replicas         int                    `json:"replicas,omitempty"`
	Resources        *ResourceRequirements  `json:"resources,omitempty"`
	Backup           *BackupConfig          `json:"backup,omitempty"`
	HighAvailability *HAConfig              `json:"highAvailability,omitempty"`
	Networking       *NetworkingConfig      `json:"networking,omitempty"`
	Regions          []string               `json:"regions,omitempty"`
	CustomConfig     map[string]interface{} `json:"customConfig,omitempty"`
}

type ResourceRequirements struct {
	CPU    string `json:"cpu"`
	Memory string `json:"memory"`
}

type BackupConfig struct {
	Enabled     bool   `json:"enabled"`
	Schedule    string `json:"schedule"` // Cron expression
	Retention   string `json:"retention"`
	Destination string `json:"destination"`
}

type HAConfig struct {
	Enabled bool `json:"enabled"`
	MultiAZ bool `json:"multiAZ"`
}

type NetworkingConfig struct {
	TLS          *TLSConfig `json:"tls,omitempty"`
	AllowedCIDRs []string   `json:"allowedCIDRs,omitempty"`
}

type TLSConfig struct {
	Enabled     bool   `json:"enabled"`
	Certificate string `json:"certificate,omitempty"`
}

type ConnectionInfo struct {
	Host          string `json:"host"`
	Port          int    `json:"port"`
	Database      string `json:"database,omitempty"`
	Username      string `json:"username"`
	PasswordSecret string `json:"passwordSecret"`
}

type CreateServiceRequest struct {
	Name   string         `json:"name" binding:"required"`
	Engine DatabaseEngine `json:"engine" binding:"required"`
	Plan   ServicePlan    `json:"plan" binding:"required"`
	Region string         `json:"region" binding:"required"`
	Config ServiceConfig  `json:"config" binding:"required"`
}

type UpdateServiceRequest struct {
	Config ServiceConfig `json:"config" binding:"required"`
}

type ServiceResponse struct {
	ServiceInstance
	Metrics *ServiceMetrics `json:"metrics,omitempty"`
}

type ServiceMetrics struct {
	CPUUsage     float64 `json:"cpuUsage"`
	MemoryUsage  float64 `json:"memoryUsage"`
	DiskUsage    float64 `json:"diskUsage"`
	Connections  int     `json:"connections"`
	QPS          float64 `json:"qps"`
}
```

#### internal/api/handlers/service.go

```go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/dbaas/backend/internal/models"
	"github.com/dbaas/backend/internal/services"
)

type ServiceHandler struct {
	serviceManager *services.ServiceManager
}

func NewServiceHandler(sm *services.ServiceManager) *ServiceHandler {
	return &ServiceHandler{
		serviceManager: sm,
	}
}

// CreateService handles POST /api/v1/services
func (h *ServiceHandler) CreateService(c *gin.Context) {
	var req models.CreateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get organization ID from JWT context (set by auth middleware)
	orgID := c.GetString("organizationId")
	if orgID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing organization context"})
		return
	}

	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	service, err := h.serviceManager.CreateService(c.Request.Context(), orgUUID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, service)
}

// ListServices handles GET /api/v1/services
func (h *ServiceHandler) ListServices(c *gin.Context) {
	orgID := c.GetString("organizationId")
	if orgID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing organization context"})
		return
	}

	orgUUID, _ := uuid.Parse(orgID)

	// Parse query parameters
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")
	engine := c.Query("engine")
	status := c.Query("status")

	services, total, err := h.serviceManager.ListServices(
		c.Request.Context(),
		orgUUID,
		page,
		limit,
		engine,
		status,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": services,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetService handles GET /api/v1/services/:id
func (h *ServiceHandler) GetService(c *gin.Context) {
	serviceID := c.Param("id")
	serviceUUID, err := uuid.Parse(serviceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}

	orgID := c.GetString("organizationId")
	orgUUID, _ := uuid.Parse(orgID)

	service, err := h.serviceManager.GetService(c.Request.Context(), orgUUID, serviceUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Service not found"})
		return
	}

	// Fetch metrics
	metrics, _ := h.serviceManager.GetServiceMetrics(c.Request.Context(), serviceUUID)

	response := models.ServiceResponse{
		ServiceInstance: *service,
		Metrics:         metrics,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateService handles PUT /api/v1/services/:id
func (h *ServiceHandler) UpdateService(c *gin.Context) {
	serviceID := c.Param("id")
	serviceUUID, err := uuid.Parse(serviceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}

	orgID := c.GetString("organizationId")
	orgUUID, _ := uuid.Parse(orgID)

	var req models.UpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	service, err := h.serviceManager.UpdateService(c.Request.Context(), orgUUID, serviceUUID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, service)
}

// DeleteService handles DELETE /api/v1/services/:id
func (h *ServiceHandler) DeleteService(c *gin.Context) {
	serviceID := c.Param("id")
	serviceUUID, err := uuid.Parse(serviceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}

	orgID := c.GetString("organizationId")
	orgUUID, _ := uuid.Parse(orgID)

	err = h.serviceManager.DeleteService(c.Request.Context(), orgUUID, serviceUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"id":      serviceID,
		"status":  "deleting",
		"message": "Service deletion initiated",
	})
}
```

#### internal/services/service_manager.go

```go
package services

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/dbaas/backend/internal/models"
	"github.com/dbaas/backend/internal/repository"
	"github.com/dbaas/backend/internal/k8s"
	"github.com/dbaas/backend/internal/util"
)

type ServiceManager struct {
	repo      repository.ServiceRepository
	logger    *util.Logger
	k8sClient *k8s.Client
}

func NewServiceManager(repo repository.ServiceRepository, logger *util.Logger, k8sConfig string) *ServiceManager {
	k8sClient, err := k8s.NewClient(k8sConfig)
	if err != nil {
		logger.Fatal("Failed to create K8s client", "error", err)
	}

	return &ServiceManager{
		repo:      repo,
		logger:    logger,
		k8sClient: k8sClient,
	}
}

func (sm *ServiceManager) CreateService(
	ctx context.Context,
	orgID uuid.UUID,
	req models.CreateServiceRequest,
) (*models.ServiceInstance, error) {
	sm.logger.Info("Creating service", "org", orgID, "name", req.Name, "engine", req.Engine)

	// Validate configuration
	if err := sm.validateServiceConfig(req.Engine, req.Config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	// Marshal config to JSON
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal config: %w", err)
	}

	// Create service instance record
	service := &models.ServiceInstance{
		OrganizationID: orgID,
		Name:           req.Name,
		Engine:         req.Engine,
		Plan:           req.Plan,
		Region:         req.Region,
		Status:         models.StatusPending,
		Config:         configJSON,
	}

	if err := sm.repo.Create(ctx, service); err != nil {
		return nil, fmt.Errorf("failed to create service record: %w", err)
	}

	// Trigger provisioning asynchronously
	go sm.provisionService(service)

	return service, nil
}

func (sm *ServiceManager) provisionService(service *models.ServiceInstance) {
	ctx := context.Background()

	// Update status to provisioning
	service.Status = models.StatusProvisioning
	sm.repo.Update(ctx, service)

	sm.logger.Info("Provisioning service", "id", service.ID, "engine", service.Engine)

	// Create ServiceClaim CRD
	serviceClaim, err := sm.buildServiceClaim(service)
	if err != nil {
		sm.logger.Error("Failed to build ServiceClaim", "error", err)
		service.Status = models.StatusFailed
		service.StatusMessage = err.Error()
		sm.repo.Update(ctx, service)
		return
	}

	// Apply ServiceClaim to Kubernetes
	if err := sm.k8sClient.CreateServiceClaim(ctx, serviceClaim); err != nil {
		sm.logger.Error("Failed to create ServiceClaim", "error", err)
		service.Status = models.StatusFailed
		service.StatusMessage = err.Error()
		sm.repo.Update(ctx, service)
		return
	}

	// Wait for provisioning to complete (poll status)
	// This is simplified - in production, use a controller with watches
	if err := sm.waitForProvisioning(ctx, service); err != nil {
		sm.logger.Error("Provisioning failed", "error", err)
		service.Status = models.StatusFailed
		service.StatusMessage = err.Error()
		sm.repo.Update(ctx, service)
		return
	}

	// Update status to active
	service.Status = models.StatusActive
	sm.repo.Update(ctx, service)

	sm.logger.Info("Service provisioned successfully", "id", service.ID)
}

func (sm *ServiceManager) buildServiceClaim(service *models.ServiceInstance) (*k8s.ServiceClaim, error) {
	var config models.ServiceConfig
	if err := json.Unmarshal(service.Config, &config); err != nil {
		return nil, err
	}

	// Build ServiceClaim spec based on engine and config
	claim := &k8s.ServiceClaim{
		APIVersion: "dbaas.example.com/v1alpha1",
		Kind:       "ServiceClaim",
		Metadata: k8s.ObjectMeta{
			Name:      fmt.Sprintf("%s-%s", service.OrganizationID, service.Name),
			Namespace: fmt.Sprintf("tenant-%s", service.OrganizationID),
		},
		Spec: k8s.ServiceClaimSpec{
			Engine:  string(service.Engine),
			Version: config.Version,
			Plan:    string(service.Plan),
			Region:  service.Region,
			Storage: k8s.StorageSpec{
				Size:  config.StorageSize,
				Class: config.StorageClass,
			},
		},
	}

	// Add engine-specific configuration
	if config.ReplicationFactor > 0 {
		claim.Spec.Replication = &k8s.ReplicationSpec{
			Factor:  config.ReplicationFactor,
			Regions: config.Regions,
		}
	}

	if config.Backup != nil && config.Backup.Enabled {
		claim.Spec.Backup = &k8s.BackupSpec{
			Enabled:     true,
			Schedule:    config.Backup.Schedule,
			Retention:   config.Backup.Retention,
			Destination: config.Backup.Destination,
		}
	}

	return claim, nil
}

func (sm *ServiceManager) waitForProvisioning(ctx context.Context, service *models.ServiceInstance) error {
	// Poll ServiceClaim status
	// In production, use a controller with watches/informers
	// This is a simplified version
	return nil
}

func (sm *ServiceManager) validateServiceConfig(engine models.DatabaseEngine, config models.ServiceConfig) error {
	// Add validation logic per engine
	if config.StorageSize == "" {
		return fmt.Errorf("storage size is required")
	}

	// Engine-specific validation
	switch engine {
	case models.EngineYugabyte:
		if config.ReplicationFactor < 1 || config.ReplicationFactor > 7 {
			return fmt.Errorf("replication factor must be between 1 and 7")
		}
	case models.EngineVitess:
		// Vitess-specific validation
	}

	return nil
}

func (sm *ServiceManager) ListServices(
	ctx context.Context,
	orgID uuid.UUID,
	page, limit, engine, status string,
) ([]*models.ServiceInstance, int64, error) {
	return sm.repo.List(ctx, orgID, page, limit, engine, status)
}

func (sm *ServiceManager) GetService(
	ctx context.Context,
	orgID, serviceID uuid.UUID,
) (*models.ServiceInstance, error) {
	return sm.repo.Get(ctx, orgID, serviceID)
}

func (sm *ServiceManager) UpdateService(
	ctx context.Context,
	orgID, serviceID uuid.UUID,
	req models.UpdateServiceRequest,
) (*models.ServiceInstance, error) {
	service, err := sm.repo.Get(ctx, orgID, serviceID)
	if err != nil {
		return nil, err
	}

	// Marshal new config
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		return nil, err
	}

	service.Config = configJSON
	service.Status = models.StatusProvisioning

	if err := sm.repo.Update(ctx, service); err != nil {
		return nil, err
	}

	// Trigger update asynchronously
	go sm.updateServiceClaim(service)

	return service, nil
}

func (sm *ServiceManager) updateServiceClaim(service *models.ServiceInstance) {
	// Update ServiceClaim in Kubernetes
	// Similar to provisionService but for updates
}

func (sm *ServiceManager) DeleteService(
	ctx context.Context,
	orgID, serviceID uuid.UUID,
) error {
	service, err := sm.repo.Get(ctx, orgID, serviceID)
	if err != nil {
		return err
	}

	service.Status = models.StatusDeleting
	sm.repo.Update(ctx, service)

	// Delete ServiceClaim asynchronously
	go sm.deleteServiceClaim(service)

	return nil
}

func (sm *ServiceManager) deleteServiceClaim(service *models.ServiceInstance) {
	ctx := context.Background()

	// Delete ServiceClaim from Kubernetes
	namespace := fmt.Sprintf("tenant-%s", service.OrganizationID)
	name := fmt.Sprintf("%s-%s", service.OrganizationID, service.Name)

	if err := sm.k8sClient.DeleteServiceClaim(ctx, namespace, name); err != nil {
		sm.logger.Error("Failed to delete ServiceClaim", "error", err)
		return
	}

	// Soft delete from database
	service.Status = models.StatusDeleted
	sm.repo.Delete(ctx, service.ID)
}

func (sm *ServiceManager) GetServiceMetrics(
	ctx context.Context,
	serviceID uuid.UUID,
) (*models.ServiceMetrics, error) {
	// Query Prometheus for metrics
	// This is a placeholder - implement actual Prometheus queries
	return &models.ServiceMetrics{
		CPUUsage:    45.2,
		MemoryUsage: 62.8,
		DiskUsage:   38.5,
		Connections: 127,
		QPS:         1542.3,
	}, nil
}
```

#### internal/k8s/client.go

```go
package k8s

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type Client struct {
	dynamicClient dynamic.Interface
	config        *rest.Config
}

func NewClient(kubeconfig string) (*Client, error) {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		// Try in-cluster config
		config, err = rest.InClusterConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
		}
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	return &Client{
		dynamicClient: dynamicClient,
		config:        config,
	}, nil
}

// ServiceClaim CRD structure
type ServiceClaim struct {
	APIVersion string       `json:"apiVersion"`
	Kind       string       `json:"kind"`
	Metadata   ObjectMeta   `json:"metadata"`
	Spec       ServiceClaimSpec `json:"spec"`
}

type ObjectMeta struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Labels    map[string]string `json:"labels,omitempty"`
}

type ServiceClaimSpec struct {
	Engine      string          `json:"engine"`
	Version     string          `json:"version"`
	Plan        string          `json:"plan"`
	Region      string          `json:"region"`
	Storage     StorageSpec     `json:"storage"`
	Replication *ReplicationSpec `json:"replication,omitempty"`
	Backup      *BackupSpec     `json:"backup,omitempty"`
	Resources   *ResourcesSpec  `json:"resources,omitempty"`
}

type StorageSpec struct {
	Size  string `json:"size"`
	Class string `json:"class"`
}

type ReplicationSpec struct {
	Factor  int      `json:"factor"`
	Regions []string `json:"regions,omitempty"`
}

type BackupSpec struct {
	Enabled     bool   `json:"enabled"`
	Schedule    string `json:"schedule"`
	Retention   string `json:"retention"`
	Destination string `json:"destination"`
}

type ResourcesSpec struct {
	CPU    string `json:"cpu"`
	Memory string `json:"memory"`
}

var serviceClaimGVR = schema.GroupVersionResource{
	Group:    "dbaas.example.com",
	Version:  "v1alpha1",
	Resource: "serviceclaims",
}

func (c *Client) CreateServiceClaim(ctx context.Context, claim *ServiceClaim) error {
	// Convert to unstructured
	unstructuredObj, err := toUnstructured(claim)
	if err != nil {
		return fmt.Errorf("failed to convert to unstructured: %w", err)
	}

	_, err = c.dynamicClient.Resource(serviceClaimGVR).
		Namespace(claim.Metadata.Namespace).
		Create(ctx, unstructuredObj, metav1.CreateOptions{})
	
	if err != nil {
		return fmt.Errorf("failed to create ServiceClaim: %w", err)
	}

	return nil
}

func (c *Client) GetServiceClaim(ctx context.Context, namespace, name string) (*unstructured.Unstructured, error) {
	return c.dynamicClient.Resource(serviceClaimGVR).
		Namespace(namespace).
		Get(ctx, name, metav1.GetOptions{})
}

func (c *Client) UpdateServiceClaim(ctx context.Context, claim *ServiceClaim) error {
	unstructuredObj, err := toUnstructured(claim)
	if err != nil {
		return err
	}

	_, err = c.dynamicClient.Resource(serviceClaimGVR).
		Namespace(claim.Metadata.Namespace).
		Update(ctx, unstructuredObj, metav1.UpdateOptions{})
	
	return err
}

func (c *Client) DeleteServiceClaim(ctx context.Context, namespace, name string) error {
	return c.dynamicClient.Resource(serviceClaimGVR).
		Namespace(namespace).
		Delete(ctx, name, metav1.DeleteOptions{})
}

func toUnstructured(obj interface{}) (*unstructured.Unstructured, error) {
	// Convert struct to unstructured format
	// This is simplified - use proper conversion in production
	u := &unstructured.Unstructured{}
	// ... conversion logic
	return u, nil
}
```

#### Dockerfile

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o api-server ./cmd/api

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary
COPY --from=builder /app/api-server .

# Expose port
EXPOSE 8080

CMD ["./api-server"]
```

#### Makefile

```makefile
.PHONY: build test run docker-build docker-push migrate

# Variables
APP_NAME=dbaas-api
VERSION=$(shell git describe --tags --always --dirty)
DOCKER_REGISTRY=registry.example.com
DOCKER_IMAGE=$(DOCKER_REGISTRY)/$(APP_NAME):$(VERSION)

# Build
build:
	go build -o bin/api-server ./cmd/api

# Test
test:
	go test -v ./...

test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

# Run locally
run:
	go run ./cmd/api

# Docker
docker-build:
	docker build -t $(DOCKER_IMAGE) -f deployments/docker/Dockerfile .

docker-push:
	docker push $(DOCKER_IMAGE)

# Database migrations
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

# Linting
lint:
	golangci-lint run

# Generate mocks
mocks:
	mockgen -source=internal/repository/interfaces.go -destination=internal/repository/mocks/mock_repository.go
```

---

## PART 2: FRONTEND IMPLEMENTATION (React TypeScript)

### Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── api/                          # API clients
│   │   ├── client.ts
│   │   ├── services.ts
│   │   ├── backups.ts
│   │   └── tenants.ts
│   ├── components/                   # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Modal.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   └── service/
│   │       ├── ServiceCard.tsx
│   │       ├── ServiceList.tsx
│   │       ├── ServiceDetail.tsx
│   │       └── CreateServiceForm.tsx
│   ├── pages/                        # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Services/
│   │   │   ├── ServicesList.tsx
│   │   │   ├── ServiceDetail.tsx
│   │   │   └── CreateService.tsx
│   │   ├── Backups/
│   │   │   └── BackupsList.tsx
│   │   ├── Settings/
│   │   │   └── Settings.tsx
│   │   └── Login.tsx
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useServices.ts
│   │   └── useWebSocket.ts
│   ├── store/                        # State management
│   │   ├── authSlice.ts
│   │   ├── servicesSlice.ts
│   │   └── store.ts
│   ├── types/                        # TypeScript types
│   │   ├── service.ts
│   │   ├── backup.ts
│   │   └── auth.ts
│   ├── utils/                        # Utility functions
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── routes.tsx
├── package.json
├── tsconfig.json
└── README.md
```

### Key Frontend Files

#### src/api/client.ts

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient(
  process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1'
);
```

#### src/api/services.ts

```typescript
import { apiClient } from './client';
import {
  ServiceInstance,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceListResponse,
  ServiceMetrics,
} from '../types/service';

export const servicesAPI = {
  list: async (params?: {
    page?: number;
    limit?: number;
    engine?: string;
    status?: string;
  }): Promise<ServiceListResponse> => {
    return apiClient.get<ServiceListResponse>('/services', { params });
  },

  get: async (id: string): Promise<ServiceInstance> => {
    return apiClient.get<ServiceInstance>(`/services/${id}`);
  },

  create: async (data: CreateServiceRequest): Promise<ServiceInstance> => {
    return apiClient.post<ServiceInstance>('/services', data);
  },

  update: async (id: string, data: UpdateServiceRequest): Promise<ServiceInstance> => {
    return apiClient.put<ServiceInstance>(`/services/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/services/${id}`);
  },

  getMetrics: async (id: string, params?: {
    start: string;
    end: string;
    step?: string;
  }): Promise<ServiceMetrics> => {
    return apiClient.get<ServiceMetrics>(`/services/${id}/metrics`, { params });
  },
};
```

#### src/types/service.ts

```typescript
export type DatabaseEngine =
  | 'yugabyte'
  | 'vitess'
  | 'scylla'
  | 'dragonfly'
  | 'aerospike'
  | 'mongodb';

export type ServicePlan =
  | 'shared'
  | 'dedicated'
  | 'clustered'
  | 'global';

export type ServiceStatus =
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'failed'
  | 'deleting'
  | 'deleted';

export interface ServiceInstance {
  id: string;
  organizationId: string;
  name: string;
  engine: DatabaseEngine;
  plan: ServicePlan;
  region: string;
  status: ServiceStatus;
  statusMessage?: string;
  connectionInfo?: ConnectionInfo;
  config: ServiceConfig;
  endpoints?: Endpoint[];
  createdAt: string;
  updatedAt: string;
  metrics?: ServiceMetrics;
}

export interface ConnectionInfo {
  host: string;
  port: number;
  database?: string;
  username: string;
  passwordSecret: string;
}

export interface ServiceConfig {
  version: string;
  storageSize: string;
  storageClass: string;
  replicationFactor?: number;
  replicas?: number;
  resources?: ResourceRequirements;
  backup?: BackupConfig;
  highAvailability?: HAConfig;
  networking?: NetworkingConfig;
  regions?: string[];
  customConfig?: Record<string, any>;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: string;
  destination: string;
}

export interface HAConfig {
  enabled: boolean;
  multiAZ: boolean;
}

export interface NetworkingConfig {
  tls?: TLSConfig;
  allowedCIDRs?: string[];
}

export interface TLSConfig {
  enabled: boolean;
  certificate?: string;
}

export interface Endpoint {
  name: string;
  url: string;
}

export interface ServiceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  connections: number;
  qps: number;
}

export interface CreateServiceRequest {
  name: string;
  engine: DatabaseEngine;
  plan: ServicePlan;
  region: string;
  config: ServiceConfig;
}

export interface UpdateServiceRequest {
  config: ServiceConfig;
}

export interface ServiceListResponse {
  data: ServiceInstance[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

#### src/components/service/CreateServiceForm.tsx

```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
} from '@mui/material';
import { CreateServiceRequest, DatabaseEngine, ServicePlan } from '../../types/service';
import { servicesAPI } from '../../api/services';

interface CreateServiceFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const engines: { value: DatabaseEngine; label: string }[] = [
  { value: 'yugabyte', label: 'YugabyteDB' },
  { value: 'vitess', label: 'Vitess (MySQL)' },
  { value: 'scylla', label: 'ScyllaDB' },
  { value: 'dragonfly', label: 'DragonflyDB' },
  { value: 'aerospike', label: 'Aerospike' },
  { value: 'mongodb', label: 'MongoDB' },
];

const plans: { value: ServicePlan; label: string; description: string }[] = [
  { value: 'shared', label: 'Shared', description: 'Namespace isolation, dev/test' },
  { value: 'dedicated', label: 'Dedicated', description: 'Dedicated cluster, HA' },
  { value: 'clustered', label: 'Clustered', description: 'Multi-node, fast failover' },
  { value: 'global', label: 'Global', description: 'Multi-region active-active' },
];

const regions = [
  { value: 'lagos', label: 'Lagos, Nigeria' },
  { value: 'johannesburg', label: 'Johannesburg, South Africa' },
  { value: 'frankfurt', label: 'Frankfurt, Germany' },
  { value: 'ashburn', label: 'Ashburn, USA' },
  { value: 'singapore', label: 'Singapore' },
];

export const CreateServiceForm: React.FC<CreateServiceFormProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<CreateServiceRequest>({
    name: '',
    engine: 'yugabyte',
    plan: 'shared',
    region: 'lagos',
    config: {
      version: '2.18.0',
      storageSize: '100Gi',
      storageClass: 'fast-nvme',
      replicationFactor: 3,
      backup: {
        enabled: true,
        schedule: '0 2 * * *',
        retention: '7d',
        destination: '',
      },
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = ['Basic Info', 'Configuration', 'Review'];

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await servicesAPI.create(formData);
      onSuccess();
      onClose();
      // Reset form
      setActiveStep(0);
      setFormData({
        name: '',
        engine: 'yugabyte',
        plan: 'shared',
        region: 'lagos',
        config: {
          version: '2.18.0',
          storageSize: '100Gi',
          storageClass: 'fast-nvme',
          replicationFactor: 3,
          backup: {
            enabled: true,
            schedule: '0 2 * * *',
            retention: '7d',
            destination: '',
          },
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Service Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Database Engine</InputLabel>
                <Select
                  value={formData.engine}
                  onChange={(e) =>
                    setFormData({ ...formData, engine: e.target.value as DatabaseEngine })
                  }
                >
                  {engines.map((engine) => (
                    <MenuItem key={engine.value} value={engine.value}>
                      {engine.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Service Plan</InputLabel>
                <Select
                  value={formData.plan}
                  onChange={(e) =>
                    setFormData({ ...formData, plan: e.target.value as ServicePlan })
                  }
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan.value} value={plan.value}>
                      <Box>
                        <Typography>{plan.label}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {plan.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Region</InputLabel>
                <Select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                >
                  {regions.map((region) => (
                    <MenuItem key={region.value} value={region.value}>
                      {region.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Version"
                value={formData.config.version}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, version: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Storage Size"
                value={formData.config.storageSize}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, storageSize: e.target.value },
                  })
                }
                helperText="e.g., 100Gi, 1Ti"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Replication Factor"
                type="number"
                value={formData.config.replicationFactor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      replicationFactor: parseInt(e.target.value),
                    },
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Backup Schedule (Cron)"
                value={formData.config.backup?.schedule}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      backup: {
                        ...formData.config.backup!,
                        schedule: e.target.value,
                      },
                    },
                  })
                }
                helperText="e.g., 0 2 * * * for daily at 2AM"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Name:
                </Typography>
                <Typography>{formData.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Engine:
                </Typography>
                <Typography>
                  {engines.find((e) => e.value === formData.engine)?.label}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Plan:
                </Typography>
                <Typography>
                  {plans.find((p) => p.value === formData.plan)?.label}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Region:
                </Typography>
                <Typography>
                  {regions.find((r) => r.value === formData.region)?.label}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Storage:
                </Typography>
                <Typography>{formData.config.storageSize}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Replication Factor:
                </Typography>
                <Typography>{formData.config.replicationFactor}</Typography>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Database Service</DialogTitle>
      <DialogContent>
        <Box sx={{ width: '100%', mt: 2 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ mt: 4, mb: 2 }}>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            {renderStepContent(activeStep)}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Service'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
```

#### src/pages/Services/ServicesList.tsx

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { servicesAPI } from '../../api/services';
import { ServiceInstance } from '../../types/service';
import { CreateServiceForm } from '../../components/service/CreateServiceForm';
import { useNavigate } from 'react-router-dom';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'provisioning':
      return 'info';
    case 'failed':
      return 'error';
    case 'deleting':
      return 'warning';
    default:
      return 'default';
  }
};

export const ServicesList: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await servicesAPI.list();
      setServices(response.data);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, serviceId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedService(serviceId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedService(null);
  };

  const handleDelete = async () => {
    if (selectedService) {
      try {
        await servicesAPI.delete(selectedService);
        loadServices();
      } catch (error) {
        console.error('Failed to delete service:', error);
      }
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Database Services
        </Typography>
        <Box>
          <IconButton onClick={loadServices} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Service
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {services.map((service) => (
          <Grid item xs={12} sm={6} md={4} key={service.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom>
                      {service.name}
                    </Typography>
                    <Chip
                      label={service.status}
                      color={getStatusColor(service.status) as any}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="textSecondary">
                      {service.engine} • {service.plan}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {service.region}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, service.id)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {service.metrics && (
                  <Box mt={2}>
                    <Typography variant="caption" color="textSecondary">
                      CPU: {service.metrics.cpuUsage.toFixed(1)}% | 
                      Memory: {service.metrics.memoryUsage.toFixed(1)}% |
                      QPS: {service.metrics.qps.toFixed(0)}
                    </Typography>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/services/${service.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {services.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No services yet
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Create your first database service to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Service
          </Button>
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedService) navigate(`/services/${selectedService}`);
          handleMenuClose();
        }}>
          View Details
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedService) navigate(`/services/${selectedService}/edit`);
          handleMenuClose();
        }}>
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      <CreateServiceForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={loadServices}
      />
    </Container>
  );
};
```

---

## PART 3: KUBERNETES CRDs & OPERATORS

### ServiceClaim CRD

```yaml
# k8s/crds/serviceclaim-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: serviceclaims.dbaas.example.com
spec:
  group: dbaas.example.com
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - engine
                - version
                - plan
                - region
                - storage
              properties:
                engine:
                  type: string
                  enum:
                    - yugabyte
                    - vitess
                    - scylla
                    - dragonfly
                    - aerospike
                    - mongodb
                version:
                  type: string
                plan:
                  type: string
                  enum:
                    - shared
                    - dedicated
                    - clustered
                    - global
                region:
                  type: string
                storage:
                  type: object
                  required:
                    - size
                    - class
                  properties:
                    size:
                      type: string
                    class:
                      type: string
                replication:
                  type: object
                  properties:
                    factor:
                      type: integer
                      minimum: 1
                      maximum: 7
                    regions:
                      type: array
                      items:
                        type: string
                backup:
                  type: object
                  properties:
                    enabled:
                      type: boolean
                    schedule:
                      type: string
                    retention:
                      type: string
                    destination:
                      type: string
                resources:
                  type: object
                  properties:
                    master:
                      type: object
                      properties:
                        replicas:
                          type: integer
                        cpu:
                          type: string
                        memory:
                          type: string
                    tserver:
                      type: object
                      properties:
                        replicas:
                          type: integer
                        cpu:
                          type: string
                        memory:
                          type: string
                observability:
                  type: object
                  properties:
                    metrics:
                      type: object
                      properties:
                        enabled:
                          type: boolean
                        scrapeInterval:
                          type: string
                    logs:
                      type: object
                      properties:
                        enabled:
                          type: boolean
                        retention:
                          type: string
                highAvailability:
                  type: object
                  properties:
                    enabled:
                      type: boolean
                    multiAZ:
                      type: boolean
                networking:
                  type: object
                  properties:
                    tls:
                      type: object
                      properties:
                        enabled:
                          type: boolean
                        certificate:
                          type: string
                    allowedCIDRs:
                      type: array
                      items:
                        type: string
            status:
              type: object
              properties:
                phase:
                  type: string
                  enum:
                    - Pending
                    - Provisioning
                    - Active
                    - Failed
                    - Deleting
                message:
                  type: string
                connectionString:
                  type: string
                endpoints:
                  type: array
                  items:
                    type: object
                    properties:
                      name:
                        type: string
                      url:
                        type: string
                conditions:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                      status:
                        type: string
                      lastTransitionTime:
                        type: string
                        format: date-time
                      reason:
                        type: string
                      message:
                        type: string
      subresources:
        status: {}
      additionalPrinterColumns:
        - name: Engine
          type: string
          jsonPath: .spec.engine
        - name: Plan
          type: string
          jsonPath: .spec.plan
        - name: Status
          type: string
          jsonPath: .status.phase
        - name: Age
          type: date
          jsonPath: .metadata.creationTimestamp
  scope: Namespaced
  names:
    plural: serviceclaims
    singular: serviceclaim
    kind: ServiceClaim
    shortNames:
      - sc
```

### ServiceClaim Controller (Go)

```go
// cmd/provisioner/main.go
package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	dbaasv1alpha1 "github.com/dbaas/backend/pkg/apis/dbaas/v1alpha1"
	"github.com/dbaas/backend/internal/controllers"
)

func main() {
	var kubeconfig string
	flag.StringVar(&kubeconfig, "kubeconfig", "", "path to kubeconfig file")
	flag.Parse()

	// Setup logger
	ctrl.SetLogger(zap.New(zap.UseDevMode(true)))
	setupLog := ctrl.Log.WithName("setup")

	// Setup scheme
	scheme := runtime.NewScheme()
	_ = dbaasv1alpha1.AddToScheme(scheme)

	// Setup manager
	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme: scheme,
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	// Setup reconciler
	if err = controllers.NewServiceClaimReconciler(
		mgr.GetClient(),
		mgr.GetScheme(),
		ctrl.Log.WithName("controllers").WithName("ServiceClaim"),
	).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller")
		os.Exit(1)
	}

	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}

// internal/controllers/serviceclaim_controller.go
package controllers

import (
	"context"
	"fmt"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	dbaasv1alpha1 "github.com/dbaas/backend/pkg/apis/dbaas/v1alpha1"
)

type ServiceClaimReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Log    logr.Logger
}

func NewServiceClaimReconciler(c client.Client, s *runtime.Scheme, l logr.Logger) *ServiceClaimReconciler {
	return &ServiceClaimReconciler{
		Client: c,
		Scheme: s,
		Log:    l,
	}
}

func (r *ServiceClaimReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := r.Log.WithValues("serviceclaim", req.NamespacedName)

	// Fetch ServiceClaim
	var serviceClaim dbaasv1alpha1.ServiceClaim
	if err := r.Get(ctx, req.NamespacedName, &serviceClaim); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Check if being deleted
	if !serviceClaim.ObjectMeta.DeletionTimestamp.IsZero() {
		return r.reconcileDelete(ctx, &serviceClaim)
	}

	// Add finalizer if not present
	if !contains(serviceClaim.GetFinalizers(), "dbaas.example.com/finalizer") {
		serviceClaim.SetFinalizers(append(serviceClaim.GetFinalizers(), "dbaas.example.com/finalizer"))
		if err := r.Update(ctx, &serviceClaim); err != nil {
			return ctrl.Result{}, err
		}
	}

	// Reconcile based on engine
	switch serviceClaim.Spec.Engine {
	case "yugabyte":
		return r.reconcileYugabyte(ctx, &serviceClaim)
	case "vitess":
		return r.reconcileVitess(ctx, &serviceClaim)
	case "scylla":
		return r.reconcileScylla(ctx, &serviceClaim)
	// ... other engines
	default:
		return ctrl.Result{}, fmt.Errorf("unsupported engine: %s", serviceClaim.Spec.Engine)
	}
}

func (r *ServiceClaimReconciler) reconcileYugabyte(
	ctx context.Context,
	sc *dbaasv1alpha1.ServiceClaim,
) (ctrl.Result, error) {
	log := r.Log.WithValues("serviceclaim", sc.Name, "engine", "yugabyte")

	// Create YugabyteDB universe CRD
	// This would call the YugabyteDB operator's CRD

	log.Info("Provisioning YugabyteDB cluster")

	// Update status
	sc.Status.Phase = "Provisioning"
	sc.Status.Message = "Creating YugabyteDB universe"
	if err := r.Status().Update(ctx, sc); err != nil {
		return ctrl.Result{}, err
	}

	// Create resources (simplified)
	// In production, create actual YugabyteDB CRD

	// Update status to Active
	sc.Status.Phase = "Active"
	sc.Status.ConnectionString = fmt.Sprintf(
		"postgresql://yugabyte-svc.%s.svc.cluster.local:5433",
		sc.Namespace,
	)
	sc.Status.Endpoints = []dbaasv1alpha1.Endpoint{
		{
			Name: "master-ui",
			URL:  fmt.Sprintf("https://yugabyte-master-ui.%s.dbaas.example.com", sc.Spec.Region),
		},
	}

	if err := r.Status().Update(ctx, sc); err != nil {
		return ctrl.Result{}, err
	}

	log.Info("YugabyteDB cluster provisioned successfully")
	return ctrl.Result{}, nil
}

func (r *ServiceClaimReconciler) reconcileDelete(
	ctx context.Context,
	sc *dbaasv1alpha1.ServiceClaim,
) (ctrl.Result, error) {
	log := r.Log.WithValues("serviceclaim", sc.Name)

	log.Info("Deleting service resources")

	// Delete underlying resources
	// ...

	// Remove finalizer
	sc.SetFinalizers(removeString(sc.GetFinalizers(), "dbaas.example.com/finalizer"))
	if err := r.Update(ctx, sc); err != nil {
		return ctrl.Result{}, err
	}

	log.Info("Service resources deleted")
	return ctrl.Result{}, nil
}

func (r *ServiceClaimReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&dbaasv1alpha1.ServiceClaim{}).
		Complete(r)
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

func removeString(list []string, s string) []string {
	result := []string{}
	for _, v := range list {
		if v != s {
			result = append(result, v)
		}
	}
	return result
}
```

---

## PART 4: INFRASTRUCTURE CODE

### Terraform for Control Plane

```hcl
# terraform/control-plane/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "aws" {
  region = var.region
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "${var.environment}-dbaas-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_dns_hostnames = true

  tags = {
    Environment = var.environment
    Project     = "dbaas"
  }
}

# RDS PostgreSQL for Control Plane
module "rds" {
  source = "terraform-aws-modules/rds/aws"
  version = "6.1.0"

  identifier = "${var.environment}-dbaas-control"

  engine               = "postgres"
  engine_version       = "15.3"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = "db.t3.large"

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true

  db_name  = "dbaas"
  username = "dbaas_admin"
  port     = 5432

  multi_az               = true
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 30
  backup_window           = "03:00-06:00"
  maintenance_window      = "Mon:00:00-Mon:03:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Environment = var.environment
    Project     = "dbaas"
  }
}

# ElastiCache Redis for Job Queue
module "redis" {
  source = "terraform-aws-modules/elasticache/aws"
  version = "3.1.0"

  cluster_id               = "${var.environment}-dbaas-redis"
  engine                   = "redis"
  engine_version           = "7.0"
  node_type                = "cache.t3.medium"
  num_cache_nodes          = 1
  parameter_group_name     = "default.redis7"
  port                     = 6379
  subnet_ids               = module.vpc.private_subnets
  security_group_ids       = [aws_security_group.redis.id]

  tags = {
    Environment = var.environment
    Project     = "dbaas"
  }
}

# EKS Cluster for Control Plane Services
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "19.16.0"

  cluster_name    = "${var.environment}-dbaas-control"
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    control_plane = {
      min_size     = 3
      max_size     = 10
      desired_size = 3

      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
    }
  }

  tags = {
    Environment = var.environment
    Project     = "dbaas"
  }
}

# Security Groups
resource "aws_security_group" "rds" {
  name        = "${var.environment}-dbaas-rds"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-dbaas-rds"
    Environment = var.environment
  }
}

resource "aws_security_group" "redis" {
  name        = "${var.environment}-dbaas-redis"
  description = "Security group for Redis"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-dbaas-redis"
    Environment = var.environment
  }
}

# Outputs
output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  value = module.redis.cluster_cache_nodes[0].address
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
```

---

## PART 5: CI/CD PIPELINE

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - build
  - test
  - deploy

variables:
  DOCKER_REGISTRY: registry.example.com
  APP_NAME: dbaas-api

.docker_login: &docker_login
  - echo $CI_REGISTRY_PASSWORD | docker login -u $CI_REGISTRY_USER --password-stdin $DOCKER_REGISTRY

validate:backend:
  stage: validate
  image: golang:1.21
  script:
    - cd backend
    - go mod download
    - go fmt ./...
    - go vet ./...
    - golangci-lint run
  only:
    - branches

validate:k8s:
  stage: validate
  image: alpine/k8s:1.27.3
  script:
    - cd k8s
    - kubectl --dry-run=client apply -f crds/
    - helm lint charts/*
  only:
    - branches

build:backend:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - *docker_login
  script:
    - cd backend
    - docker build -t $DOCKER_REGISTRY/$APP_NAME:$CI_COMMIT_SHA -f deployments/docker/Dockerfile .
    - docker push $DOCKER_REGISTRY/$APP_NAME:$CI_COMMIT_SHA
  only:
    - branches

test:backend:
  stage: test
  image: golang:1.21
  services:
    - postgres:15
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: "postgres://test:test@postgres:5432/test?sslmode=disable"
  script:
    - cd backend
    - go test -v -coverprofile=coverage.out ./...
    - go tool cover -func=coverage.out
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: backend/coverage.out
  only:
    - branches

deploy:staging:
  stage: deploy
  image: alpine/k8s:1.27.3
  script:
    - cd k8s
    - kubectl config use-context staging
    - kubectl set image deployment/dbaas-api dbaas-api=$DOCKER_REGISTRY/$APP_NAME:$CI_COMMIT_SHA
  only:
    - main
  environment:
    name: staging
    url: https://staging-api.dbaas.example.com

deploy:production:
  stage: deploy
  image: alpine/k8s:1.27.3
  script:
    - cd k8s
    - kubectl config use-context production
    - kubectl set image deployment/dbaas-api dbaas-api=$DOCKER_REGISTRY/$APP_NAME:$CI_COMMIT_SHA
  only:
    - tags
  environment:
    name: production
    url: https://api.dbaas.example.com
  when: manual
```

---

This implementation guide provides the core code structure and key files for building the Multi-Engine DBaaS platform. The complete implementation would include additional files for:

1. Additional database engine support
2. Backup management implementation
3. Metrics collection and aggregation
4. Alert management
5. Tenant management
6. Billing integration
7. Complete frontend pages and components
8. Comprehensive test suites
9. Monitoring dashboards
10. Ansible playbooks for Day-2 operations

Each component can be extended based on specific requirements and scale.
