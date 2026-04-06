---
title: gRPC Communication
sidebar_position: 1
pagination_prev: hari-2/order-service-protobuf
pagination_next: hari-4/kafka-event-streaming
---

# Hari 3 — Implementasi gRPC

Hari ini adalah inti dari komunikasi antar-service. Order Service akan memanggil Product Service via gRPC untuk validasi stok sebelum membuat order. Ini adalah komunikasi sinkron — Order Service menunggu jawaban dari Product Service.

---

## 3.1 gRPC Server di Product Service

Product Service perlu menjalankan dua server bersamaan: HTTP server (Fiber) untuk REST API, dan gRPC server untuk dipanggil service lain.

**File: `internal/grpc/server.go` (product-service)**

```go
package grpcserver

import (
    "context"
    "fmt"
    "log"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"

    pb "github.com/yourusername/product-service/proto/product"
    "github.com/yourusername/product-service/internal/service"
)

// ProductGRPCServer mengimplementasikan interface yang digenerate protoc
type ProductGRPCServer struct {
    pb.UnimplementedProductServiceServer // Wajib: untuk forward compatibility
    productSvc service.ProductService
}

func NewProductGRPCServer(svc service.ProductService) *ProductGRPCServer {
    return &ProductGRPCServer{productSvc: svc}
}

// CheckStock dipanggil oleh Order Service sebelum membuat order
func (s *ProductGRPCServer) CheckStock(ctx context.Context, req *pb.CheckStockRequest) (*pb.CheckStockResponse, error) {
    product, err := s.productSvc.GetProductByID(uint(req.ProductId))
    if err != nil {
        return nil, status.Error(codes.NotFound, "product not found")
    }

    available := product.Stock >= int(req.Quantity)
    msg := "Stok tersedia"
    if !available {
        msg = fmt.Sprintf("Stok tidak cukup. Tersedia: %d, diminta: %d", product.Stock, req.Quantity)
    }

    return &pb.CheckStockResponse{
        Available:    available,
        Message:      msg,
        CurrentStock: int32(product.Stock),
    }, nil
}

// UpdateStock dipanggil oleh Order Service setelah order confirmed
func (s *ProductGRPCServer) UpdateStock(ctx context.Context, req *pb.UpdateStockRequest) (*pb.UpdateStockResponse, error) {
    err := s.productSvc.CheckAndUpdateStock(uint(req.ProductId), int(req.Quantity))
    if err != nil {
        return &pb.UpdateStockResponse{Success: false, Message: err.Error()}, nil
    }
    return &pb.UpdateStockResponse{Success: true, Message: "Stok berhasil diupdate"}, nil
}

// GetProduct mengembalikan detail produk via gRPC
func (s *ProductGRPCServer) GetProduct(ctx context.Context, req *pb.GetProductRequest) (*pb.GetProductResponse, error) {
    product, err := s.productSvc.GetProductByID(uint(req.ProductId))
    if err != nil {
        return nil, status.Error(codes.NotFound, "product not found")
    }

    return &pb.GetProductResponse{
        Id:    uint64(product.ID),
        Name:  product.Name,
        Price: product.Price,
        Stock: int32(product.Stock),
    }, nil
}

// StartGRPCServer menjalankan gRPC server di port terpisah
func StartGRPCServer(port string, svc service.ProductService) error {
    lis, err := net.Listen("tcp", ":"+port)
    if err != nil {
        return fmt.Errorf("gagal listen gRPC port: %w", err)
    }

    grpcServer := grpc.NewServer()
    pb.RegisterProductServiceServer(grpcServer, NewProductGRPCServer(svc))

    log.Printf("gRPC Product Server berjalan di port %s", port)
    return grpcServer.Serve(lis)
}
```

---

## 3.2 Update `main.go` Product Service (Goroutine untuk gRPC)

**File: `cmd/server/main.go` (diupdate)**

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
    grpcserver "github.com/yourusername/product-service/internal/grpc"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Gagal load config: %v", err)
    }

    cfg.DB.AutoMigrate(&model.Product{})

    productRepo := repository.NewProductRepository(cfg.DB)
    productSvc  := service.NewProductService(productRepo)
    productHandler := handler.NewProductHandler(productSvc)

    // Jalankan gRPC server di goroutine terpisah
    // sehingga tidak memblock HTTP server
    go func() {
        if err := grpcserver.StartGRPCServer(cfg.GRPCPort, productSvc); err != nil {
            log.Fatalf("gRPC server error: %v", err)
        }
    }()

    app := fiber.New(fiber.Config{AppName: "Product Service v1.0"})
    app.Use(logger.New())
    app.Use(recover.New())

    app.Get("/health", func(c fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status":    "ok",
            "service":   "product-service",
            "grpc_port": cfg.GRPCPort,
        })
    })

    api := app.Group("/api/v1")
    productHandler.RegisterRoutes(api)

    log.Printf("HTTP server di port %s | gRPC server di port %s", cfg.AppPort, cfg.GRPCPort)
    log.Fatal(app.Listen(":" + cfg.AppPort))
}
```

---

## 3.3 gRPC Client di Order Service

**File: `internal/grpc/product_client.go` (order-service)**

```go
package grpcclient

