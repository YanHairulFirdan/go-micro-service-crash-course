---
title: "Auth Service: Login dan Penerbitan Token"
sidebar_position: 2
slug: /supplemental/auth-service-login-jwt
pagination_prev: supplemental/auth-jwt-overview
pagination_next: supplemental/api-gateway-jwt-verification
---

# Auth Service: Login dan Penerbitan Token

Pada versi sederhana ini, `auth-service` hanya punya satu tugas utama: menerima kredensial login, memvalidasinya, lalu menerbitkan JWT. Service ini tidak perlu mengurus semua kebutuhan identitas modern. Fokusnya hanya pada alur dasar yang bisa langsung dipakai oleh API Gateway.

## Endpoint yang Dibutuhkan

```http
POST /login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "secret123"
}
```

Untuk kebutuhan belajar, endpoint ini sudah cukup mewakili titik masuk autentikasi.

## Bentuk Respons

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

`access_token` dipakai client pada request berikutnya, sedangkan `expires_in` membantu client mengetahui umur token.

## Claim Minimum di JWT

```json
{
  "sub": "1",
  "role": "admin",
  "exp": 1710000000
}
```

- `sub` mewakili user id
- `role` dipakai sebagai contoh konteks otorisasi ringan
- `exp` menentukan kapan token kedaluwarsa

Claim sengaja dibuat minimum agar pembaca fokus pada inti mekanisme token.

## Alur Handler Sederhana

1. baca body login dari request
2. cek user berdasarkan email
3. verifikasi password
4. buat JWT dengan secret yang sama dengan gateway
5. kirim token ke client

Kalau kredensial salah, cukup kembalikan respons `401 Unauthorized`. Belum perlu pembahasan lockout, audit trail, atau mekanisme keamanan tingkat lanjut.

## Contoh Bentuk Pseudocode

```go
func LoginHandler(c *fiber.Ctx) error {
    var req LoginRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "payload tidak valid",
        })
    }

    user, err := authService.FindByEmail(req.Email)
    if err != nil || !CheckPassword(req.Password, user.PasswordHash) {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "message": "email atau password salah",
        })
    }

    token, err := authService.GenerateJWT(user.ID, user.Role)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "message": "gagal membuat token",
        })
    }

    return c.JSON(fiber.Map{
        "access_token": token,
        "token_type":   "Bearer",
        "expires_in":   3600,
    })
}
```

Snippet ini bukan target produksi penuh. Tujuannya hanya menunjukkan bentuk handler yang lazim: parse request, verifikasi user, generate token, lalu kirim respons.

## Catatan Penyederhanaan

Untuk kebutuhan belajar, data user boleh dibuat sederhana, misalnya:

- tabel kecil di database auth
- seeding satu user admin
- atau data hardcoded untuk demo awal

Fokus materi ini ada pada alur penerbitan token, bukan pada desain identitas yang lengkap.
