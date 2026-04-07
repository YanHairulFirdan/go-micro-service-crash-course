---
title: Pengenalan
sidebar_position: 2
slug: /getting-started/pengenalan
pagination_prev: getting-started/instalasi
pagination_next: reference/glosarium
---

# Pendahuluan & Arsitektur

## Gambaran Sistem

Panduan ini membangun sistem e-commerce sederhana terdiri dari tiga repository terpisah yang berkomunikasi satu sama lain. Setiap service berjalan independen, bisa dideploy secara terpisah, dan berkomunikasi melalui dua protokol: gRPC untuk komunikasi sinkron antar-service, dan Kafka untuk event streaming asinkron.

## Tentang Proyek Ini

Proyek yang dibangun di course ini adalah backend e-commerce sederhana dengan fokus pada alur bisnis inti, bukan pada fitur frontend. Pembaca akan membuat beberapa service kecil yang masing-masing punya tanggung jawab jelas:

- `product-service` untuk menyimpan data produk dan stok
- `order-service` untuk membuat order dan memvalidasi stok
- `api-gateway` untuk menjadi pintu masuk semua HTTP request dari client
- `proto-definitions` untuk menyimpan kontrak `.proto` yang dipakai bersama

Tujuan course ini bukan hanya menghasilkan aplikasi yang berjalan, tetapi juga memperkenalkan cara berpikir microservices secara praktis:

- memisahkan tanggung jawab per service
- memakai kontrak data yang eksplisit
- membedakan komunikasi sinkron dan asinkron
- menyiapkan deployment yang lebih realistis dengan Docker Compose

Di akhir course, kamu akan punya satu sistem kecil yang sudah mencakup banyak konsep inti backend modern: REST API, gRPC, Kafka, API Gateway, database terpisah, dan containerization.

## Hasil Akhir yang Diharapkan

Setelah seluruh materi selesai, sistem yang kamu bangun seharusnya mampu menjalankan alur berikut:

1. client mengirim request ke API Gateway
2. Gateway meneruskan request ke service yang sesuai
3. Order Service memanggil Product Service via gRPC untuk validasi stok
4. setelah order dibuat, event dikirim ke Kafka
5. Product Service menerima event tersebut dan memperbarui stok
6. semua service dapat dijalankan bersama melalui Docker Compose

Dengan kata lain, pembaca tidak hanya belajar potongan-potongan teknis, tetapi membangun satu sistem end-to-end yang saling terhubung.

|     | Service             | Port HTTP | Port gRPC | Keterangan                 |
| --- | ------------------- | --------- | --------- | -------------------------- |
| 🛍️  | **Product Service** | `:8081`   | `:9091`   | Manajemen produk & stok    |
| 📦  | **Order Service**   | `:8082`   | `:9092`   | Pembuatan & tracking order |
| 🌐  | **API Gateway**     | `:8080`   | —         | Entry point semua request  |

---

## Alur Komunikasi

```
Client (HTTP)
     │
     ▼
API Gateway :8080  (Fiber — repo: api-gateway)
     │
     ├── /api/products/**  ──►  Product Service :8081  (HTTP Proxy)
     │                               │
     │                               └── gRPC Server :9091
     │                                        ▲
     └── /api/orders/**   ──►  Order Service :8082  (HTTP Proxy)
                                     │
                                     ├── gRPC Client  ──►  Product Service :9091
                                     │   (validasi stok sebelum buat order)
                                     │
                                     └── Kafka Producer  ──►  Topic: order-events
                                                                      │
                                                               Kafka Consumer
                                                              (Product Service)
                                                               (update stok)
```

---

## Tech Stack

| Komponen             | Teknologi               | Keterangan                 |
| -------------------- | ----------------------- | -------------------------- |
| **Language**         | Go (ikuti versi di `go.mod`) | Bahasa utama semua service |
| **HTTP Framework**   | Fiber v3                | Routing dan middleware     |
| **ORM**              | GORM v2                 | Database access layer      |
| **Database**         | PostgreSQL 15           | Satu DB per service        |
| **gRPC**             | google.golang.org/grpc  | Komunikasi antar-service   |
| **Protobuf**         | protoc + protoc-gen-go  | Schema definisi gRPC       |
| **Message Broker**   | Apache Kafka            | Event streaming async      |
| **Containerization** | Docker + Docker Compose | Orchestrasi semua service  |
| **Git Strategy**     | Git Submodules          | Proto shared across repos  |

---

## Prasyarat Instalasi

Pastikan semua tools berikut sudah terinstall sebelum memulai:

```bash
# Cek versi Go
# Gunakan versi yang sama atau lebih baru dari baris `go` pada `go.mod` tiap service
go version

# Install protoc (Protocol Buffer Compiler)
# macOS:
brew install protobuf
# Ubuntu/Debian:
sudo apt install -y protobuf-compiler

# Install Go plugins untuk protoc
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Pastikan $GOPATH/bin ada di PATH
export PATH="$PATH:$(go env GOPATH)/bin"

# Install Docker Desktop (download dari docker.com)
docker --version
docker compose version

# Install Git
git --version
```

---

## Struktur Repository (3 Repo Terpisah)

> **📌 INFO:** Tanpa monorepo — setiap service adalah repository Git yang berdiri sendiri. Ada satu repo tambahan khusus untuk file `.proto` yang di-share via Git Submodules.

### Struktur di GitHub / GitLab

```
GitHub / GitLab:
├── proto-definitions/    ← Shared .proto files (repo tersendiri)
├── product-service/      ← Service product (repo tersendiri)
├── order-service/        ← Service order (repo tersendiri)
└── api-gateway/          ← API Gateway (repo tersendiri)
```

### Struktur Lokal di Komputer

```
~/microservices/
├── proto-definitions/    ← git clone repo proto
├── product-service/      ← git clone repo product
│   └── proto/            ← git submodule → proto-definitions
├── order-service/        ← git clone repo order
│   └── proto/            ← git submodule → proto-definitions
└── api-gateway/          ← git clone repo gateway
```

---

## Roadmap Hari per Hari

| Hari  | Topik                    | Cakupan                                                                |
| ----- | ------------------------ | ---------------------------------------------------------------------- |
| **1** | Product Service          | Go Modules · Fiber · GORM · PostgreSQL · REST API                      |
| **2** | Order Service & Protobuf | Order Service · Schema `.proto` · Kompilasi Protobuf · Git Submodules  |
| **3** | Implementasi gRPC        | gRPC Server (Product) · gRPC Client (Order) · Komunikasi Antar Service |
| **4** | Kafka Event Streaming    | Producer · Consumer · Sinkronisasi stok via event                      |
| **5** | API Gateway              | Reverse proxy · Routing masuk · Single entry point                     |
| **6** | Docker Compose           | Build image · Multi-stage Dockerfile · Orchestration                   |
| **7** | Integrasi & Testing      | End-to-end flow · Health checks · Troubleshooting                      |

Hari pertama kita membangun fondasi: Product Service yang menyediakan CRUD sederhana untuk data produk. Ini adalah service pertama dan paling fundamental dalam sistem kita.
