package models

import (
	"time"
)

// ChannelType represents the messaging channel
type ChannelType string

const (
	ChannelSMS       ChannelType = "sms"
	ChannelWhatsApp  ChannelType = "whatsapp"
	ChannelTelegram  ChannelType = "telegram"
	ChannelMessenger ChannelType = "messenger"
)

// MessageStatus represents message delivery status
type MessageStatus string

const (
	StatusPending   MessageStatus = "pending"
	StatusSent      MessageStatus = "sent"
	StatusDelivered MessageStatus = "delivered"
	StatusFailed    MessageStatus = "failed"
	StatusRead      MessageStatus = "read"
)

// Message represents a messaging request
type Message struct {
	ID                string        `json:"id"`
	TenantID          string        `json:"tenant_id"`
	CampaignID        string        `json:"campaign_id,omitempty"`
	Channel           ChannelType   `json:"channel"`
	From              string        `json:"from"`
	To                string        `json:"to"`
	Body              string        `json:"body"`
	MediaURL          string        `json:"media_url,omitempty"`
	MediaType         string        `json:"media_type,omitempty"`
	TemplateID        string        `json:"template_id,omitempty"`
	TemplateParams    map[string]string `json:"template_params,omitempty"`
	Priority          int           `json:"priority"` // 1-10, 10 = highest
	ScheduledFor      *time.Time    `json:"scheduled_for,omitempty"`
	Status            MessageStatus `json:"status"`
	ProviderMessageID string        `json:"provider_message_id,omitempty"`
	Provider          string        `json:"provider,omitempty"`
	Cost              float64       `json:"cost"`
	Currency          string        `json:"currency"`
	Error             string        `json:"error,omitempty"`
	Metadata          map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt         time.Time     `json:"created_at"`
	SentAt            *time.Time    `json:"sent_at,omitempty"`
	DeliveredAt       *time.Time    `json:"delivered_at,omitempty"`
	ReadAt            *time.Time    `json:"read_at,omitempty"`
	RetryCount        int           `json:"retry_count"`
	MaxRetries        int           `json:"max_retries"`
}

// MessageResponse represents the response after sending a message
type MessageResponse struct {
	MessageID         string        `json:"message_id"`
	Status            MessageStatus `json:"status"`
	ProviderMessageID string        `json:"provider_message_id"`
	Provider          string        `json:"provider"`
	Cost              float64       `json:"cost"`
	Currency          string        `json:"currency"`
	EstimatedDelivery *time.Time    `json:"estimated_delivery,omitempty"`
	Error             string        `json:"error,omitempty"`
}

