---
title: "Structured Logging: Log yang Konsisten dan Terbaca"
sidebar_position: 1
slug: /supplemental/structured-logging
pagination_prev: supplemental/api-gateway-jwt-verification
pagination_next: supplemental/database-migration
---

# Structured Logging: Log yang Konsisten dan Terbaca

Saat service mulai menerima trafik nyata, `fmt.Println("error here")` cepat menjadi tidak cukup. Kita butuh log yang konsisten, punya field yang bisa dicari, dan cukup kaya untuk menjawab pertanyaan praktis:

- request mana yang gagal
- endpoint apa yang dipanggil
- berapa lama request diproses
- user atau request ID mana yang terlibat

Di ekosistem Go, structured logging biasanya berarti menulis log sebagai pasangan key-value atau JSON. Format ini jauh lebih mudah dibaca manusia dan jauh lebih mudah diolah oleh log aggregator.

## Kenapa Log Harus Terstruktur

Bayangkan dua log berikut.

Log bebas:

```text
request selesai GET /orders/42 200 18ms user 9
```

Log terstruktur:

```json
{
  "level": "info",
  "msg": "request finished",
  "method": "GET",
  "path": "/orders/42",
  "status": 200,
  "duration_ms": 18,
  "user_id": "9",
  "request_id": "req-7e3d90"
}
```

Isi informasinya mirip, tetapi format kedua lebih stabil. Kita bisa memfilter `status >= 500`, mencari semua log dengan `request_id` tertentu, atau membuat dashboard berdasarkan `path` dan `duration_ms`.

## Field Minimum Yang Sebaiknya Konsisten

Supaya log antar-service tetap bisa dibaca bersama, gunakan field yang sama sedapat mungkin:

- `level`
- `msg`
- `service`
- `request_id`
- `method`
- `path`
- `status`
- `duration_ms`
- `user_id` bila tersedia
- `error` bila ada kegagalan

Tidak semua log harus berisi semua field. Yang penting, nama field inti tetap konsisten sehingga pencarian log tidak berubah-ubah antar-handler atau antar-service.

## Request ID Adalah Kunci Korelasi

Dalam arsitektur multi-service, satu request user bisa melewati gateway, auth service, lalu service domain lain. Tanpa `request_id`, jejak request itu pecah menjadi potongan log yang sulit disambungkan.

Pola paling aman:

1. gateway membaca `X-Request-Id` dari client bila ada
2. kalau header tidak ada, gateway membuat ID baru
3. ID itu disimpan di context request
4. ID yang sama diteruskan ke downstream service lewat header
5. semua log selama lifecycle request memakai `request_id` yang sama

Dengan begitu, saat ada bug pada `POST /orders`, kita bisa mencari satu ID lalu melihat urutannya dari gateway sampai service terakhir.

## Contoh Log Saat Request Mulai

Saat request baru masuk, simpan informasi minimum untuk memetakan siapa memanggil apa.

```json
{
  "level": "info",
  "msg": "request started",
  "service": "api-gateway",
  "request_id": "req-7e3d90",
  "method": "POST",
  "path": "/api/orders",
  "client_ip": "10.0.0.8",
  "user_id": "42"
}
```

Log start membantu menjawab kapan request masuk dan context apa yang sudah diketahui sebelum proses bisnis berjalan.

## Contoh Log Saat Request Selesai

Saat request selesai, tambahkan hasil akhirnya:

```json
{
  "level": "info",
  "msg": "request finished",
  "service": "api-gateway",
  "request_id": "req-7e3d90",
  "method": "POST",
  "path": "/api/orders",
  "status": 201,
  "duration_ms": 34,
  "user_id": "42"
}
```

Kalau terjadi error:

```json
{
  "level": "error",
  "msg": "request failed",
  "service": "api-gateway",
  "request_id": "req-7e3d90",
  "method": "POST",
  "path": "/api/orders",
  "status": 500,
  "duration_ms": 34,
  "error": "failed to call order-service"
}
```

