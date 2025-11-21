package providers

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nexus-platform/vas/internal/models"
	"github.com/nexus-platform/vas/pkg/cache"
	"github.com/nexus-platform/vas/pkg/queue"
)

// Provider represents a messaging provider interface
type Provider interface {
	Send(ctx context.Context, message *models.Message) (*models.MessageResponse, error)
	GetStatus(ctx context.Context, messageID string) (*models.MessageStatus, error)
	Name() string
	Type() models.ChannelType
}

// ProviderManager manages all messaging providers
type ProviderManager struct {
	smsProviders       map[string]Provider
	whatsappProvider   Provider
	telegramProvider   Provider
	messengerProvider  Provider
	cache              cache.Cache
	queue              queue.Queue
	mu                 sync.RWMutex
	loadBalancer       *LoadBalancer
	healthChecker      *HealthChecker
}

// NewProviderManager creates a new provider manager
func NewProviderManager(cache cache.Cache, queue queue.Queue) *ProviderManager {
	pm := &ProviderManager{
		smsProviders: make(map[string]Provider),
		cache:        cache,
		queue:        queue,
		loadBalancer: NewLoadBalancer(),
		healthChecker: NewHealthChecker(),
	}

	// Start health checker
	go pm.healthChecker.Start(pm)

	return pm
}

// RegisterSMSProvider registers an SMS provider
func (pm *ProviderManager) RegisterSMSProvider(name string, provider Provider) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.smsProviders[name] = provider
	pm.loadBalancer.AddProvider(name, provider)
}

// RegisterWhatsAppProvider registers WhatsApp provider
func (pm *ProviderManager) RegisterWhatsAppProvider(provider Provider) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.whatsappProvider = provider
}

// RegisterTelegramProvider registers Telegram provider
func (pm *ProviderManager) RegisterTelegramProvider(provider Provider) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.telegramProvider = provider
}

// RegisterMessengerProvider registers Messenger provider
func (pm *ProviderManager) RegisterMessengerProvider(provider Provider) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.messengerProvider = provider
}

// SendMessage sends a message through the appropriate provider
func (pm *ProviderManager) SendMessage(ctx context.Context, message *models.Message) (*models.MessageResponse, error) {
	// Generate message ID
	if message.ID == "" {
		message.ID = uuid.New().String()
	}

	// Set timestamp
	message.CreatedAt = time.Now()

	// Select provider based on channel
	var provider Provider
	var err error

	switch message.Channel {
	case models.ChannelSMS:
		provider, err = pm.selectSMSProvider(message)
	case models.ChannelWhatsApp:
		provider = pm.whatsappProvider
	case models.ChannelTelegram:
		provider = pm.telegramProvider
	case models.ChannelMessenger:
		provider = pm.messengerProvider
	default:
		return nil, fmt.Errorf("unsupported channel: %s", message.Channel)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to select provider: %w", err)
	}

	if provider == nil {
		return nil, fmt.Errorf("no provider available for channel: %s", message.Channel)
	}

	// Add to cache (for tracking)
	cacheKey := fmt.Sprintf("message:%s", message.ID)
	pm.cache.Set(ctx, cacheKey, message, 24*time.Hour)

	// Send message
	response, err := provider.Send(ctx, message)
	if err != nil {
		// Update status to failed
		message.Status = models.StatusFailed
		message.Error = err.Error()
		pm.cache.Set(ctx, cacheKey, message, 24*time.Hour)

		// Publish to queue for retry
		pm.queue.Publish("messages.failed", message)

		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	// Update message with response
	message.Status = models.StatusSent
	message.ProviderMessageID = response.ProviderMessageID
	message.Cost = response.Cost
	pm.cache.Set(ctx, cacheKey, message, 24*time.Hour)

	// Publish success event
	pm.queue.Publish("messages.sent", message)

	// Update metrics
	pm.updateMetrics(message, provider, true)

	return response, nil
}

// SendBulkMessages sends multiple messages in parallel
func (pm *ProviderManager) SendBulkMessages(ctx context.Context, messages []*models.Message) ([]*models.MessageResponse, []error) {
	responses := make([]*models.MessageResponse, len(messages))
	errors := make([]error, len(messages))

	// Use worker pool for parallel processing
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 100) // Max 100 concurrent sends

	for i, msg := range messages {
		wg.Add(1)
		go func(index int, message *models.Message) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			response, err := pm.SendMessage(ctx, message)
			responses[index] = response
			errors[index] = err
		}(i, msg)
	}

	wg.Wait()
	return responses, errors
}

