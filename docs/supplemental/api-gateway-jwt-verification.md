---
title: "API Gateway: Verifikasi JWT dan Forward User Context"
sidebar_position: 3
slug: /supplemental/api-gateway-jwt-verification
pagination_prev: supplemental/auth-service-login-jwt
pagination_next: supplemental/structured-logging
---

# API Gateway: Verifikasi JWT dan Forward User Context

Setelah client mendapatkan token dari `auth-service`, langkah berikutnya adalah memeriksa token itu sebelum request diteruskan ke service lain. Pada arsitektur ini, tempat yang paling masuk akal untuk melakukannya adalah `api-gateway`.

Dengan pendekatan itu:

- `auth-service` cukup fokus pada login
- `product-service` dan `order-service` tidak perlu mengulang verifikasi token
- logika keamanan dasar terkumpul di satu titik masuk

## Header Yang Diterima Dari Client

Client mengirim token dengan format berikut:

```http
Authorization: Bearer <token>
```

Kalau header ini hilang, formatnya salah, atau token gagal diverifikasi, gateway harus menghentikan request dan mengembalikan `401 Unauthorized`.

## Route Yang Biasanya Diproteksi Lebih Dulu

Tidak semua route harus diamankan sekaligus. Mulai dari route yang mengubah data atau membaca data sensitif, misalnya:

- `POST /api/products`
- `POST /api/orders`
- `GET /api/orders/:id`

Sedangkan route publik seperti `GET /api/products` masih bisa tetap dibuka agar onboarding sistem tidak terlalu berat.

## Langkah Middleware di Gateway

Untuk middleware Fiber yang sederhana, urutannya seperti ini:

1. baca header `Authorization`
2. pastikan formatnya `Bearer <token>`
3. ambil token dari header
4. parse JWT dan pastikan algoritmanya sesuai
5. verifikasi signature memakai `JWT_SECRET`
6. verifikasi claim penting seperti `exp`, `iss`, dan `aud`
7. ekstrak `sub` dan `role`
8. simpan context user untuk request saat ini
9. tambahkan `X-User-Id` dan `X-User-Role` ke request internal
10. lanjutkan request ke proxy atau handler berikutnya

Kalau gagal di langkah 4 sampai 6, request tidak boleh diteruskan ke downstream service.

## Contoh Middleware Fiber

```go
type TokenClaims struct {
    Role string `json:"role"`
    jwt.RegisteredClaims
}

func AuthMiddleware(secret, issuer, audience string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        authHeader := c.Get("Authorization")
        if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "message": "token wajib dikirim dengan format Bearer",
            })
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        claims := &TokenClaims{}

        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            if token.Method != jwt.SigningMethodHS256 {
                return nil, fmt.Errorf("algoritma token tidak didukung")
            }

            return []byte(secret), nil
        })
        if err != nil || !token.Valid {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "message": "token tidak valid",
            })
        }

        if claims.Issuer != issuer || !claims.VerifyAudience(audience, true) {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "message": "claim token tidak cocok",
            })
        }

        c.Locals("user_id", claims.Subject)
        c.Locals("user_role", claims.Role)

        c.Request().Header.Set("X-User-Id", claims.Subject)
        c.Request().Header.Set("X-User-Role", claims.Role)

        return c.Next()
    }
}
```

Contoh ini menunjukkan tiga tanggung jawab utama middleware:

- menolak token yang salah sedini mungkin
- menyiapkan user context untuk handler di gateway
- meneruskan identitas minimum ke downstream lewat header internal

## Contoh Pemasangan ke Route Terproteksi

Pola paling mudah dipahami adalah memisahkan route publik dan route yang memakai middleware auth.

```go
app := fiber.New()

api := app.Group("/api")
api.Get("/products", gatewayHandler.ListProducts)

protected := api.Use(AuthMiddleware(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAudience))
protected.Post("/products", gatewayHandler.CreateProduct)
protected.Post("/orders", gatewayHandler.CreateOrder)
protected.Get("/orders/:id", gatewayHandler.GetOrderByID)
```

Dengan pola ini:

- `GET /api/products` tetap publik
- route yang sensitif wajib melewati middleware auth
- daftar route terlindungi terlihat jelas di satu tempat

## Forward `X-User-Id` dan `X-User-Role`

Setelah token valid, gateway bisa meneruskan identitas user ke downstream service melalui header internal:

```http
X-User-Id: 1
X-User-Role: admin
```

Header ini bukan kontrak untuk client eksternal. Sumber kebenarannya tetap JWT yang sudah diverifikasi di gateway.

Kalau gateway bertugas sebagai HTTP proxy, header tersebut perlu dikirim ulang saat meneruskan request ke service tujuan:

```go
req.Header.Set("X-User-Id", c.Locals("user_id").(string))
req.Header.Set("X-User-Role", c.Locals("user_role").(string))
```

Di sisi downstream, service cukup membaca header internal itu bila dibutuhkan untuk domain logic atau logging audit sederhana.

## Flow Lengkap Dari Token Sampai Downstream

Urutannya seperti ini:

1. client login ke `POST /auth/login`
2. `auth-service` mengembalikan `access_token`
3. client mengirim request ke route terproteksi dengan `Authorization: Bearer <token>`
4. gateway middleware memverifikasi token
5. gateway mengekstrak `sub` dan `role`
6. gateway menambahkan `X-User-Id` dan `X-User-Role`
7. request diteruskan ke `product-service` atau `order-service`

Kalau token invalid atau expired, flow berhenti di langkah 4 dan client menerima `401 Unauthorized`.

## Checklist Implementasi Minimum

Sebelum lanjut ke logging, pastikan:

1. gateway membaca `JWT_SECRET`, `JWT_ISSUER`, dan `JWT_AUDIENCE` dari config
2. middleware memeriksa format `Authorization: Bearer <token>`
3. signature dan expiry JWT benar-benar diverifikasi
4. route sensitif sudah dipasang middleware auth
5. gateway meneruskan `X-User-Id` dan `X-User-Role` ke downstream request
6. token invalid menghasilkan `401 Unauthorized` sebelum logika bisnis dijalankan

Kalau checklist ini terpenuhi, maka alur JWT minimum untuk arsitektur Go microservices sudah utuh: login terjadi di `auth-service`, verifikasi terjadi di gateway, dan service downstream menerima identitas user yang sudah diverifikasi.
