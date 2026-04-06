---
title: Kafka Event Streaming
sidebar_position: 1
pagination_prev: hari-3/grpc-communication
pagination_next: hari-5/api-gateway
---

# Hari 4 — Kafka Event Streaming

---

## 4.1 Konsep Kafka dalam Sistem Kita

```
Order Service          Kafka Broker            Product Service
      │                     │                        │
      │── Publish ─────────►│  Topic: order-events   │
      │   {order_id,        │                        │
      │    product_id,      │──── Consume ──────────►│
      │    quantity,        │                        │
      │    status}          │                   Update stok di DB
      │                     │
      │ (tidak menunggu)
      ▼
 Return order
 ke client

Topic: order-events
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

    grpcclient "github.com/yourusername/order-service/internal/grpc"
    kafkapkg   "github.com/yourusername/order-service/internal/kafka"
    "github.com/yourusername/order-service/internal/model"
    "github.com/yourusername/order-service/internal/repository"
)

type orderService struct {
    repo          repository.OrderRepository
    productClient *grpcclient.ProductClient
    producer      *kafkapkg.OrderProducer // BARU: Kafka producer
}

func NewOrderService(
    repo     repository.OrderRepository,
    pc       *grpcclient.ProductClient,
    producer *kafkapkg.OrderProducer,
) OrderService {
    return &orderService{repo: repo, productClient: pc, producer: producer}
}

func (s *orderService) CreateOrder(req *model.CreateOrderRequest) (*model.Order, error) {
    // 1. Cek stok via gRPC
    available, msg, err := s.productClient.CheckStock(uint64(req.ProductID), int32(req.Quantity))
    if err != nil || !available {
        if err == nil {
            err = errors.New(msg)
        }
        return nil, err
    }

    // 2. Ambil harga produk
    productDetail, err := s.productClient.GetProduct(uint64(req.ProductID))
    if err != nil {
        return nil, errors.New("gagal ambil detail produk")
    }

    // 3. Buat order
    order := &model.Order{
        ProductID:  req.ProductID,
        Quantity:   req.Quantity,
        TotalPrice: productDetail.Price * float64(req.Quantity),
        Status:     model.StatusPending,
    }

    if err := s.repo.Create(order); err != nil {
        return nil, errors.New("gagal simpan order")
    }

    // 4. Publish event ke Kafka (ASYNC - tidak blocking)
    event := model.OrderEvent{
        OrderID:   order.ID,
        ProductID: order.ProductID,
        Quantity:  order.Quantity,
        Status:    model.StatusConfirmed,
    }

    // Publish di goroutine agar tidak blocking response
    go func() {
        if err := s.producer.PublishOrderEvent(event); err != nil {
            // Log error tapi jangan gagalkan order
            // Di production: retry logic atau dead letter queue
            _ = err
        }
    }()

    return order, nil
}
```

---

## 4.4 Kafka Consumer di Product Service

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

            // Proses: kurangi stok
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

## 4.5 Update `main.go` Product Service (tambah Kafka Consumer)

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

> **✅ Checkpoint Hari 4:** Order Service publish event ke Kafka ketika order dibuat. Product Service consume event tersebut dan update stok secara asinkron. Ini adalah pola event-driven yang decoupled.

---

## Hari 5 — API Gateway

**Cakupan:** Fiber Gateway · Routing · Proxy · Load Balancing

API Gateway adalah entry point tunggal untuk semua request dari client. Ia menerima request HTTP, menentukan service mana yang harus menangani request tersebut, lalu meneruskannya. Di sini kita juga bisa menambahkan authentication, rate limiting, dan logging terpusat.
