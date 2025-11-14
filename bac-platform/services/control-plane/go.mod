module github.com/abiolaogu/BAC-BOS-AI/services/control-plane

go 1.21

require (
	github.com/abiolaogu/BAC-BOS-AI/shared/go v0.0.0
	github.com/golang-jwt/jwt/v5 v5.2.0
	github.com/google/uuid v1.5.0
	github.com/gorilla/mux v1.8.1
	github.com/jmoiron/sqlx v1.3.5
	github.com/lib/pq v1.10.9
	golang.org/x/crypto v0.18.0
)

replace github.com/abiolaogu/BAC-BOS-AI/shared/go => ../../shared/go
