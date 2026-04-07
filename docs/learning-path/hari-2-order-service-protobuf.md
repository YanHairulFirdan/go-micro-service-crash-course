---
title: Order Service dan Protobuf
sidebar_position: 2
slug: /learning-path/hari-2-order-service-protobuf
pagination_prev: learning-path/hari-1-setup-product-service
pagination_next: learning-path/hari-3-grpc-communication
---

# Hari 2 — Order Service & Protobuf

## 2.1 Kenapa Protobuf & Git Submodules?

Dalam arsitektur microservice, dua service yang berkomunikasi via gRPC harus sepakat tentang format data. Protobuf adalah bahasa definisi skema yang di-compile menjadi kode Go. Agar file `.proto` tidak duplikat di setiap repo, kita simpan di satu repo terpisah dan gunakan sebagai Git Submodule.

---

## 2.2 Setup Proto Repository

```bash
# Buat repo proto-definitions (di GitHub/GitLab dulu, lalu clone)
mkdir proto-definitions && cd proto-definitions
git init

# Buat struktur direktori proto
mkdir -p product order

# Buat file .gitignore
# Untuk course ini, file generated DI-COMMIT agar service yang memakai submodule
# langsung mendapat kode Go hasil generate tanpa perlu generate ulang sendiri.
touch .gitignore
```

### Struktur Direktori proto-definitions

```
proto-definitions/
├── product/
│   ├── product.proto
│   ├── product.pb.go
│   └── product_grpc.pb.go
├── order/
│   ├── order.proto
│   ├── order.pb.go
│   └── order_grpc.pb.go
├── Makefile
└── .gitignore
```

**File: `product/product.proto`**

```protobuf
syntax = "proto3";

// Package name untuk Go
option go_package = "github.com/yourusername/product-service/proto/product";

package product;

// ProductService mendefinisikan RPC yang bisa dipanggil oleh service lain
service ProductService {
    // Cek apakah stok produk mencukupi untuk order
    rpc CheckStock (CheckStockRequest) returns (CheckStockResponse);

    // Update stok setelah order berhasil
    rpc UpdateStock (UpdateStockRequest) returns (UpdateStockResponse);

    // Ambil detail produk
    rpc GetProduct (GetProductRequest) returns (GetProductResponse);
}

message CheckStockRequest {
    uint64 product_id = 1;
    int32  quantity   = 2;
}

message CheckStockResponse {
    bool   available      = 1;
    string message        = 2;
    int32  current_stock  = 3;
}

message UpdateStockRequest {
    uint64 product_id = 1;
    int32  quantity   = 2; // Negatif untuk kurangi stok
}

message UpdateStockResponse {
    bool   success = 1;
    string message = 2;
}

message GetProductRequest {
    uint64 product_id = 1;
}

message GetProductResponse {
    uint64 id    = 1;
    string name  = 2;
    double price = 3;
    int32  stock = 4;
}
```

**File: `order/order.proto`**

```protobuf
syntax = "proto3";

option go_package = "github.com/yourusername/order-service/proto/order";

package order;

service OrderService {
    rpc GetOrder (GetOrderRequest) returns (GetOrderResponse);
}

message GetOrderRequest {
    uint64 order_id = 1;
}

message GetOrderResponse {
    uint64 id          = 1;
    uint64 product_id  = 2;
    int32  quantity    = 3;
    double total_price = 4;
    string status      = 5; // "pending", "confirmed", "cancelled"
}
```

**File: `Makefile` (di `proto-definitions/`)**

```makefile
# Makefile untuk kompilasi semua .proto file
.PHONY: generate clean

generate:
	@echo 'Generating Go code dari .proto files...'
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       product/product.proto
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       order/order.proto
	@echo 'Selesai! File *.pb.go berhasil dibuat.'

clean:
	rm -f product/*.pb.go order/*.pb.go
```

---

## 2.3 Compile Protobuf

> **Workflow yang dipakai di course ini:** generate file Go dilakukan di repo `proto-definitions`, lalu file hasil generate seperti `*.pb.go` dan `*_grpc.pb.go` ikut di-commit di repo tersebut. Dengan begitu `product-service` dan `order-service` cukup menarik update lewat Git Submodule, tanpa harus menjalankan `protoc` ulang di tiap service.

```bash
# Masuk ke direktori proto-definitions
cd proto-definitions

# Jalankan kompilasi
make generate

# File yang dihasilkan:
# product/product.pb.go        ← struct messages
# product/product_grpc.pb.go   ← interface client & server
# order/order.pb.go
# order/order_grpc.pb.go

# Commit file proto BESERTA file hasil generate Go
git add .
git commit -m "feat: add product and order proto definitions and generated Go code"
git remote add origin https://github.com/yourusername/proto-definitions.git
git push -u origin main
```

### Kenapa file generated perlu di-commit?

- `product-service` dan `order-service` memakai `proto-definitions` sebagai submodule.
- Kode Go seperti `product.pb.go` dibutuhkan saat proses `go build`.
- Jika file generated tidak di-commit, setiap developer harus generate ulang sendiri di masing-masing environment sebelum build, dan itu mudah membuat setup course jadi gagal atau tidak konsisten.

### Kapan harus generate ulang?

Setiap kali file `.proto` berubah:

```bash
cd proto-definitions
make generate
git add .
git commit -m "chore: regenerate protobuf Go files"
git push
```

Setelah itu, di setiap service yang memakai submodule:

