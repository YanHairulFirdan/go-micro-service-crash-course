---
title: Setup Product Service
sidebar_position: 1
pagination_prev: intro
pagination_next: hari-2/order-service-protobuf
---

# Hari 1 — Setup Product Service

## 1.1 Inisialisasi Repository

```bash
# Buat direktori dan inisialisasi git
mkdir product-service && cd product-service
git init

# Inisialisasi Go module
# Ganti 'github.com/yourusername' dengan username GitHub Anda
go mod init github.com/yourusername/product-service

# Install dependencies
go get github.com/gofiber/fiber/v3
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/joho/godotenv

# Buat struktur direktori
mkdir -p cmd/server
mkdir -p internal/{config,handler,model,repository,service}
mkdir -p proto
```

---

## 1.2 Struktur Direktori Product Service

```
product-service/
├── cmd/
│   └── server/
│       └── main.go                  ← Entry point aplikasi
├── internal/
│   ├── config/
│   │   └── config.go                ← Konfigurasi app & DB
│   ├── model/
│   │   └── product.go               ← GORM model
│   ├── repository/
│   │   └── product_repo.go          ← Database operations
│   ├── service/
│   │   └── product_svc.go           ← Business logic
│   └── handler/
│       └── product_handler.go       ← HTTP handlers (Fiber)
├── proto/                           ← Git submodule (Hari 2+)
├── .env                             ← Environment variables
├── .gitignore
├── Dockerfile
└── go.mod
```

---

## 1.3 Konfigurasi Environment

**File: `.env`**

```env
APP_PORT=8081
GRPC_PORT=9091

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=product_db
DB_SSLMODE=disable
```

**File: `internal/config/config.go`**

```go
package config

import (
    "fmt"
    "os"

    "github.com/joho/godotenv"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

type Config struct {
    AppPort  string
    GRPCPort string
    DB       *gorm.DB
}

func Load() (*Config, error) {
    // Load .env file (tidak error jika tidak ada, berarti pakai env system)
    _ = godotenv.Load()

    dsn := fmt.Sprintf(
        "host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
        os.Getenv("DB_HOST"),
        os.Getenv("DB_USER"),
        os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_NAME"),
        os.Getenv("DB_PORT"),
        os.Getenv("DB_SSLMODE"),
    )

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, fmt.Errorf("gagal koneksi database: %w", err)
    }

    return &Config{
        AppPort:  os.Getenv("APP_PORT"),
        GRPCPort: os.Getenv("GRPC_PORT"),
        DB:       db,
    }, nil
}
```

---

## 1.4 Model GORM

**File: `internal/model/product.go`**

```go
package model

import (
    "time"

    "gorm.io/gorm"
)

// Product adalah representasi tabel 'products' di database.
// GORM secara otomatis membuat tabel berdasarkan struct ini.
type Product struct {
    ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
    Name        string         `gorm:"not null;size:255" json:"name"`
    Description string         `gorm:"type:text" json:"description"`
    Price       float64        `gorm:"not null" json:"price"`
    Stock       int            `gorm:"not null;default:0" json:"stock"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName override nama tabel (opsional, GORM default: 'products')
func (Product) TableName() string {
    return "products"
}

// Request/Response DTOs
type CreateProductRequest struct {
    Name        string  `json:"name" validate:"required"`
    Description string  `json:"description"`
    Price       float64 `json:"price" validate:"required,gt=0"`
    Stock       int     `json:"stock" validate:"gte=0"`
}

type UpdateStockRequest struct {
    Quantity int `json:"quantity" validate:"required"`
}
```

---

## 1.5 Repository Layer (GORM)

**File: `internal/repository/product_repo.go`**

```go
package repository

import (
    "github.com/yourusername/product-service/internal/model"
    "gorm.io/gorm"
)

// ProductRepository mendefinisikan kontrak operasi database.
// Menggunakan interface agar mudah di-mock saat testing.
type ProductRepository interface {
    Create(product *model.Product) error
    FindAll() ([]model.Product, error)
    FindByID(id uint) (*model.Product, error)
    Update(product *model.Product) error
    Delete(id uint) error
    UpdateStock(id uint, quantity int) error
}

type productRepository struct {
    db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
    return &productRepository{db: db}
}

func (r *productRepository) Create(product *model.Product) error {
    // GORM: INSERT INTO products (...) VALUES (...)
    return r.db.Create(product).Error
}

