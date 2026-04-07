---
title: Integrasi dan Testing
sidebar_position: 7
slug: /learning-path/hari-7-integrasi-testing
pagination_prev: learning-path/hari-6-docker-compose
---

# Hari 7 — Integrasi & Testing

---

## 7.1 Verifikasi Sistem Berjalan

```bash
# Cek semua container berjalan
docker compose ps

# Output yang diharapkan:
# NAME               STATUS           PORTS
# api-gateway        Up               0.0.0.0:8080->8080/tcp
# product-service    Up               0.0.0.0:8081->8081/tcp, 0.0.0.0:9091->9091/tcp
# order-service      Up               0.0.0.0:8082->8082/tcp
# postgres-product   Up (healthy)     0.0.0.0:5433->5432/tcp
# postgres-order     Up (healthy)     0.0.0.0:5434->5432/tcp
# kafka              Up (healthy)     0.0.0.0:29092->29092/tcp
# zookeeper          Up

# Cek health semua service lewat gateway
curl http://localhost:8080/health
curl http://localhost:8081/health
curl http://localhost:8082/health
```

---

## 7.2 End-to-End Test Flow Lengkap

**File: `e2e-test.sh`**

```bash
#!/bin/bash

# Script test end-to-end
# Semua request melalui API Gateway di port 8080

BASE_URL='http://localhost:8080/api'

echo '=== 1. Buat Produk ==='
PRODUCT=$(curl -s -X POST $BASE_URL/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"MacBook Pro","description":"Laptop developer","price":25000000,"stock":5}')
echo $PRODUCT
PRODUCT_ID=$(echo $PRODUCT | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "Product ID: $PRODUCT_ID"
echo ''

echo '=== 2. Lihat Semua Produk ==='
curl -s $BASE_URL/products | python3 -m json.tool
echo ''

echo '=== 3. Buat Order (gRPC + Kafka akan terpicu) ==='
ORDER=$(curl -s -X POST $BASE_URL/orders \
  -H 'Content-Type: application/json' \
  -d "{\"product_id\":$PRODUCT_ID,\"quantity\":2}")
echo $ORDER
ORDER_ID=$(echo $ORDER | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo ''

echo '=== 4. Cek Stok Produk (harus berkurang dari 5 → 3) ==='
sleep 1  # Tunggu Kafka consumer proses event
curl -s $BASE_URL/products/$PRODUCT_ID | python3 -m json.tool
echo ''

echo '=== 5. Lihat Detail Order ==='
curl -s $BASE_URL/orders/$ORDER_ID | python3 -m json.tool
echo ''

echo '=== 6. Test Order dengan stok tidak cukup ==='
curl -s -X POST $BASE_URL/orders \
  -H 'Content-Type: application/json' \
  -d "{\"product_id\":$PRODUCT_ID,\"quantity\":100}"
echo ''

echo '=== Test Selesai! ==='
```

---

## 7.3 Monitoring & Logs

```bash
# Monitor log Kafka consumer (Product Service)
# Perhatikan log ketika ada order masuk
docker compose logs -f product-service | grep -E 'Kafka|event|stok'

# Monitor gRPC calls
docker compose logs -f order-service | grep -E 'gRPC|CheckStock|GetProduct'

# Cek messages di Kafka topic
docker exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic order-events \
  --from-beginning

# List semua topic Kafka
docker exec kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --list

# Cek database product
docker exec -it postgres-product psql -U postgres -d product_db \
  -c 'SELECT id, name, stock FROM products;'

# Cek database order
docker exec -it postgres-order psql -U postgres -d order_db \
  -c 'SELECT id, product_id, quantity, total_price, status FROM orders;'
```

---

## 7.4 Troubleshooting Guide

| Masalah                          | Kemungkinan Penyebab                          | Solusi                                                                          |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| **Container crash saat startup** | DB belum siap ketika service start            | Tambahkan `depends_on` dengan `healthcheck`, atau tambahkan retry logic di kode |
| **gRPC connection refused**      | Product service belum running atau port salah | Cek `PRODUCT_GRPC_ADDR` env var, pastikan format `host:port` tanpa `http://`    |
| **Kafka consumer tidak proses**  | Group ID conflict atau topic belum ada        | Cek `AllowAutoTopicCreation: true`, pastikan `GroupID` unik per service         |
| **API Gateway 502 Bad Gateway**  | Downstream service tidak merespons            | Cek service running: `docker compose ps`, cek URL env var                       |
| **Git submodule kosong**         | Lupa `--recurse-submodules` saat clone        | Jalankan: `git submodule init && git submodule update`                          |
| **go.sum mismatch**              | Dependency berubah tapi go.sum tidak diupdate | Jalankan: `go mod tidy`                                                         |
| **Port already in use**          | Port dipakai proses lain                      | Cek: `lsof -i :8080`, atau ganti port di `.env`                                 |

---

## 7.5 Ringkasan Apa yang Sudah Dibangun

| ✓   | Komponen            | Detail                                                                      |
| --- | ------------------- | --------------------------------------------------------------------------- |
| ✓   | **Product Service** | CRUD produk, REST API Fiber, GORM + PostgreSQL, gRPC Server, Kafka Consumer |
| ✓   | **Order Service**   | Buat order, validasi stok via gRPC, Kafka Producer, GORM + PostgreSQL       |
| ✓   | **API Gateway**     | Single entry point, routing ke downstream, Fiber proxy, CORS                |
| ✓   | **Protobuf**        | Schema `.proto` untuk Product & Order service, dikompilasi ke Go code       |
| ✓   | **gRPC**            | Server di Product, Client di Order, komunikasi sinkron antar-service        |
| ✓   | **Kafka**           | Topic `order-events`, Producer di Order, Consumer di Product (update stok)  |
| ✓   | **Docker Compose**  | 8 container (2 PG, Kafka, Zookeeper, 3 service), 1 network, healthchecks    |
| ✓   | **Git Submodules**  | `proto-definitions` sebagai submodule di product-service dan order-service  |
| ✓   | **Separated Repos** | 4 repository Git terpisah tanpa monorepo                                    |

---

## 7.6 Langkah Selanjutnya (Setelah 1 Minggu)

- Tambahkan JWT Authentication di API Gateway sebagai middleware
- Implementasi circuit breaker (`go-hystrix` atau `go-resilience`) untuk gRPC calls
- Tambahkan tracing terdistribusi dengan OpenTelemetry + Jaeger
- Setup Prometheus + Grafana untuk monitoring metrics
- Implementasi retry logic dan dead letter queue di Kafka consumer
- Tambahkan unit test dan integration test untuk setiap layer
- Setup CI/CD pipeline dengan GitHub Actions
- Deploy ke Kubernetes (minikube untuk lokal, atau cloud provider)

---

**Selamat! Anda telah membangun sistem microservice lengkap dalam 1 minggu.**

> Product Service · Order Service · API Gateway · gRPC · Kafka · Docker Compose · Git Submodules