// GetMessageStatus retrieves message status
func (pm *ProviderManager) GetMessageStatus(ctx context.Context, messageID string, channel models.ChannelType) (*models.MessageStatus, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("message:%s", messageID)
	var message models.Message
	found, err := pm.cache.Get(ctx, cacheKey, &message)
	if err == nil && found {
		return &models.MessageStatus{
			MessageID:         message.ID,
			Status:            message.Status,
			ProviderMessageID: message.ProviderMessageID,
			DeliveredAt:       message.DeliveredAt,
			Error:             message.Error,
		}, nil
	}

	// Get from provider
	var provider Provider
	switch channel {
	case models.ChannelSMS:
		// Try all SMS providers
		for _, p := range pm.smsProviders {
			status, err := p.GetStatus(ctx, messageID)
			if err == nil {
				return status, nil
			}
		}
	case models.ChannelWhatsApp:
		provider = pm.whatsappProvider
	case models.ChannelTelegram:
		provider = pm.telegramProvider
	case models.ChannelMessenger:
		provider = pm.messengerProvider
	}

	if provider != nil {
		return provider.GetStatus(ctx, messageID)
	}

	return nil, fmt.Errorf("message not found: %s", messageID)
}

// selectSMSProvider selects best SMS provider using load balancer
func (pm *ProviderManager) selectSMSProvider(message *models.Message) (Provider, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if len(pm.smsProviders) == 0 {
		return nil, fmt.Errorf("no SMS providers registered")
	}

	// Use load balancer to select provider
	providerName := pm.loadBalancer.SelectProvider(message)
	provider, ok := pm.smsProviders[providerName]
	if !ok {
		// Fallback to first available
		for _, p := range pm.smsProviders {
			return p, nil
		}
	}

	return provider, nil
}

// updateMetrics updates provider metrics
func (pm *ProviderManager) updateMetrics(message *models.Message, provider Provider, success bool) {
	pm.loadBalancer.UpdateMetrics(provider.Name(), success, message.Cost)
}

// LoadBalancer handles provider selection and failover
type LoadBalancer struct {
	providerMetrics map[string]*ProviderMetrics
	mu              sync.RWMutex
}

type ProviderMetrics struct {
	TotalRequests  int64
	SuccessCount   int64
	FailureCount   int64
	TotalCost      float64
	AvgLatency     time.Duration
	LastUsed       time.Time
	HealthScore    float64
}

func NewLoadBalancer() *LoadBalancer {
	return &LoadBalancer{
		providerMetrics: make(map[string]*ProviderMetrics),
	}
}

func (lb *LoadBalancer) AddProvider(name string, provider Provider) {
	lb.mu.Lock()
	defer lb.mu.Unlock()
	lb.providerMetrics[name] = &ProviderMetrics{
		HealthScore: 100.0,
	}
}

// SelectProvider selects best provider based on metrics
func (lb *LoadBalancer) SelectProvider(message *models.Message) string {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	var bestProvider string
	var bestScore float64

	for name, metrics := range lb.providerMetrics {
		score := lb.calculateScore(metrics)
		if score > bestScore {
			bestScore = score
			bestProvider = name
		}
	}

	return bestProvider
}

func (lb *LoadBalancer) calculateScore(metrics *ProviderMetrics) float64 {
	if metrics.TotalRequests == 0 {
		return 100.0 // New provider, give it a chance
	}

	successRate := float64(metrics.SuccessCount) / float64(metrics.TotalRequests)

	// Score based on success rate, health, and recent usage
	score := (successRate * 70) + (metrics.HealthScore * 0.3)

	// Penalize if used recently (load distribution)
	if time.Since(metrics.LastUsed) < 1*time.Second {
		score *= 0.8
	}

	return score
}

func (lb *LoadBalancer) UpdateMetrics(providerName string, success bool, cost float64) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	metrics, ok := lb.providerMetrics[providerName]
	if !ok {
		return
	}

	metrics.TotalRequests++
	metrics.LastUsed = time.Now()
	metrics.TotalCost += cost

	if success {
		metrics.SuccessCount++
		metrics.HealthScore = min(100.0, metrics.HealthScore+0.1)
	} else {
		metrics.FailureCount++
		metrics.HealthScore = max(0.0, metrics.HealthScore-1.0)
	}
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// HealthChecker monitors provider health
type HealthChecker struct {
	interval time.Duration
}

func NewHealthChecker() *HealthChecker {
	return &HealthChecker{
		interval: 30 * time.Second,
	}
}

func (hc *HealthChecker) Start(pm *ProviderManager) {
	ticker := time.NewTicker(hc.interval)
	defer ticker.Stop()

	for range ticker.C {
		hc.checkHealth(pm)
	}
}

func (hc *HealthChecker) checkHealth(pm *ProviderManager) {
	// Implement health check logic
	// Send test messages, check response times, etc.
	// Update provider health scores
}
