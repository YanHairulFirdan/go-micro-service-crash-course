---
title: Kafka Event Streaming
sidebar_position: 4
slug: /learning-path/hari-4-kafka-event-streaming
pagination_prev: learning-path/hari-3-grpc-communication
pagination_next: learning-path/hari-5-api-gateway
---

# Hari 4 — Kafka Event Streaming

---

## 4.1 Konsep Kafka dalam Sistem Kita

Setelah Hari 3, order sudah bisa dibuat tetapi statusnya masih `pending` dan stok belum berkurang. Hari ini kita menambahkan alur event-driven untuk konfirmasi order. Saat order dikonfirmasi menjadi `confirmed`, `order-service` mempublish event ke Kafka, lalu `product-service` bereaksi terhadap event itu untuk mengurangi stok secara asynchronous.

```
Order Service          Kafka Broker            Product Service
      │                     │                        │
      │── Confirm Order ───►│                        │
      │                     │                        │
      │── Publish ─────────►│  Topic: order-events   │
      │   {order_id,        │                        │
      │    product_id,      │──── Consume ──────────►│
      │    quantity,        │                        │
      │    status:          │                   Kurangi stok di DB
      │    confirmed}       │
      │                     │
      │ (tidak menunggu)
      ▼
 Return response
 ke client

Topic: order-events
Trigger stok: event dengan `status = confirmed`
Partition: 1  (untuk simplisitas)
Message Key: order_id  (agar ordered per order)
```

---

## 4.2 Kafka Producer di Order Service

**File: `internal/kafka/producer.go` (order-service)**

```go
package kafka

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "strconv"

    "github.com/segmentio/kafka-go"
    "github.com/yourusername/order-service/internal/model"
)

const TopicOrderEvents = "order-events"

type OrderProducer struct {
    writer *kafka.Writer
}

func NewOrderProducer(brokerAddr string) *OrderProducer {
    writer := &kafka.Writer{
        Addr:     kafka.TCP(brokerAddr),
        Topic:    TopicOrderEvents,
        Balancer: &kafka.LeastBytes{},
        // Auto-create topic jika belum ada
        AllowAutoTopicCreation: true,
    }
    return &OrderProducer{writer: writer}
}

func (p *OrderProducer) PublishOrderEvent(event model.OrderEvent) error {
    payload, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("gagal marshal event: %w", err)
    }

    msg := kafka.Message{
        // Key digunakan untuk partitioning
        // (semua event order yang sama ke partisi yang sama)
        Key:   []byte(strconv.FormatUint(uint64(event.OrderID), 10)),
        Value: payload,
    }

    if err := p.writer.WriteMessages(context.Background(), msg); err != nil {
        return fmt.Errorf("gagal publish ke kafka: %w", err)
    }

    log.Printf("Event published: OrderID=%d, ProductID=%d, Qty=%d, Status=%s",
        event.OrderID, event.ProductID, event.Quantity, event.Status)

    return nil
}

func (p *OrderProducer) Close() {
    p.writer.Close()
}
```

---

## 4.3 Update Order Service untuk Publish Event

**File: `internal/service/order_svc.go` (diupdate)**