func (r *productRepository) FindAll() ([]model.Product, error) {
    var products []model.Product
    // GORM: SELECT * FROM products WHERE deleted_at IS NULL
    err := r.db.Find(&products).Error
    return products, err
}

func (r *productRepository) FindByID(id uint) (*model.Product, error) {
    var product model.Product
    // GORM: SELECT * FROM products WHERE id = ? AND deleted_at IS NULL
    err := r.db.First(&product, id).Error
    if err != nil {
        return nil, err
    }
    return &product, nil
}

func (r *productRepository) Update(product *model.Product) error {
    // GORM: UPDATE products SET ... WHERE id = ?
    return r.db.Save(product).Error
}

func (r *productRepository) Delete(id uint) error {
    // GORM soft delete: UPDATE products SET deleted_at = NOW() WHERE id = ?
    return r.db.Delete(&model.Product{}, id).Error
}

func (r *productRepository) UpdateStock(id uint, quantity int) error {
    // Update stok dengan aman menggunakan atomic operation
    return r.db.Model(&model.Product{}).Where("id = ?", id).
        Update("stock", gorm.Expr("stock + ?", quantity)).Error
}
```

---

## 1.6 Service Layer (Business Logic)

**File: `internal/service/product_svc.go`**

```go
package service

import (
    "errors"

    "github.com/yourusername/product-service/internal/model"
    "github.com/yourusername/product-service/internal/repository"
    "gorm.io/gorm"
)

type ProductService interface {
    CreateProduct(req *model.CreateProductRequest) (*model.Product, error)
    GetAllProducts() ([]model.Product, error)
    GetProductByID(id uint) (*model.Product, error)
    UpdateProduct(id uint, req *model.CreateProductRequest) (*model.Product, error)
    DeleteProduct(id uint) error
    CheckAndUpdateStock(id uint, quantity int) error
}

type productService struct {
    repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) ProductService {
    return &productService{repo: repo}
}

func (s *productService) CreateProduct(req *model.CreateProductRequest) (*model.Product, error) {
    product := &model.Product{
        Name:        req.Name,
        Description: req.Description,
        Price:       req.Price,
        Stock:       req.Stock,
    }
    if err := s.repo.Create(product); err != nil {
        return nil, errors.New("gagal membuat produk")
    }
    return product, nil
}

func (s *productService) GetAllProducts() ([]model.Product, error) {
    return s.repo.FindAll()
}

func (s *productService) GetProductByID(id uint) (*model.Product, error) {
    product, err := s.repo.FindByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, errors.New("produk tidak ditemukan")
        }
        return nil, err
    }
    return product, nil
}

func (s *productService) UpdateProduct(id uint, req *model.CreateProductRequest) (*model.Product, error) {
    product, err := s.GetProductByID(id)
    if err != nil {
        return nil, err
    }
    product.Name = req.Name
    product.Description = req.Description
    product.Price = req.Price
    product.Stock = req.Stock
    if err := s.repo.Update(product); err != nil {
        return nil, errors.New("gagal update produk")
    }
    return product, nil
}

func (s *productService) DeleteProduct(id uint) error {
    _, err := s.GetProductByID(id)
    if err != nil {
        return err
    }
    return s.repo.Delete(id)
}

func (s *productService) CheckAndUpdateStock(id uint, quantity int) error {
    product, err := s.GetProductByID(id)
    if err != nil {
        return err
    }
    if product.Stock < quantity {
        return errors.New("stok tidak mencukupi")
    }
    return s.repo.UpdateStock(id, -quantity)
}
```

---

## 1.7 Handler Layer (Fiber HTTP)

**File: `internal/handler/product_handler.go`**

```go
package handler

import (
    "strconv"

    "github.com/gofiber/fiber/v3"
    "github.com/yourusername/product-service/internal/model"
    "github.com/yourusername/product-service/internal/service"
)

type ProductHandler struct {
    svc service.ProductService
}

func NewProductHandler(svc service.ProductService) *ProductHandler {
    return &ProductHandler{svc: svc}
}

// RegisterRoutes mendaftarkan semua route product ke router Fiber
func (h *ProductHandler) RegisterRoutes(router fiber.Router) {
    products := router.Group("/products")
    products.Get("/", h.GetAll)
    products.Get("/:id", h.GetByID)
    products.Post("/", h.Create)
    products.Put("/:id", h.Update)
    products.Delete("/:id", h.Delete)
}

