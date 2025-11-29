package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"nexus-finance-service/internal/payment"
)

type PaymentHandler struct {
	stripe   *payment.StripeAdapter
	paystack *payment.PaystackAdapter
}

func (h *PaymentHandler) HandlePayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req payment.PaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var resp *payment.PaymentResponse
	var err error

	switch req.Provider {
	case "stripe":
		resp, err = h.stripe.ProcessPayment(r.Context(), &req)
	case "paystack":
		resp, err = h.paystack.ProcessPayment(r.Context(), &req)
	default:
		http.Error(w, "Unsupported provider", http.StatusBadRequest)
		return
	}

	if err != nil {
		log.Printf("Payment failed: %v", err)
		http.Error(w, "Payment failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	stripeKey := os.Getenv("STRIPE_SECRET_KEY")
	paystackKey := os.Getenv("PAYSTACK_SECRET_KEY")

	handler := &PaymentHandler{
		stripe:   payment.NewStripeAdapter(stripeKey),
		paystack: payment.NewPaystackAdapter(paystackKey),
	}

	http.HandleFunc("/api/v1/payments", handler.HandlePayment)
	http.HandleFunc("/api/v1/webhooks/stripe", handler.HandleStripeWebhook)
	http.HandleFunc("/api/v1/webhooks/paystack", handler.HandlePaystackWebhook)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Finance Service starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func (h *PaymentHandler) HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	// In a real implementation, verify the signature using STRIPE_WEBHOOK_SECRET
	// signature := r.Header.Get("Stripe-Signature")

	var event map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Received Stripe Webhook: %v", event["type"])

	// Process event (mock logic)
	w.WriteHeader(http.StatusOK)
}

func (h *PaymentHandler) HandlePaystackWebhook(w http.ResponseWriter, r *http.Request) {
	// In a real implementation, verify the signature using PAYSTACK_SECRET_KEY (HMAC SHA512)
	// signature := r.Header.Get("x-paystack-signature")

	var event map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Received Paystack Webhook: %v", event["event"])

	// Process event (mock logic)
	w.WriteHeader(http.StatusOK)
}
