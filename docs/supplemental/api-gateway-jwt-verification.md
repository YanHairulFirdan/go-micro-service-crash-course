---
title: "API Gateway: Verifikasi JWT dan Forward User Context"
sidebar_position: 3
slug: /supplemental/api-gateway-jwt-verification
pagination_prev: supplemental/auth-service-login-jwt
pagination_next: reference/glosarium
---

# API Gateway: Verifikasi JWT dan Forward User Context

Setelah client mendapatkan token dari `auth-service`, semua request yang butuh autentikasi akan melewati API Gateway dengan header berikut:

```http
Authorization: Bearer <token>
```

Gateway akan memeriksa token itu sebelum request diteruskan ke service lain.

## Tanggung Jawab Gateway

- membaca header `Authorization`
- memastikan formatnya `Bearer <token>`
- memverifikasi signature dan expiry JWT
- menolak request tanpa token atau token invalid
- meneruskan identitas user ke downstream service

Dengan cara ini, downstream service tidak harus mengulang decode token untuk setiap request.

## Header Internal ke Downstream

Setelah token valid, gateway bisa meneruskan informasi user melalui header internal:

```http
X-User-Id: 1
X-User-Role: admin
```

Header ini bersifat internal. Client eksternal tidak seharusnya mengandalkannya secara langsung, karena sumber kebenarannya tetap JWT yang sudah diverifikasi di gateway.

## Endpoint yang Layak Diproteksi Lebih Dulu

Untuk tahap awal, tidak semua endpoint harus langsung diamankan. Mulai dari endpoint yang mengubah data atau membaca data sensitif:

- `POST /api/products`
- `POST /api/orders`
- `GET /api/orders/:id`

Sedangkan endpoint publik seperti `GET /api/products` masih bisa tetap dibuka agar onboarding sistem tidak terlalu berat.

## Alur Middleware Sederhana

1. ambil header `Authorization`
2. pastikan formatnya benar
3. parse dan verifikasi JWT
4. ekstrak `sub` dan `role`
5. tambahkan `X-User-Id` dan `X-User-Role`
6. forward request ke downstream

## Contoh Bentuk Pseudocode

```go
func AuthMiddleware(secret string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        authHeader := c.Get("Authorization")
        if authHeader == "" {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "message": "token wajib dikirim",
            })
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        claims, err := VerifyJWT(tokenString, secret)
        if err != nil {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "message": "token tidak valid",
            })
        }

        c.Request().Header.Set("X-User-Id", claims.Subject)
        c.Request().Header.Set("X-User-Role", claims.Role)

        return c.Next()
    }
}
```

Contoh ini sengaja sederhana. Tujuannya menunjukkan bahwa gateway bukan hanya reverse proxy, tetapi juga tempat yang tepat untuk memfilter request sebelum menyentuh logika bisnis.

## Kenapa Verifikasi Dilakukan di Gateway

Dengan menaruh verifikasi di gateway:

- auth logic tidak tersebar ke banyak service
- service downstream tetap fokus pada domain bisnis
- perubahan mekanisme token lebih mudah dikendalikan dari satu titik

Ini bukan satu-satunya pola yang mungkin, tetapi untuk course ini pola tersebut paling mudah dipahami dan cukup realistis.