func (h *ProductHandler) GetAll(c fiber.Ctx) error {
    products, err := h.svc.GetAllProducts()
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": products, "count": len(products)})
}

func (h *ProductHandler) GetByID(c fiber.Ctx) error {
    id, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
    }
    product, err := h.svc.GetProductByID(uint(id))
    if err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": product})
}

func (h *ProductHandler) Create(c fiber.Ctx) error {
    var req model.CreateProductRequest
    if err := c.Bind().Body(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
    }
    product, err := h.svc.CreateProduct(&req)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }
    return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": product, "message": "produk berhasil dibuat"})
}

func (h *ProductHandler) Update(c fiber.Ctx) error {
    id, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
    }
    var req model.CreateProductRequest
    if err := c.Bind().Body(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
    }
    product, err := h.svc.UpdateProduct(uint(id), &req)
    if err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": product, "message": "produk berhasil diupdate"})
}

func (h *ProductHandler) Delete(c fiber.Ctx) error {
    id, err := strconv.ParseUint(c.Params("id"), 10, 32)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID tidak valid"})
    }
    if err := h.svc.DeleteProduct(uint(id)); err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"message": "produk berhasil dihapus"})
}
```

---

## 1.8 Main Entry Point

**File: `cmd/server/main.go`**

```go
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/middleware/logger"
    "github.com/gofiber/fiber/v3/middleware/recover"
    "github.com/yourusername/product-service/internal/config"
    "github.com/yourusername/product-service/internal/handler"
    "github.com/yourusername/product-service/internal/model"
    "github.com/yourusername/product-service/internal/repository"
    "github.com/yourusername/product-service/internal/service"
)

func main() {
    // 1. Load konfigurasi
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Gagal load config: %v", err)
    }

    // 2. Auto migrate database (buat tabel otomatis)
    if err := cfg.DB.AutoMigrate(&model.Product{}); err != nil {
        log.Fatalf("Gagal migrasi DB: %v", err)
    }
    log.Println("Database berhasil dimigrasi")

    // 3. Dependency injection (manual DI)
    productRepo := repository.NewProductRepository(cfg.DB)
    productSvc := service.NewProductService(productRepo)
    productHandler := handler.NewProductHandler(productSvc)

    // 4. Setup Fiber app
    app := fiber.New(fiber.Config{
        AppName: "Product Service v1.0",
    })

    // 5. Middleware
    app.Use(logger.New())  // Log setiap request
    app.Use(recover.New()) // Auto recover dari panic

    // 6. Health check route
    app.Get("/health", func(c fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok", "service": "product-service"})
    })

    // 7. Register API routes
    api := app.Group("/api/v1")
    productHandler.RegisterRoutes(api)

    // 8. Start server
    log.Printf("Product Service berjalan di port %s", cfg.AppPort)
    log.Fatal(app.Listen(":" + cfg.AppPort))
}
```

---

## 1.9 Test Product Service

Jalankan PostgreSQL lokal dulu, lalu test service:

```bash
# Jalankan PostgreSQL dengan Docker (untuk development lokal)
docker run -d \
  --name postgres-local \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=product_db \
  -p 5432:5432 \
  postgres:15

# Jalankan product service
cd product-service
go run cmd/server/main.go

# Test endpoints (buka terminal baru)

# Create product
curl -X POST http://localhost:8081/api/v1/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"laptop","description":"gaming laptop","price":15000000,"stock":10}'

# Get all products
curl http://localhost:8081/api/v1/products

# Get product by ID
curl http://localhost:8081/api/v1/products/1

# Health check
curl http://localhost:8081/health
```

---

> **✅ Checkpoint Hari 1:** Product Service berjalan di port 8081 dengan endpoint CRUD lengkap. Database PostgreSQL terhubung via GORM dengan auto-migrate. Lanjut ke Hari 2!

---

## Hari 2 — Order Service & Protobuf

**Cakupan:** Order Service · Schema `.proto` · Kompilasi Protobuf · Git Submodules

Hari ini kita membuat Order Service dan mendefinisikan kontrak komunikasi antar-service menggunakan Protocol Buffers. Kita juga setup Git Submodules agar file `.proto` bisa di-share ke semua repository.
