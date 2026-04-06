---
title: API Gateway
sidebar_position: 1
pagination_prev: hari-4/kafka-event-streaming
pagination_next: hari-6/docker-compose
---

# Hari 5 — API Gateway

---

## 5.1 Inisialisasi API Gateway

```bash
# API Gateway adalah repository TERPISAH
mkdir api-gateway && cd api-gateway
git init

go mod init github.com/yourusername/api-gateway

go get github.com/gofiber/fiber/v3
go get github.com/gofiber/fiber/v3/middleware/proxy
go get github.com/joho/godotenv

mkdir -p cmd/server internal/{config,middleware,proxy}
```

---

## 5.2 Struktur API Gateway

```
api-gateway/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go          ← URL ke downstream services
│   ├── middleware/
│   │   ├── auth.go            ← JWT / API Key validation (opsional)
│   │   └── ratelimit.go       ← Rate limiting
│   └── proxy/
│       └── proxy.go           ← Forward request ke service
├── .env
├── Dockerfile
└── go.mod
```

---

## 5.3 Konfigurasi

**File: `.env` (api-gateway)**

```env
APP_PORT=8080

# URL ke downstream services
PRODUCT_SERVICE_URL=http://product-service:8081
ORDER_SERVICE_URL=http://order-service:8082
```

**File: `internal/config/config.go`**

```go
package config

import (
    "os"

    "github.com/joho/godotenv"
)

type Config struct {
    AppPort           string
    ProductServiceURL string
    OrderServiceURL   string
}

func Load() *Config {
    _ = godotenv.Load()
    return &Config{
        AppPort:           getEnv("APP_PORT", "8080"),
        ProductServiceURL: getEnv("PRODUCT_SERVICE_URL", "http://localhost:8081"),
        OrderServiceURL:   getEnv("ORDER_SERVICE_URL", "http://localhost:8082"),
    }
}

func getEnv(key, defaultVal string) string {
    if val := os.Getenv(key); val != "" {
        return val
    }
    return defaultVal
}
```

---

## 5.4 Gateway Logger Middleware

**File: `internal/middleware/logger.go`**

```go
package middleware

import (
    "fmt"
    "time"

    "github.com/gofiber/fiber/v3"
)

// GatewayLogger adalah custom logger untuk API Gateway.
// Mencatat semua request yang masuk dan diteruskan ke service mana.
func GatewayLogger() fiber.Handler {
    return func(c fiber.Ctx) error {
        start := time.Now()
        err := c.Next()
        duration := time.Since(start)

        fmt.Printf("[Gateway] %s %s → %d (%s)\n",
            c.Method(),
            c.OriginalURL(),
            c.Response().StatusCode(),
            duration,
        )

        return err
    }
}
```

---

## 5.5 Proxy Handler

**File: `internal/proxy/proxy.go`**

```go
package proxy

import (
    "fmt"
    "strings"

    "github.com/gofiber/fiber/v3"
    "github.com/valyala/fasthttp"
)

// ForwardRequest meneruskan request ke URL tujuan.
// Ini adalah implementasi reverse proxy manual yang lebih fleksibel.
func ForwardRequest(targetBaseURL string) fiber.Handler {
    return func(c fiber.Ctx) error {
        // Bangun URL tujuan
        // Misal: /api/products/1 → http://product-service:8081/api/v1/products/1
        path := c.Path()

        // Ganti prefix /api/ dengan /api/v1/ untuk downstream
        targetPath := strings.Replace(path, "/api/", "/api/v1/", 1)
        targetURL  := fmt.Sprintf("%s%s", targetBaseURL, targetPath)

        // Tambahkan query string jika ada
        if qs := c.Request().URI().QueryString(); len(qs) > 0 {
            targetURL = fmt.Sprintf("%s?%s", targetURL, string(qs))
        }

        // Buat request baru ke downstream service
        req  := fasthttp.AcquireRequest()
        resp := fasthttp.AcquireResponse()
        defer fasthttp.ReleaseRequest(req)
        defer fasthttp.ReleaseResponse(resp)

        // Copy seluruh header request ke downstream.
        // VisitAll sudah deprecated di fasthttp; gunakan CopyTo/All.
        // Di panduan ini kita pilih CopyTo agar tidak bergantung pada iterator baru.
        c.Request().Header.CopyTo(&req.Header)
        req.Header.SetMethod(c.Method())
        req.Header.Del("Connection")
        req.Header.Del("Host")
        req.SetRequestURI(targetURL)

        // Copy request body
        req.SetBody(c.Body())

        // Forward request
        client := &fasthttp.Client{}
        if err := client.Do(req, resp); err != nil {
            return c.Status(502).JSON(fiber.Map{
                "error":  "Bad Gateway: gagal menghubungi service",
                "detail": err.Error(),
            })
        }

        // Copy response dari downstream ke client.
        // VisitAll pada ResponseHeader juga deprecated, jadi gunakan CopyTo.
        c.Response().SetStatusCode(resp.StatusCode())
        resp.Header.CopyTo(&c.Response().Header)

        return c.Send(resp.Body())
    }
}
```