import (
    "context"
    "fmt"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    pb "github.com/yourusername/order-service/proto/product"
)

// ProductClient adalah wrapper untuk gRPC client ke Product Service
type ProductClient struct {
    client pb.ProductServiceClient
    conn   *grpc.ClientConn
}

func NewProductClient(address string) (*ProductClient, error) {
    // Buat koneksi gRPC (insecure untuk development)
    // Untuk production: gunakan TLS credentials
    conn, err := grpc.NewClient(
        address,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        return nil, fmt.Errorf("gagal koneksi ke product service: %w", err)
    }

    return &ProductClient{
        client: pb.NewProductServiceClient(conn),
        conn:   conn,
    }, nil
}

// Close menutup koneksi gRPC (panggil saat service shutdown)
func (c *ProductClient) Close() {
    c.conn.Close()
}

// CheckStock memanggil Product Service untuk cek ketersediaan stok
func (c *ProductClient) CheckStock(productID uint64, quantity int32) (bool, string, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := c.client.CheckStock(ctx, &pb.CheckStockRequest{
        ProductId: productID,
        Quantity:  quantity,
    })
    if err != nil {
        return false, "", fmt.Errorf("gRPC CheckStock error: %w", err)
    }

    return resp.Available, resp.Message, nil
}

// GetProduct mengambil detail produk dari Product Service
func (c *ProductClient) GetProduct(productID uint64) (*pb.GetProductResponse, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    return c.client.GetProduct(ctx, &pb.GetProductRequest{ProductId: productID})
}
```

---

## 3.4 Order Service dengan gRPC Integration

**File: `internal/service/order_svc.go`**

```go
package service

import (
    "errors"

    grpcclient "github.com/yourusername/order-service/internal/grpc"
    "github.com/yourusername/order-service/internal/model"
    "github.com/yourusername/order-service/internal/repository"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type OrderService interface {
    CreateOrder(req *model.CreateOrderRequest) (*model.Order, error)
    GetOrderByID(id uint) (*model.Order, error)
    GetAllOrders() ([]model.Order, error)
}

type orderService struct {
    repo          repository.OrderRepository
    productClient *grpcclient.ProductClient
}

func NewOrderService(repo repository.OrderRepository, pc *grpcclient.ProductClient) OrderService {
    return &orderService{repo: repo, productClient: pc}
}

func (s *orderService) CreateOrder(req *model.CreateOrderRequest) (*model.Order, error) {
    // LANGKAH 1: Panggil Product Service via gRPC untuk cek stok
    available, msg, err := s.productClient.CheckStock(uint64(req.ProductID), int32(req.Quantity))
    if err != nil {
        st, ok := status.FromError(err)
        if ok {
            switch st.Code() {
            case codes.NotFound:
                return nil, errors.New("product tidak ditemukan")
            case codes.Unavailable:
                return nil, errors.New("product service tidak tersedia")
            default:
                return nil, errors.New("error dari product service: " + st.Message())
            }
        }
        return nil, errors.New("gagal menghubungi product service")
    }

    if !available {
        return nil, errors.New(msg) // Stok tidak cukup
    }

    // LANGKAH 2: Ambil detail produk untuk hitung harga
    productDetail, err := s.productClient.GetProduct(uint64(req.ProductID))
    if err != nil {
        return nil, errors.New("gagal mengambil detail produk")
    }

    // LANGKAH 3: Hitung total harga
    totalPrice := productDetail.Price * float64(req.Quantity)

    // LANGKAH 4: Simpan order ke database
    order := &model.Order{
        ProductID:  req.ProductID,
        Quantity:   req.Quantity,
        TotalPrice: totalPrice,
        Status:     model.StatusPending,
    }

    if err := s.repo.Create(order); err != nil {
        return nil, errors.New("gagal menyimpan order")
    }

    // CATATAN: Update stok akan dilakukan via Kafka (Hari 4)
    // Ini adalah pola saga pattern: kompensasi jika gagal
    return order, nil
}

func (s *orderService) GetOrderByID(id uint) (*model.Order, error) {
    return s.repo.FindByID(id)
}

func (s *orderService) GetAllOrders() ([]model.Order, error) {
    return s.repo.FindAll()
}
```

---

## 3.5 Order Repository

**File: `internal/repository/order_repo.go`**

```go
package repository

import (
    "errors"

    "github.com/yourusername/order-service/internal/model"
    "gorm.io/gorm"
)

type OrderRepository interface {
    Create(order *model.Order) error
    FindByID(id uint) (*model.Order, error)
    FindAll() ([]model.Order, error)
    UpdateStatus(id uint, status model.OrderStatus) error
}

type orderRepository struct {
    db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
    return &orderRepository{db: db}
}

func (r *orderRepository) Create(order *model.Order) error {
    return r.db.Create(order).Error
}

func (r *orderRepository) FindByID(id uint) (*model.Order, error) {
    var order model.Order
    err := r.db.First(&order, id).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, errors.New("order tidak ditemukan")
        }
        return nil, err
    }
    return &order, nil
}