```bash
cd product-service
git submodule update --remote --merge
git add proto
git commit -m "chore: update proto submodule"

# Ulangi juga di order-service
```

### Alternatif: generate di masing-masing service

Pendekatan lain yang kadang dipakai di production adalah menyimpan hanya file `.proto` di `proto-definitions`, lalu menjalankan `protoc` di masing-masing service. Dengan pendekatan itu:

- `product-service` menghasilkan file Go miliknya sendiri
- `order-service` juga menghasilkan file Go miliknya sendiri
- repo `proto-definitions` hanya menjadi sumber schema, bukan sumber kode hasil generate

Namun untuk course ini pendekatan tersebut tidak dipilih karena beberapa alasan:

- setup awal jadi lebih panjang karena setiap service harus punya toolchain `protoc`, `protoc-gen-go`, dan `protoc-gen-go-grpc`
- langkah build menjadi lebih mudah gagal jika developer lupa generate ulang
- materi belajar jadi bercampur antara konsep protobuf dan detail build pipeline

Jadi untuk kebutuhan course, generate terpusat di `proto-definitions` lebih sederhana, lebih mudah diikuti, dan lebih konsisten.

---

## 2.4 Setup Git Submodules

> **📌 INFO:** Git Submodule memungkinkan satu repository menyertakan repository lain sebagai direktori di dalamnya. Ketika `proto-definitions` diupdate, semua service cukup jalankan `git submodule update` untuk mendapat perubahan terbaru.

```bash
# Di dalam product-service repo:
cd product-service

# Tambahkan proto-definitions sebagai submodule di direktori 'proto'
git submodule add https://github.com/yourusername/proto-definitions.git proto

# Ini akan membuat file .gitmodules:
cat .gitmodules
# [submodule "proto"]
#     path = proto
#     url  = https://github.com/yourusername/proto-definitions.git

# Commit submodule ke repo product-service
git add .gitmodules proto
git commit -m "feat: add proto-definitions as submodule"

# ===== ULANGI untuk order-service =====
cd ../order-service
git init
git submodule add https://github.com/yourusername/proto-definitions.git proto
git add .gitmodules proto
git commit -m "feat: add proto-definitions as submodule"

# ===== Cara clone repo dengan submodule =====
# Gunakan --recurse-submodules agar proto ikut ter-clone
git clone --recurse-submodules https://github.com/yourusername/product-service.git

# Jika sudah clone tanpa flag tersebut:
git submodule init
git submodule update
```

---

## 2.5 Order Service — Setup

```bash
# Inisialisasi order-service
mkdir order-service && cd order-service
go mod init github.com/yourusername/order-service

go get github.com/gofiber/fiber/v3
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/joho/godotenv
go get google.golang.org/grpc
go get google.golang.org/protobuf
go get github.com/segmentio/kafka-go

mkdir -p cmd/server
mkdir -p internal/{config,handler,model,repository,service}
```

### Struktur Direktori Order Service

```
order-service/
├── cmd/
│   └── server/
│       └── main.go                  ← Entry point aplikasi
├── internal/
│   ├── config/
│   │   └── config.go                ← Konfigurasi app & DB
│   ├── model/
│   │   └── order.go                 ← GORM model
│   ├── repository/
│   │   └── order_repo.go            ← Database operations
│   ├── service/
│   │   └── order_svc.go             ← Business logic + gRPC client
│   └── handler/
│       └── order_handler.go         ← HTTP handlers (Fiber)
├── proto/                           ← Git submodule → proto-definitions
│   ├── product/
│   │   ├── product.pb.go
│   │   └── product_grpc.pb.go
│   └── order/
│       ├── order.pb.go
│       └── order_grpc.pb.go
├── .env
├── .gitignore
├── .gitmodules
├── Dockerfile
└── go.mod
```

**File: `internal/model/order.go`**

```go
package model

import (
    "time"

    "gorm.io/gorm"
)

type OrderStatus string

const (
    StatusPending   OrderStatus = "pending"
    StatusConfirmed OrderStatus = "confirmed"
    StatusCancelled OrderStatus = "cancelled"
)

type Order struct {
    ID         uint           `gorm:"primaryKey;autoIncrement" json:"id"`
    ProductID  uint           `gorm:"not null" json:"product_id"`
    Quantity   int            `gorm:"not null" json:"quantity"`
    TotalPrice float64        `gorm:"not null" json:"total_price"`
    Status     OrderStatus    `gorm:"type:varchar(20);default:pending" json:"status"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreateOrderRequest struct {
    ProductID uint `json:"product_id" validate:"required"`
    Quantity  int  `json:"quantity" validate:"required,gt=0"`
}

// OrderEvent adalah pesan yang dikirim ke Kafka
type OrderEvent struct {
    OrderID   uint        `json:"order_id"`
    ProductID uint        `json:"product_id"`
    Quantity  int         `json:"quantity"`
    Status    OrderStatus `json:"status"`
}
```

---

> **✅ Checkpoint Hari 2:** File `.proto` sudah dibuat dan dikompilasi. Git Submodules sudah setup di `product-service` dan `order-service`. Order Service sudah punya model dasar. Besok kita implementasi gRPC!

---

## Hari 3 — Implementasi gRPC

**Cakupan:** gRPC Server (Product) · gRPC Client (Order) · Komunikasi Antar Service

Hari ini adalah inti dari komunikasi antar-service. Order Service akan memanggil Product Service via gRPC untuk validasi stok sebelum membuat order. Ini adalah komunikasi sinkron — Order Service menunggu jawaban dari Product Service.
