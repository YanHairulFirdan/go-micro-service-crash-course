---
title: "Request Validation: Menjaga Boundary API"
sidebar_position: 2
slug: /supplemental/request-validation
pagination_prev: supplemental/environment-management
pagination_next: supplemental/auth-jwt-overview
---

# Request Validation: Menjaga Boundary API

Request validation adalah lapisan pertama yang melindungi handler dari input yang rusak atau tidak lengkap. Di Go, terutama pada API yang dibangun dengan Fiber atau `net/http`, validasi ini biasanya terjadi sebelum data masuk ke business logic.

## Kenapa Validation Harus Di Boundary

- handler menerima input mentah dari client
- service layer seharusnya menerima data yang sudah terbentuk dan masuk akal
- response `400 Bad Request` lebih jelas daripada error internal yang terlambat muncul

Dengan memisahkan validasi request dari validasi bisnis, setiap lapisan punya tanggung jawab yang jelas.

## Contoh Payload

### Order

```json
{
  "product_id": 12,
  "quantity": 2
}
```

Validasi request untuk payload ini biasanya memastikan:

- `product_id` wajib ada dan lebih besar dari 0
- `quantity` wajib ada dan lebih besar dari 0

### Login

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Validasi request untuk login biasanya memastikan:

- `email` tidak kosong dan format dasarnya benar
- `password` tidak kosong

## Alur Handler

Alur yang sehat di handler biasanya seperti ini:

1. parse body JSON ke struct request
2. cek error parsing
3. validasi field wajib dan format dasar
4. jika gagal, return `400`
5. jika lolos, teruskan ke service layer

### Contoh Response Error

```json
{
  "message": "quantity harus lebih besar dari 0"
}
```

Client perlu tahu bahwa masalah ada di input, bukan di sistem.

## Pseudocode Go

```go
type CreateOrderRequest struct {
    ProductID int `json:"product_id"`
    Quantity  int `json:"quantity"`
}

func CreateOrderHandler(c *fiber.Ctx) error {
    var req CreateOrderRequest

    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "body tidak valid",
        })
    }

    if req.ProductID <= 0 {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "product_id harus lebih besar dari 0",
        })
    }

    if req.Quantity <= 0 {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "quantity harus lebih besar dari 0",
        })
    }

    result, err := orderService.Create(c.Context(), req.ProductID, req.Quantity)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "message": "gagal membuat order",
        })
    }

    return c.Status(fiber.StatusCreated).JSON(result)
}
```

Untuk login, polanya sama:

```go
type LoginRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}
```

Handler hanya memastikan payload minimal valid. Proses cek password, pencocokan user, atau pembuatan JWT tetap menjadi tanggung jawab business service.

## Request Validation vs Business Validation

Request validation menjawab pertanyaan: "apakah payload ini bisa diproses?"

Contoh:

- field wajib kosong
- angka negatif
- format JSON rusak

Business validation menjawab pertanyaan: "apakah data ini boleh diproses oleh domain?"

Contoh:

- stok produk tidak cukup
- email belum terdaftar
- password salah
- order sudah dibatalkan sehingga tidak bisa diproses lagi

Perbedaan ini penting. Request valid bisa saja tetap ditolak oleh aturan bisnis.

## Praktik Yang Disarankan

- lakukan parsing dan validasi secepat mungkin di handler
- kembalikan `400` untuk input yang salah
- jangan campur validasi domain dengan validasi format request
- gunakan error message yang spesifik dan konsisten

Kalau boundary ini rapi, service layer jadi lebih mudah dites, lebih mudah dibaca, dan lebih kecil peluangnya menerima data yang aneh.