func (r *orderRepository) FindAll() ([]model.Order, error) {
    var orders []model.Order
    err := r.db.Find(&orders).Error
    return orders, err
}

func (r *orderRepository) UpdateStatus(id uint, status model.OrderStatus) error {
    return r.db.Model(&model.Order{}).Where("id = ?", id).
        Update("status", status).Error
}
```

---

## 3.6 Order Handler & Main

**File: `internal/handler/order_handler.go`**

```go
package handler

import (
    "strconv"

    "github.com/gofiber/fiber/v3"
    "github.com/yourusername/order-service/internal/model"
    "github.com/yourusername/order-service/internal/service"
)

type OrderHandler struct {
    svc service.OrderService
}

func NewOrderHandler(svc service.OrderService) *OrderHandler {
    return &OrderHandler{svc: svc}
}

func (h *OrderHandler) RegisterRoutes(router fiber.Router) {
    orders := router.Group("/orders")
    orders.Get("/", h.GetAll)
    orders.Get("/:id", h.GetByID)
    orders.Post("/", h.Create)
}

func (h *OrderHandler) GetAll(c fiber.Ctx) error {
    orders, err := h.svc.GetAllOrders()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": orders})
}

func (h *OrderHandler) GetByID(c fiber.Ctx) error {
    id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
    order, err := h.svc.GetOrderByID(uint(id))
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": order})
}

func (h *OrderHandler) Create(c fiber.Ctx) error {
    var req model.CreateOrderRequest
    if err := c.Bind().Body(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "request tidak valid"})
    }
    order, err := h.svc.CreateOrder(&req)
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }
    return c.Status(201).JSON(fiber.Map{"data": order, "message": "order berhasil dibuat"})
}
```

**File: `cmd/server/main.go` (order-service)**

```go
package main

import (
    "log"
    "os"

    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/middleware/logger"
    "github.com/yourusername/order-service/internal/config"
    "github.com/yourusername/order-service/internal/handler"
    "github.com/yourusername/order-service/internal/model"
    "github.com/yourusername/order-service/internal/repository"
    "github.com/yourusername/order-service/internal/service"
    grpcclient "github.com/yourusername/order-service/internal/grpc"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Config error: %v", err)
    }

    cfg.DB.AutoMigrate(&model.Order{})

    // Setup gRPC client ke Product Service
    productGRPCAddr := os.Getenv("PRODUCT_GRPC_ADDR") // misal: "product-service:9091"
    productClient, err := grpcclient.NewProductClient(productGRPCAddr)
    if err != nil {
        log.Fatalf("Gagal koneksi gRPC ke product service: %v", err)
    }
    defer productClient.Close()

    orderRepo    := repository.NewOrderRepository(cfg.DB)
    orderSvc     := service.NewOrderService(orderRepo, productClient)
    orderHandler := handler.NewOrderHandler(orderSvc)

    app := fiber.New(fiber.Config{AppName: "Order Service v1.0"})
    app.Use(logger.New())

    app.Get("/health", func(c fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok", "service": "order-service"})
    })

    api := app.Group("/api/v1")
    orderHandler.RegisterRoutes(api)

    log.Printf("Order Service berjalan di port %s", cfg.AppPort)
    log.Fatal(app.Listen(":" + cfg.AppPort))
}
```

---

> **✅ Checkpoint Hari 3:** gRPC server berjalan di Product Service (port 9091). Order Service bisa memanggil Product Service via gRPC untuk validasi stok. Dua server (HTTP + gRPC) berjalan bersamaan di Product Service.

---

## Hari 4 — Kafka Event Streaming

**Cakupan:** Producer · Consumer · Event-Driven Architecture · Async Processing

Kafka digunakan untuk komunikasi asinkron. Ketika order dibuat, Order Service mempublish event ke Kafka. Product Service yang subscribe ke topic tersebut akan otomatis mengurangi stok tanpa Order Service perlu menunggu. Ini adalah pola event-driven yang sangat populer di microservices.