// BulkMessageRequest represents a bulk messaging request
type BulkMessageRequest struct {
	TenantID       string              `json:"tenant_id" binding:"required"`
	CampaignID     string              `json:"campaign_id,omitempty"`
	Channel        ChannelType         `json:"channel" binding:"required"`
	From           string              `json:"from" binding:"required"`
	Recipients     []string            `json:"recipients" binding:"required,min=1"`
	Body           string              `json:"body" binding:"required"`
	MediaURL       string              `json:"media_url,omitempty"`
	TemplateID     string              `json:"template_id,omitempty"`
	TemplateParams map[string]string   `json:"template_params,omitempty"`
	Priority       int                 `json:"priority"`
	ScheduledFor   *time.Time          `json:"scheduled_for,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// Campaign represents a messaging campaign
type Campaign struct {
	ID          string                 `json:"id"`
	TenantID    string                 `json:"tenant_id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Channel     ChannelType            `json:"channel"`
	Status      CampaignStatus         `json:"status"`
	From        string                 `json:"from"`
	Recipients  []string               `json:"recipients"`
	Message     string                 `json:"message"`
	TemplateID  string                 `json:"template_id,omitempty"`
	ScheduledAt *time.Time             `json:"scheduled_at,omitempty"`
	StartedAt   *time.Time             `json:"started_at,omitempty"`
	CompletedAt *time.Time             `json:"completed_at,omitempty"`
	Stats       CampaignStats          `json:"stats"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// CampaignStatus represents campaign status
type CampaignStatus string

const (
	CampaignStatusDraft      CampaignStatus = "draft"
	CampaignStatusScheduled  CampaignStatus = "scheduled"
	CampaignStatusRunning    CampaignStatus = "running"
	CampaignStatusPaused     CampaignStatus = "paused"
	CampaignStatusCompleted  CampaignStatus = "completed"
	CampaignStatusCancelled  CampaignStatus = "cancelled"
)

// CampaignStats represents campaign statistics
type CampaignStats struct {
	TotalRecipients int     `json:"total_recipients"`
	Sent            int     `json:"sent"`
	Delivered       int     `json:"delivered"`
	Failed          int     `json:"failed"`
	Read            int     `json:"read"`
	Clicked         int     `json:"clicked"`
	Unsubscribed    int     `json:"unsubscribed"`
	TotalCost       float64 `json:"total_cost"`
	DeliveryRate    float64 `json:"delivery_rate"`
	OpenRate        float64 `json:"open_rate"`
	ClickRate       float64 `json:"click_rate"`
}

// Contact represents a contact in the system
type Contact struct {
	ID          string                 `json:"id"`
	TenantID    string                 `json:"tenant_id"`
	FirstName   string                 `json:"first_name"`
	LastName    string                 `json:"last_name"`
	Email       string                 `json:"email"`
	Phone       string                 `json:"phone"`
	WhatsApp    string                 `json:"whatsapp,omitempty"`
	Telegram    string                 `json:"telegram,omitempty"`
	Tags        []string               `json:"tags"`
	CustomFields map[string]interface{} `json:"custom_fields,omitempty"`
	Subscribed  bool                   `json:"subscribed"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// Template represents a message template
type Template struct {
	ID          string            `json:"id"`
	TenantID    string            `json:"tenant_id"`
	Name        string            `json:"name"`
	Channel     ChannelType       `json:"channel"`
	Body        string            `json:"body"`
	MediaURL    string            `json:"media_url,omitempty"`
	Variables   []string          `json:"variables"`
	Category    string            `json:"category"`
	Language    string            `json:"language"`
	Status      string            `json:"status"` // approved, pending, rejected
	ProviderID  string            `json:"provider_id,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// WebhookEvent represents an incoming webhook event
type WebhookEvent struct {
	ID               string                 `json:"id"`
	Provider         string                 `json:"provider"`
	Channel          ChannelType            `json:"channel"`
	MessageID        string                 `json:"message_id"`
	Status           MessageStatus          `json:"status"`
	Timestamp        time.Time              `json:"timestamp"`
	RawPayload       map[string]interface{} `json:"raw_payload"`
	ProcessedAt      *time.Time             `json:"processed_at,omitempty"`
}

// AnalyticsOverview represents overall analytics
type AnalyticsOverview struct {
	Period          string                      `json:"period"`
	TotalMessages   int64                       `json:"total_messages"`
	Sent            int64                       `json:"sent"`
	Delivered       int64                       `json:"delivered"`
	Failed          int64                       `json:"failed"`
	DeliveryRate    float64                     `json:"delivery_rate"`
	TotalCost       float64                     `json:"total_cost"`
	ByChannel       map[ChannelType]ChannelStats `json:"by_channel"`
	ByProvider      map[string]ProviderStats     `json:"by_provider"`
	TopCountries    []CountryStats               `json:"top_countries"`
	HourlyActivity  []HourlyStats                `json:"hourly_activity"`
}

// ChannelStats represents statistics by channel
type ChannelStats struct {
	Channel      ChannelType `json:"channel"`
	Total        int64       `json:"total"`
	Sent         int64       `json:"sent"`
	Delivered    int64       `json:"delivered"`
	Failed       int64       `json:"failed"`
	DeliveryRate float64     `json:"delivery_rate"`
	TotalCost    float64     `json:"total_cost"`
	AvgCost      float64     `json:"avg_cost"`
}

// ProviderStats represents statistics by provider
type ProviderStats struct {
	Provider     string  `json:"provider"`
	Total        int64   `json:"total"`
	Sent         int64   `json:"sent"`
	Delivered    int64   `json:"delivered"`
	Failed       int64   `json:"failed"`
	DeliveryRate float64 `json:"delivery_rate"`
	AvgLatency   float64 `json:"avg_latency_ms"`
	TotalCost    float64 `json:"total_cost"`
	HealthScore  float64 `json:"health_score"`
}

// CountryStats represents statistics by country
type CountryStats struct {
	Country      string  `json:"country"`
	CountryCode  string  `json:"country_code"`
	Total        int64   `json:"total"`
	DeliveryRate float64 `json:"delivery_rate"`
	TotalCost    float64 `json:"total_cost"`
}

// HourlyStats represents statistics by hour
type HourlyStats struct {
	Hour         int     `json:"hour"`
	Total        int64   `json:"total"`
	Sent         int64   `json:"sent"`
	Delivered    int64   `json:"delivered"`
	Failed       int64   `json:"failed"`
	DeliveryRate float64 `json:"delivery_rate"`
}
