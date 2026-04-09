---
title: "Auth Service: Login dan Penerbitan Token"
sidebar_position: 2
slug: /supplemental/auth-service-login-jwt
pagination_prev: supplemental/auth-jwt-overview
pagination_next: supplemental/api-gateway-jwt-verification
---

# Auth Service: Login dan Penerbitan Token

Pada arsitektur ini, `auth-service` punya satu tugas utama: menerima kredensial login, memvalidasinya terhadap data user, lalu menerbitkan JWT yang nantinya diverifikasi oleh `api-gateway`.

Materi ini akan menjawab empat hal:

- endpoint apa yang perlu dibuat
- field user minimum apa yang dibutuhkan
- apa yang terjadi di login handler
- respons token seperti apa yang dikembalikan ke client

## Endpoint Yang Dibutuhkan

Untuk tahap dasar, satu endpoint ini sudah cukup:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "secret123"
}
```

Di level gateway, path ini tetap terlihat sebagai `POST /auth/login`. Gateway cukup meneruskan request ke `auth-service`, lalu `auth-service` menangani proses login sebenarnya.

## Field Minimum di Tabel User

Supaya alur login bisa jalan, tabel `users` tidak perlu rumit. Field minimum berikut sudah cukup:

```text
id | email | password_hash | role | is_active
```

Fungsi tiap field:

- `id` menjadi nilai `sub` di JWT
- `email` dipakai untuk mencari user saat login
- `password_hash` dipakai untuk verifikasi password
- `role` diteruskan ke token dan ke gateway
- `is_active` membantu menolak user yang tidak boleh login lagi

Kalau ingin lebih sederhana, `is_active` bisa dianggap selalu `true` untuk seeded demo user. Tetapi menuliskannya sejak awal membuat flow login lebih realistis.

## Bentuk Request dan Response

Request login:

```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```

Response sukses:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "1",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Field `user` tidak wajib untuk semua sistem, tetapi cukup membantu pada project belajar karena client bisa langsung tahu identitas dasar yang sedang aktif tanpa perlu memanggil endpoint profile terpisah.

## Flow Konkret di Login Handler

Urutan kerja handler login yang sehat biasanya seperti ini:

1. parse body JSON ke struct request
2. validasi bahwa `email` dan `password` tidak kosong
3. cari user berdasarkan email
4. pastikan user ditemukan dan masih aktif
5. bandingkan password plaintext dengan `password_hash`
6. buat payload JWT dari `id` dan `role`
7. sign token memakai `JWT_SECRET`
8. kembalikan `access_token`, `token_type`, `expires_in`, dan identitas minimum user

Kalau langkah 3, 4, atau 5 gagal, respons yang tepat adalah `401 Unauthorized` dengan pesan generik seperti `email atau password salah`. Jangan membocorkan apakah email memang ada di database.

## Contoh Struct dan Handler Fiber

```go
type LoginRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type LoginResponse struct {
    AccessToken string `json:"access_token"`
    TokenType   string `json:"token_type"`
    ExpiresIn   int64  `json:"expires_in"`
    User        struct {
        ID    string `json:"id"`
        Email string `json:"email"`
        Role  string `json:"role"`
    } `json:"user"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
    var req LoginRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "body tidak valid",
        })
    }

    if req.Email == "" || req.Password == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "email dan password wajib diisi",
        })
    }

    user, err := h.userRepo.FindByEmail(c.Context(), req.Email)
    if err != nil || user == nil || !user.IsActive {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "message": "email atau password salah",
        })
    }

    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
        return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "message": "email atau password salah",
        })
    }

    token, expiresIn, err := h.jwtSigner.Generate(user.ID, user.Role)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "message": "gagal membuat access token",
        })
    }

    return c.JSON(fiber.Map{
        "access_token": token,
        "token_type":   "Bearer",
        "expires_in":   expiresIn,
        "user": fiber.Map{
            "id":    user.ID,
            "email": user.Email,
            "role":  user.Role,
        },
    })
}
```

Struktur ini cukup dekat dengan implementasi nyata di Go:

- handler tipis
- repository mengambil user
- `bcrypt` dipakai untuk verifikasi password
- pembuatan JWT dipisah ke komponen signer agar mudah dites

## Verifikasi Password

Password tidak pernah disimpan dalam bentuk plaintext. Yang disimpan di database adalah `password_hash`, lalu saat login password dari client dibandingkan terhadap hash itu.

Contoh verifikasi:

```go
err := bcrypt.CompareHashAndPassword(
    []byte(user.PasswordHash),
    []byte(req.Password),
)
```

Kalau `err != nil`, anggap kredensial tidak valid dan kembalikan `401 Unauthorized`.

Untuk demo awal, cukup gunakan `golang.org/x/crypto/bcrypt`. Yang penting adalah polanya:

- hash dibuat saat seed atau pembuatan user
- login hanya melakukan compare
- aplikasi tidak pernah perlu membaca password asli user

## Generasi JWT

JWT minimal untuk track ini bisa membawa claim berikut:

```json
{
  "sub": "1",
  "role": "admin",
  "iss": "learning-platform",
  "aud": "learning-platform-client",
  "exp": 1710000000
}
```

Contoh fungsi signer di Go:

```go
type TokenClaims struct {
    Role string `json:"role"`
    jwt.RegisteredClaims
}

func (s *JWTSigner) Generate(userID string, role string) (string, int64, error) {
    expiresIn := int64(3600)
    claims := TokenClaims{
        Role: role,
        RegisteredClaims: jwt.RegisteredClaims{
            Subject:   userID,
            Issuer:    s.issuer,
            Audience:  []string{s.audience},
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiresIn) * time.Second)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    signedToken, err := token.SignedString([]byte(s.secret))
    if err != nil {
        return "", 0, err
    }

    return signedToken, expiresIn, nil
}
```

Di sini ada tiga hal penting:

- `sub` diisi dari `user.ID`
- `role` diambil dari tabel user
- secret, issuer, dan audience datang dari config yang sudah dibahas sebelumnya

## Checklist Seeder Admin atau Demo User

Sebelum menguji login, pastikan seeded user memang sesuai dengan flow ini. Checklist minimumnya:

1. ada satu user demo, misalnya `admin@example.com`
2. password seed sudah di-hash, bukan plaintext
3. role user jelas, misalnya `admin`
4. `is_active` bernilai `true`
5. email seed sama dengan yang dipakai di contoh request login
6. `JWT_SECRET` di `auth-service` sama dengan yang akan dipakai gateway

Contoh data seed:

```text
email: admin@example.com
password: secret123
role: admin
is_active: true
```

Saat seeding, password `secret123` harus diubah menjadi bcrypt hash sebelum disimpan.

## Hasil Yang Harus Sudah Jadi Setelah Halaman Ini

Kalau implementasi `auth-service` sudah benar, maka hasil minimumnya adalah:

- `POST /auth/login` menerima email dan password
- service bisa membaca user dari database auth
- password diverifikasi terhadap hash
- JWT berhasil dibuat dengan `sub` dan `role`
- client menerima response payload yang siap dipakai pada header bearer token

Halaman berikutnya melanjutkan flow itu dari sisi gateway: token yang baru dibuat akan diverifikasi sebelum request diteruskan ke downstream service.
