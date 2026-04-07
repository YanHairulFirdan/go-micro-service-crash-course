---
title: Docker Compose dan Containerization
sidebar_position: 6
slug: /learning-path/hari-6-docker-compose
pagination_prev: learning-path/hari-5-api-gateway
pagination_next: learning-path/hari-7-integrasi-testing
---

# Hari 6 — Docker Compose & Containerization

---

## 6.1 Dockerfile untuk Setiap Service

Pola Dockerfile sama untuk semua service Go — menggunakan multi-stage build untuk image yang lebih kecil.

**File: `Dockerfile` (di setiap service — product-service, order-service, api-gateway)**

```dockerfile
# Stage 1: Build
FROM golang:1.26.1-alpine AS builder

# Install git untuk submodules
RUN apk add --no-cache git

WORKDIR /app

# Copy go.mod dan go.sum dulu (cache layer untuk dependency)
COPY go.mod go.sum ./
RUN go mod download

# Copy semua source code termasuk submodule proto
COPY . .

# Build binary (CGO disabled untuk static binary di Alpine)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server/main.go

# Stage 2: Runtime
# Gunakan image yang sangat kecil
FROM alpine:3.19

# Install ca-certificates untuk HTTPS calls
RUN apk --no-cache add ca-certificates tzdata

# Set timezone ke WIB
ENV TZ=Asia/Jakarta

WORKDIR /root/

# Copy binary dari stage build
COPY --from=builder /app/main .

# Expose port (dokumentasi saja, tidak benar-benar membuka port)
EXPOSE 8081

# Jalankan binary
CMD ["./main"]
```

> **Catatan versi Go:** image builder harus memakai versi Go yang sama atau lebih baru dari baris `go` pada `go.mod`. Jika `go.mod` berisi `go 1.26.1`, maka `FROM golang:1.22-alpine` akan gagal saat `go mod download`.

---

## 6.2 `.dockerignore`

**File: `.dockerignore` (di setiap service)**

```
.git
.gitignore
.env
*.md
tmp/
vendor/
```

---

## 6.3 Docker Compose — Orchestrasi Semua Service

> **📌 INFO:** File `docker-compose.yml` bisa diletakkan di root folder `~/microservices/` atau di salah satu repo. Karena tanpa monorepo, kita letakkan di folder terpisah `docker-compose-config` atau di luar semua repo.

**File: `docker-compose.yml`**

```yaml
version: "3.9"

services:
  # ============== INFRASTRUCTURE ==============

  postgres-product:
    image: postgres:15-alpine
    container_name: postgres-product
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: product_db
    volumes:
      - postgres_product_data:/var/lib/postgresql/data
    ports:
      - "5433:5432" # Host:Container (beda port agar tidak konflik)
    networks:
      - microservices-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-order:
    image: postgres:15-alpine
    container_name: postgres-order
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: order_db
    volumes:
      - postgres_order_data:/var/lib/postgresql/data
    ports:
      - "5434:5432"
    networks:
      - microservices-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - microservices-net

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: "zookeeper:2181"
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "29092:29092" # Untuk akses dari host (development)
    networks:
      - microservices-net
    healthcheck:
      test:
        [
          "CMD",
          "kafka-broker-api-versions",
          "--bootstrap-server",
          "localhost:9092",
        ]
      interval: 30s
      timeout: 10s
      retries: 5

  # ============== MICROSERVICES ==============

  product-service:
    build:
      context: ../product-service # Path relatif ke repo product-service
      dockerfile: Dockerfile
    container_name: product-service
    environment:
      APP_PORT: "8081"
      GRPC_PORT: "9091"
      DB_HOST: postgres-product
      DB_PORT: "5432"
      DB_USER: postgres
      DB_PASSWORD: secret
      DB_NAME: product_db
      DB_SSLMODE: disable
      KAFKA_BROKER: "kafka:9092"
    ports:
      - "8081:8081" # HTTP
      - "9091:9091" # gRPC
    depends_on:
      postgres-product:
        condition: service_healthy
      kafka:
        condition: service_healthy
    networks:
      - microservices-net
    restart: unless-stopped

  order-service:
    build:
      context: ../order-service
      dockerfile: Dockerfile
    container_name: order-service
    environment:
      APP_PORT: "8082"
      DB_HOST: postgres-order
      DB_PORT: "5432"
      DB_USER: postgres
      DB_PASSWORD: secret
      DB_NAME: order_db
      DB_SSLMODE: disable
      PRODUCT_GRPC_ADDR: "product-service:9091"
      KAFKA_BROKER: "kafka:9092"
    ports:
      - "8082:8082"
    depends_on:
      postgres-order:
        condition: service_healthy
      product-service:
        condition: service_started
      kafka:
        condition: service_healthy
    networks:
      - microservices-net
    restart: unless-stopped

  api-gateway:
    build:
      context: ../api-gateway
      dockerfile: Dockerfile
    container_name: api-gateway
    environment:
      APP_PORT: "8080"
      PRODUCT_SERVICE_URL: "http://product-service:8081"
      ORDER_SERVICE_URL: "http://order-service:8082"
    ports:
      - "8080:8080" # Satu-satunya port yang diekspose ke luar!
    depends_on:
      - product-service
      - order-service
    networks:
      - microservices-net
    restart: unless-stopped

  # ============== NETWORKS & VOLUMES ==============

networks:
  microservices-net:
    driver: bridge

volumes:
  postgres_product_data:
  postgres_order_data:
```

---

## 6.4 Build dan Jalankan Semua Service

```bash
# Struktur folder yang diharapkan:
# ~/microservices/
# ├── proto-definitions/
# ├── product-service/
# ├── order-service/
# ├── api-gateway/
# └── docker-compose.yml   ← file kita

cd ~/microservices

# Clone setiap repo dengan submodules
git clone --recurse-submodules https://github.com/yourusername/product-service.git
git clone --recurse-submodules https://github.com/yourusername/order-service.git
git clone https://github.com/yourusername/api-gateway.git

# Build semua image Docker
docker compose build

# Jalankan semua service
docker compose up -d

# Lihat status semua container
docker compose ps

# Lihat log semua service (Ctrl+C untuk keluar)
docker compose logs -f

# Lihat log service tertentu
docker compose logs -f product-service
docker compose logs -f order-service

# Stop semua service
docker compose down

# Stop dan hapus volume (reset database)
docker compose down -v
```

---

> **✅ Checkpoint Hari 6:** Semua service berjalan dalam Docker container yang terhubung satu network. Database masing-masing terisolasi. Hanya port 8080 (API Gateway) yang diekspose ke luar.

---

## Hari 7 — Integrasi & Testing

**Cakupan:** End-to-End Test · Health Checks · Troubleshooting · Best Practices

Hari terakhir: kita test seluruh sistem end-to-end, pastikan semua komponen terhubung dengan benar, dan pelajari cara troubleshoot ketika ada masalah.
