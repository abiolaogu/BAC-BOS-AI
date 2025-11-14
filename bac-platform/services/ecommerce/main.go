package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
)

// eCommerce Service - Products, Orders, Payments, Cart, Fulfillment
func main() {
	router := mux.NewRouter()

	// Product Catalog
	router.HandleFunc("/api/v1/products", createProduct).Methods("POST")
	router.HandleFunc("/api/v1/products/{id}", getProduct).Methods("GET")
	router.HandleFunc("/api/v1/products/{id}", updateProduct).Methods("PUT")
	router.HandleFunc("/api/v1/products", listProducts).Methods("GET")
	router.HandleFunc("/api/v1/categories", createCategory).Methods("POST")
	router.HandleFunc("/api/v1/categories", listCategories).Methods("GET")

	// Shopping Cart
	router.HandleFunc("/api/v1/cart", getCart).Methods("GET")
	router.HandleFunc("/api/v1/cart/items", addToCart).Methods("POST")
	router.HandleFunc("/api/v1/cart/items/{id}", updateCartItem).Methods("PUT")
	router.HandleFunc("/api/v1/cart/items/{id}", removeFromCart).Methods("DELETE")

	// Orders
	router.HandleFunc("/api/v1/orders", createOrder).Methods("POST")
	router.HandleFunc("/api/v1/orders/{id}", getOrder).Methods("GET")
	router.HandleFunc("/api/v1/orders", listOrders).Methods("GET")

	// Payments
	router.HandleFunc("/api/v1/payments", processPayment).Methods("POST")
	router.HandleFunc("/api/v1/payments/{id}/refund", refundPayment).Methods("POST")

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"status":"healthy"}`)) }).Methods("GET")

	srv := &http.Server{Addr: ":8083", Handler: router}
	go func() {
		log.Println("eCommerce Service starting on :8083")
		srv.ListenAndServe()
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

func createProduct(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id":"uuid","sku":"PROD-001"}`)) }
func getProduct(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id":"uuid","name":"Product"}`)) }
func updateProduct(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message":"Updated"}`)) }
func listProducts(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"products":[]}`)) }
func createCategory(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id":"uuid"}`)) }
func listCategories(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"categories":[]}`)) }
func getCart(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"items":[],"total":0}`)) }
func addToCart(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message":"Added"}`)) }
func updateCartItem(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message":"Updated"}`)) }
func removeFromCart(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message":"Removed"}`)) }
func createOrder(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id":"uuid","order_number":"ORD-001"}`)) }
func getOrder(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"id":"uuid","status":"pending"}`)) }
func listOrders(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"orders":[]}`)) }
func processPayment(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"transaction_id":"uuid","status":"success"}`)) }
func refundPayment(w http.ResponseWriter, r *http.Request) { w.Write([]byte(`{"message":"Refunded"}`)) }
