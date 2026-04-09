---
title: "Autentikasi JWT: Gambaran Umum"
sidebar_position: 1
slug: /supplemental/auth-jwt-overview
pagination_prev: supplemental/request-validation
pagination_next: supplemental/auth-service-login-jwt
---

# Autentikasi JWT: Gambaran Umum

Materi ini adalah lanjutan opsional setelah pembaca memahami konfigurasi environment dan validasi request. Tujuannya bukan membangun sistem autentikasi yang lengkap, tetapi menambahkan lapisan keamanan minimum yang realistis ke arsitektur Go microservices yang sudah ada.

Pada track ini, kita hanya mengejar alur berikut:

- client login ke `POST /auth/login`
- `auth-service` memverifikasi user dan menerbitkan JWT
- client mengirim `Authorization: Bearer <token>`
- `api-gateway` memverifikasi token sebelum request diteruskan
- service downstream menerima identitas user dari gateway

Dengan scope sekecil ini, pembaca bisa melihat auth end-to-end tanpa langsung masuk ke refresh token, OAuth, atau RBAC kompleks.

## Posisi Auth Setelah Config dan Validation

Urutannya sengaja dibuat seperti ini:

1. environment management
   karena `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, dan URL service harus siap saat startup
2. request validation
   karena payload login tetap harus divalidasi sebelum masuk ke service layer
3. auth JWT
   karena auth bergantung pada config yang valid dan boundary request yang rapi

Jadi auth tidak berdiri sendiri. Ia ditambahkan setelah fondasi konfigurasi dan validasi sudah jelas.

## Gambaran Arsitektur

```text
Client
  │
  ├── POST /auth/login ───────────────► API Gateway ───────────────► auth-service
  │                                          │
  │                                          └── menerima access token
  │
  └── request dengan Bearer token ───► API Gateway
                                             │
                                             ├── verifikasi JWT
                                             ├── inject X-User-Id / X-User-Role
                                             └── forward ke service tujuan
```

Sengaja tidak ada verifikasi token di setiap service. Pada supplemental ini, gateway menjadi titik pemeriksaan utama agar tanggung jawab tetap sederhana:

- `auth-service` fokus ke login dan penerbitan token
- `api-gateway` fokus ke verifikasi token dan routing
- `product-service` atau `order-service` fokus ke logika bisnis

## Peta Implementasi End-to-End

Kalau dipecah menjadi langkah implementasi nyata, urutannya seperti ini:

1. `auth-service` membaca `JWT_SECRET`, `JWT_ISSUER`, dan `JWT_AUDIENCE` dari environment
2. `auth-service` menyediakan endpoint `POST /auth/login`
3. login handler mem-parse payload `email` dan `password`
4. handler mencari user berdasarkan email di database auth
5. password plaintext dibandingkan dengan `password_hash`
6. jika valid, `auth-service` membuat JWT dengan claim minimum seperti `sub` dan `role`
7. gateway mengembalikan respons login ke client berisi `access_token`
8. client menyimpan token dan mengirimkannya pada request berikutnya melalui header `Authorization: Bearer <token>`
9. middleware auth di gateway membaca header tersebut
10. gateway memverifikasi signature, issuer, audience, dan expiry JWT
11. jika token valid, gateway menambahkan `X-User-Id` dan `X-User-Role` ke request internal
12. request diteruskan ke service tujuan

Kalau salah di langkah 4 atau 5, client menerima `401 Unauthorized` dari `auth-service`. Kalau salah di langkah 10, client menerima `401 Unauthorized` dari gateway. Ini penting karena sumber error-nya berbeda:

- login gagal berarti kredensial salah
- request terproteksi gagal berarti token tidak valid, kedaluwarsa, atau tidak dikirim

## Apa yang Sebenarnya Disimpan di JWT

Untuk tahap awal, claim minimum berikut sudah cukup:

```json
{
  "sub": "1",
  "role": "admin",
  "iss": "learning-platform",
  "aud": "learning-platform-client",
  "exp": 1710000000
}
```

Arti setiap claim:

- `sub` adalah user ID yang akan dipakai gateway dan downstream
- `role` memberi konteks otorisasi ringan
- `iss` membantu gateway memastikan token dibuat oleh issuer yang benar
- `aud` membantu membatasi token hanya untuk consumer yang tepat
- `exp` menentukan kapan token tidak boleh dipakai lagi

Kita sengaja tidak memasukkan seluruh profil user ke token. JWT di track ini hanya membawa identitas minimum yang dibutuhkan gateway.

## Bagian Mana Yang Dibangun di Materi Berikutnya

Dua halaman setelah ini memecah implementasi menjadi dua bagian konkret:

1. `auth-service`
   membuat endpoint login, membaca user, memverifikasi password, lalu menandatangani JWT
2. `api-gateway`
   memasang middleware untuk memeriksa bearer token dan meneruskan context user ke downstream

Kalau dua komponen itu sudah jalan, arsitektur inti 7 hari tidak perlu dibongkar. Kita hanya menambahkan satu service auth dan satu lapisan verifikasi di gateway.

## Di Luar Scope

Beberapa hal berikut sengaja tidak dibahas sekarang:

- refresh token
- OAuth atau social login
- registrasi user penuh
- session management
- secret rotation
- RBAC kompleks

Pembatasan ini membuat track auth tetap praktis dan bisa diselesaikan tanpa memperlebar scope course.

## Hasil Akhir Yang Diharapkan

Setelah menyelesaikan tiga halaman auth ini, pembaca harus bisa menjawab pertanyaan praktis berikut:

- endpoint mana yang mengeluarkan token
- data user minimum apa yang dibutuhkan untuk login
- token dibentuk dengan claim apa saja
- di mana token diverifikasi
- bagaimana identitas user diteruskan ke service downstream