Pemisahan `request started` dan `request finished` membuat timeline request jauh lebih jelas daripada hanya mencatat error di tengah proses.

## Middleware Logging Bergaya Go/Fiber

Di Fiber, pola paling umum adalah middleware yang:

1. memastikan `request_id` tersedia
2. menyimpan start time
3. memanggil handler berikutnya
4. menghitung durasi
5. menulis log finish dengan status akhir

Pseudocode berikut menunjukkan bentuk middleware yang sederhana:

```go
func RequestLoggingMiddleware(logger Logger) fiber.Handler {
    return func(c *fiber.Ctx) error {
        requestID := c.Get("X-Request-Id")
        if requestID == "" {
            requestID = generateRequestID()
        }

        c.Set("X-Request-Id", requestID)
        c.Locals("request_id", requestID)

        startedAt := time.Now()
        userID, _ := c.Locals("user_id").(string)

        logger.Info("request started",
            "service", "api-gateway",
            "request_id", requestID,
            "method", c.Method(),
            "path", c.Path(),
            "user_id", userID,
        )

        err := c.Next()

        durationMs := time.Since(startedAt).Milliseconds()
        status := c.Response().StatusCode()

        if err != nil {
            logger.Error("request failed",
                "service", "api-gateway",
                "request_id", requestID,
                "method", c.Method(),
                "path", c.Path(),
                "status", status,
                "duration_ms", durationMs,
                "error", err.Error(),
            )
            return err
        }

        logger.Info("request finished",
            "service", "api-gateway",
            "request_id", requestID,
            "method", c.Method(),
            "path", c.Path(),
            "status", status,
            "duration_ms", durationMs,
            "user_id", userID,
        )

        return nil
    }
}
```

Pseudocode ini sengaja netral terhadap library logger. Mau memakai `log/slog`, `zap`, atau wrapper internal, pola field-nya tetap sama.

## Menyimpan Logger di Context

Kalau project ingin lebih rapi, middleware bisa menurunkan logger yang sudah membawa field dasar seperti `service` dan `request_id`. Handler berikutnya tinggal menambahkan field domain-specific:

```go
logger.Info("creating order",
    "request_id", requestID,
    "customer_id", customerID,
    "product_count", len(items),
)
```

Dengan pola ini, handler tidak perlu membangun ulang field umum pada setiap log statement.

## Jangan Log Data Sensitif

Structured logging memudahkan observability, tetapi juga memudahkan kebocoran data kalau field yang ditulis tidak disiplin. Hindari memasukkan:

- password
- access token atau refresh token
- API key
- header `Authorization`
- nomor kartu atau data pembayaran mentah
- data pribadi yang tidak dibutuhkan untuk debugging

Kalau perlu menandai bahwa token memang ada, tulis statusnya saja, misalnya `has_authorization_header: true`, bukan isi header-nya. Prinsipnya: log harus cukup untuk investigasi, bukan cukup untuk merekonstruksi rahasia sistem.

## Contoh Field Yang Aman Untuk Auth

Untuk endpoint login atau route yang dilindungi JWT, cukup log hal-hal seperti:

- `request_id`
- `email_hash` bila benar-benar perlu korelasi
- `user_id` setelah autentikasi sukses
- `status`
- `error`

Jangan pernah menulis password plaintext atau token JWT lengkap ke log, bahkan di environment development. Kebiasaan buruk di local biasanya ikut terbawa ke production.

## Checklist Implementasi Minimum

Sebelum structured logging dianggap cukup rapi, pastikan:

1. semua request memiliki `request_id`
2. gateway meneruskan `X-Request-Id` ke downstream service
3. ada log `request started` dan `request finished`
4. durasi request dicatat dalam `duration_ms`
5. field inti memakai nama yang konsisten antar-service
6. data sensitif tidak pernah ditulis ke log

Kalau checklist ini terpenuhi, log tidak lagi sekadar catatan acak. Ia menjadi alat observability yang bisa dipakai untuk tracing manual, debugging produksi, dan analisis performa dasar.