```go
package service

import (
    "errors"
    "log"

    grpcclient "github.com/yourusername/order-service/internal/grpc"
    "github.com/yourusername/order-service/internal/kafka"
    "github.com/yourusername/order-service/internal/model"
    "github.com/yourusername/order-service/internal/repository"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type OrderService interface {
    CreateOrder(req *model.CreateOrderRequest) (*model.Order, error)
    GetOrderByID(id uint) (*model.Order, error)
    GetAllOrders() ([]model.Order, error)
    UpdateOrderStatus(id uint, status model.OrderStatus) error
}

type orderService struct {
    repo          repository.OrderRepository
    productClient *grpcclient.ProductClient
    producer      *kafka.OrderProducer
}

func NewOrderService(
    repo repository.OrderRepository,
    productClient *grpcclient.ProductClient,
    producer *kafka.OrderProducer,
) OrderService {
    return &orderService{repo: repo, productClient: productClient, producer: producer}
}

func (s *orderService) CreateOrder(req *model.CreateOrderRequest) (*model.Order, error) {
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
        return nil, errors.New(msg)
    }

    productDetail, err := s.productClient.GetProduct(uint64(req.ProductID))
    if err != nil {
        return nil, errors.New("gagal mengambil detail product")
    }

    order := &model.Order{
        ProductID:  req.ProductID,
        Quantity:   int(req.Quantity),
        TotalPrice: productDetail.Price * float64(req.Quantity),
        Status:     model.StatusPending,
    }

    if err := s.repo.Create(order); err != nil {
        return nil, errors.New("gagal menyimpan order")
    }

    return order, nil
}

func (s *orderService) GetOrderByID(id uint) (*model.Order, error) {
    return s.repo.FindByID(id)
}

func (s *orderService) GetAllOrders() ([]model.Order, error) {
    return s.repo.FindAll()
}

func (s *orderService) UpdateOrderStatus(id uint, status model.OrderStatus) error {
    order, err := s.GetOrderByID(id)

    if err != nil {
        return err
    }

    if order.Status == model.StatusConfirmed {
        return errors.New("Order already confirmed")
    }

    err = s.repo.UpdateStatus(id, status)

    if err != nil {
        return err
    }

    event := model.OrderEvent{
        OrderID:   order.ID,
        ProductID: order.ProductID,
        Quantity:  order.Quantity,
        Status:    status,
    }

    go func() {
        if err := s.producer.PublishOrderEvent(event); err != nil {
            log.Printf("error: %v", err)
            _ = err
        }
    }()

    return nil
}
```

---

Dengan perubahan ini, pembuatan order tetap menghasilkan status `pending`. Perubahan status ke `confirmed` dilakukan melalui endpoint terpisah, lalu event Kafka dipublish untuk memicu proses lanjutan seperti pengurangan stok.

## 4.4 Update Order Handler untuk Endpoint Confirm

**File: `internal/handler/order_handler.go` (diupdate)**

```go
package handler

import (
    "strconv"

    "github.com/yourusername/order-service/internal/model"
    "github.com/yourusername/order-service/internal/service"
    "github.com/gofiber/fiber/v3"
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
    orders.Put("/:id/confirmed", h.Confirmed)
}

func (h *OrderHandler) GetAll(c fiber.Ctx) error {
    orders, err := h.svc.GetAllOrders()

    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"data": orders})
}

func (h *OrderHandler) GetByID(c fiber.Ctx) error {
    id, err := strconv.ParseUint(c.Params("id"), 10, 32)

    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id tidak valid"})
    }

    order, err := h.svc.GetOrderByID(uint(id))

    if err != nil {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"data": order})
}

func (h *OrderHandler) Create(c fiber.Ctx) error {
    var req model.CreateOrderRequest

    if err := c.Bind().Body(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request tidak valid"})
    }

    order, err := h.svc.CreateOrder(&req)

    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": order, "message": "order berhasil dibuat"})
}

func (h *OrderHandler) Confirmed(c fiber.Ctx) error {
    id, err := strconv.ParseUint(c.Params("id"), 10, 32)

    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id tidak valid"})
    }

    err = h.svc.UpdateOrderStatus(uint(id), model.StatusConfirmed)

    if err != nil {
        if err.Error() == "order tidak ditemukan" {
            return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
        }

        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "ok", "message": "order updated successfully"})
}
```

---

## 4.5 Kafka Consumer di Product Service

**File: `internal/kafka/consumer.go` (product-service)**

