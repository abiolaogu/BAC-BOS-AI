package payment

import (
	"context"
	"testing"
)

func TestStripeAdapter_ProcessPayment(t *testing.T) {
	adapter := NewStripeAdapter("sk_test_123")

	req := &PaymentRequest{
		Amount:      100.00,
		Currency:    "USD",
		Description: "Test Payment",
		Email:       "test@example.com",
		Provider:    "stripe",
	}

	resp, err := adapter.ProcessPayment(context.Background(), req)
	if err != nil {
		t.Fatalf("ProcessPayment failed: %v", err)
	}

	if !resp.Success {
		t.Error("Expected payment to be successful")
	}

	if resp.TransactionID == "" {
		t.Error("Expected TransactionID to be set")
	}

	if resp.Message == "" {
		t.Error("Expected Message to be set")
	}
}
