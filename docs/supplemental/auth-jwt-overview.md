---
title: "Autentikasi JWT: Gambaran Umum"
sidebar_position: 1
slug: /supplemental/auth-jwt-overview
pagination_prev: learning-path/hari-7-integrasi-testing
pagination_next: supplemental/auth-service-login-jwt
---

# Autentikasi JWT: Gambaran Umum

Materi ini adalah lanjutan opsional setelah menyelesaikan 7 hari inti. Tujuannya bukan membangun sistem autentikasi yang lengkap, tetapi menambahkan lapisan keamanan minimum yang realistis untuk arsitektur microservices yang sudah ada.

## Kenapa Auth Ditempatkan di Materi Tambahan

- fondasi service, gRPC, Kafka, dan gateway tetap jadi fokus utama di jalur inti
- autentikasi menambah konsep baru seperti token, secret, middleware, dan identitas user
- memisahkannya sebagai materi tambahan menjaga ritme belajar utama tetap bertahap

Dengan pendekatan ini, pembaca yang baru menyelesaikan materi inti bisa melanjutkan ke auth tanpa harus mengulang struktur sistem dari awal.

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

Sengaja tidak ada verifikasi token di setiap service. Pada materi ini, gateway menjadi titik pemeriksaan utama agar tanggung jawab tiap komponen tetap sederhana.

## Alur Singkat

1. client login ke `auth-service` melalui gateway
2. `auth-service` memvalidasi kredensial
3. `auth-service` mengembalikan JWT ke client
4. client mengirim token itu pada request berikutnya
5. gateway memverifikasi token sebelum meneruskan request
6. gateway meneruskan identitas user ke service downstream

## Scope Materi

- login sederhana untuk mendapatkan access token
- JWT dengan claim minimum seperti `sub` dan `role`
- verifikasi token di API Gateway
- forwarding user context ke downstream service

## Di Luar Scope

- refresh token
- OAuth
- registrasi penuh
- RBAC kompleks
- session management
- secret rotation

Pembatasan ini sengaja dibuat agar materi tetap realistis untuk track tambahan yang singkat.

## Hasil Akhir yang Diharapkan

Setelah track ini selesai, pembaca memahami bahwa:

- autentikasi bisa ditambahkan tanpa membongkar 7 hari inti
- gateway adalah titik verifikasi utama token
- service downstream cukup menerima identitas user yang sudah diteruskan secara internal