```go
package kafka

import (
    "context"
    "encoding/json"
    "log"

    "github.com/segmentio/kafka-go"
    "github.com/yourusername/product-service/internal/service"
)

const TopicOrderEvents = "order-events"

type OrderEventPayload struct {
    OrderID   uint   `json:"order_id"`
    ProductID uint   `json:"product_id"`
    Quantity  int    `json:"quantity"`
    Status    string `json:"status"`
}

type OrderConsumer struct {
    reader     *kafka.Reader
    productSvc service.ProductService
}

func NewOrderConsumer(brokerAddr string, productSvc service.ProductService) *OrderConsumer {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers:  []string{brokerAddr},
        Topic:    TopicOrderEvents,
        GroupID:  "product-service-group", // Consumer group untuk load balancing
        MinBytes: 10e3,                    // 10KB
        MaxBytes: 10e6,                    // 10MB
    })
    return &OrderConsumer{reader: reader, productSvc: productSvc}
}

// StartConsuming memulai loop konsumsi pesan dari Kafka.
// Harus dipanggil dalam goroutine terpisah.
func (c *OrderConsumer) StartConsuming(ctx context.Context) {
    log.Println("Kafka Consumer mulai listen topic: order-events")

    for {
        select {
        case <-ctx.Done():
            log.Println("Kafka Consumer berhenti")
            return
        default:
            msg, err := c.reader.ReadMessage(ctx)
            if err != nil {
                log.Printf("Error baca pesan kafka: %v", err)
                continue
            }

            // Parse payload
            var event OrderEventPayload
            if err := json.Unmarshal(msg.Value, &event); err != nil {
                log.Printf("Error parse pesan kafka: %v", err)
                continue
            }

            log.Printf("Terima event: OrderID=%d, ProductID=%d, Qty=%d, Status=%s",
                event.OrderID, event.ProductID, event.Quantity, event.Status)

            // Kurangi stok hanya ketika order sudah confirmed.
            if event.Status == "confirmed" {
                if err := c.productSvc.CheckAndUpdateStock(event.ProductID, event.Quantity); err != nil {
                    log.Printf("Gagal update stok untuk OrderID=%d: %v", event.OrderID, err)
                    // Di production: kirim ke dead letter topic atau alert
                } else {
                    log.Printf("Stok berhasil dikurangi %d untuk ProductID=%d",
                        event.Quantity, event.ProductID)
                }
            }
        }
    }
}

func (c *OrderConsumer) Close() {
    c.reader.Close()
}
```

---

## 4.6 Update `main.go` Order Service dan Product Service

**File: `cmd/server/main.go` (order-service)**

```go
// Tambahkan di main() order-service setelah setup gRPC client:

kafkaBroker := os.Getenv("KAFKA_BROKER") // "kafka:9092"

producer := kafka.NewOrderProducer(kafkaBroker)
defer producer.Close()

orderRepo := repository.NewOrderRepository(cfg.DB)
orderSvc := service.NewOrderService(orderRepo, productClient, producer)
orderHandler := handler.NewOrderHandler(orderSvc)
```

**File: `cmd/server/main.go` (product-service)**

```go
// Tambahkan di main() product-service setelah setup service:

kafkaBroker := os.Getenv("KAFKA_BROKER") // "kafka:9092"

// Setup Kafka Consumer
consumer := kafka.NewOrderConsumer(kafkaBroker, productSvc)
defer consumer.Close()

// Jalankan consumer di goroutine
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go consumer.StartConsuming(ctx)

// ... lanjut setup Fiber dan gRPC seperti sebelumnya
```

---

> **✅ Checkpoint Hari 4:** Order dibuat dengan status `pending`, lalu dapat dikonfirmasi melalui endpoint `PUT /orders/:id/confirmed`. Saat status berubah menjadi `confirmed`, `order-service` mempublish event ke Kafka dan `product-service` mengurangi stok secara asynchronous. Ini adalah pola event-driven yang decoupled.

---

## Hari 5 — API Gateway

**Cakupan:** Fiber Gateway · Routing · Proxy · Load Balancing

API Gateway adalah entry point tunggal untuk semua request dari client. Ia menerima request HTTP, menentukan service mana yang harus menangani request tersebut, lalu meneruskannya. Di sini kita juga bisa menambahkan authentication, rate limiting, dan logging terpusat.