> **Catatan penting:** `targetURL` yang tercetak di log bisa saja sudah benar, misalnya `http://localhost:8081/api/v1/products`, tetapi request tetap nyasar ke `localhost:8080` jika header `Host` dari request asli ikut tercopy dari client ke downstream request. Karena itu pada contoh di atas `Host` dihapus dulu, lalu `SetRequestURI(targetURL)` dipanggil setelah proses copy header supaya host/port tujuan final tetap mengikuti `targetURL`, bukan mengikuti host milik API Gateway.

---

## 5.6 Main Entry Point

**File: `cmd/server/main.go` (api-gateway)**

```go
package main

import (
    "log"

    "github.com/gofiber/fiber/v3"
    "github.com/gofiber/fiber/v3/middleware/cors"
    "github.com/gofiber/fiber/v3/middleware/recover"
    "github.com/yourusername/api-gateway/internal/config"
    "github.com/yourusername/api-gateway/internal/middleware"
    "github.com/yourusername/api-gateway/internal/proxy"
)

func main() {
    cfg := config.Load()

    app := fiber.New(fiber.Config{AppName: "API Gateway v1.0"})

    // Middleware global
    app.Use(recover.New())
    app.Use(cors.New(cors.Config{
        AllowOrigins: "*",
        AllowHeaders: "Origin, Content-Type, Accept, Authorization",
        AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
    }))
    app.Use(middleware.GatewayLogger())

    // Health check gateway sendiri
    app.Get("/health", func(c fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status":  "ok",
            "gateway": "api-gateway",
            "services": fiber.Map{
                "product": cfg.ProductServiceURL,
                "order":   cfg.OrderServiceURL,
            },
        })
    })

    // Routing — semua request dari luar masuk lewat sini
    api := app.Group("/api")

    // /api/products/** → http://product-service:8081/api/v1/products/**
    api.All("/products",   proxy.ForwardRequest(cfg.ProductServiceURL))
    api.All("/products/*", proxy.ForwardRequest(cfg.ProductServiceURL))

    // /api/orders/** → http://order-service:8082/api/v1/orders/**
    api.All("/orders",   proxy.ForwardRequest(cfg.OrderServiceURL))
    api.All("/orders/*", proxy.ForwardRequest(cfg.OrderServiceURL))

    // 404 untuk route yang tidak dikenal
    app.Use(func(c fiber.Ctx) error {
        return c.Status(404).JSON(fiber.Map{
            "error": "Route tidak ditemukan di gateway",
            "path":  c.Path(),
        })
    })

    log.Printf("API Gateway berjalan di port %s", cfg.AppPort)
    log.Fatal(app.Listen(":" + cfg.AppPort))
}
```

---

> **✅ Checkpoint Hari 5:** API Gateway berjalan di port 8080 sebagai single entry point. Request `/api/products/**` diteruskan ke Product Service, `/api/orders/**` ke Order Service. Semua routing terpusat.

---

## Hari 6 — Docker Compose & Containerization

**Cakupan:** Dockerfile · docker-compose.yml · Orchestrasi Semua Service

Hari ini kita containerize semua service dan orkestrasikan dengan Docker Compose. Setiap service punya Dockerfile sendiri, dan satu file `docker-compose.yml` yang menarik semua service bersama.
