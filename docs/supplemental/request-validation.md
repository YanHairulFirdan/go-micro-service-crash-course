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

## Alternatif Yang Lebih Rapi Untuk Production

Contoh validasi manual di atas bagus untuk memahami konsep boundary validation. Tetapi pada project yang lebih serius, pola seperti ini cepat menjadi repetitif karena setiap handler harus terus menulis banyak `if req.Field == ...`.

Pendekatan yang lebih rapi adalah memakai validator berbasis struct tags, misalnya `go-playground/validator`. Dengan pola ini:

- rule validasi ditaruh di struct request
- handler cukup parse body lalu memanggil validator
- format validasi menjadi lebih konsisten antar endpoint

Contoh request struct:

```go
type LoginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=6"`
}

type CreateOrderRequest struct {
    ProductID int `json:"product_id" validate:"required,gt=0"`
    Quantity  int `json:"quantity" validate:"required,gt=0"`
}
```

Lalu siapkan validator terpusat:

```go
var validate = validator.New()
```

Contoh handler yang lebih ringkas:

```go
func LoginHandler(c *fiber.Ctx) error {
    var req LoginRequest

    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "body tidak valid",
        })
    }

    if err := validate.Struct(req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "payload tidak valid",
            "errors":  err.Error(),
        })
    }

    return authService.Login(c.Context(), req.Email, req.Password)
}
```

Dengan pola ini, handler tidak perlu mengecek field satu per satu terus-menerus. Boundary validation tetap terjadi di awal request, tetapi implementasinya lebih scalable saat jumlah endpoint bertambah.

Untuk kebutuhan course ini, contoh manual tetap penting karena paling mudah dipahami. Tetapi siswa juga perlu tahu bahwa pada codebase production, pendekatan validator berbasis struct tags biasanya lebih rapi dan lebih mudah dipelihara.

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
