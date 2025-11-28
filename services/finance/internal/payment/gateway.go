package payment

import "context"

type PaymentRequest struct {
	Amount      float64
	Currency    string
	Description string
	Reference   string
	Email       string
	Provider    string // "stripe" or "paystack"
}

type PaymentResponse struct {
	Success       bool
	TransactionID string
	PaymentURL    string // For redirect-based flows
	Message       string
}

type PaymentGateway interface {
	ProcessPayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error)
}
