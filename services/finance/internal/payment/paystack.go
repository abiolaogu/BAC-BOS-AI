package payment

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

type PaystackAdapter struct {
	SecretKey string
}

func NewPaystackAdapter(secretKey string) *PaystackAdapter {
	return &PaystackAdapter{SecretKey: secretKey}
}

func (p *PaystackAdapter) ProcessPayment(ctx context.Context, req *PaymentRequest) (*PaymentResponse, error) {
	// Mock implementation
	// In a real implementation, this would call the Paystack API
	fmt.Printf("Processing Paystack payment for %s: %.2f %s\n", req.Email, req.Amount, req.Currency)

	return &PaymentResponse{
		Success:       true,
		TransactionID: "pstk_" + uuid.New().String(),
		Message:       "Payment processed successfully via Paystack",
	}, nil
}
