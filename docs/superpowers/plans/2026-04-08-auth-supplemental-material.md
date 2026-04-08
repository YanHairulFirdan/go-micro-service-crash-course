# Auth Supplemental Material Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan menu `Materi Tambahan` berisi tiga halaman autentikasi JWT sederhana tanpa mengubah learning path 7 hari inti.

**Architecture:** Perubahan dibatasi pada dokumentasi Docusaurus dan struktur sidebar. Track auth ditempatkan sebagai kategori baru yang terpisah dari jalur inti, lalu dipecah menjadi tiga halaman berurutan: overview, auth service, dan API gateway. Tiap halaman menjelaskan satu tahap alur auth agar pembaca tidak dibebani terlalu banyak konsep sekaligus.

**Tech Stack:** Markdown, Docusaurus, TypeScript sidebar config

---

### Task 1: Tambahkan kategori sidebar untuk materi tambahan

**Files:**
- Modify: `sidebars.ts`

- [ ] **Step 1: Update sidebar dengan kategori baru**

```ts
    {
      type: 'category',
      label: 'Materi Tambahan',
      link: {
        type: 'generated-index',
        title: 'Materi Tambahan',
        description:
          'Topik lanjutan yang melengkapi fondasi microservices utama tanpa mengubah jalur belajar 7 hari inti.',
      },
      items: [
        {
          type: 'doc',
          id: 'supplemental/auth-jwt-overview',
          label: 'Autentikasi JWT: Gambaran Umum',
        },
        {
          type: 'doc',
          id: 'supplemental/auth-service-login-jwt',
          label: 'Auth Service: Login dan JWT',
        },
        {
          type: 'doc',
          id: 'supplemental/api-gateway-jwt-verification',
          label: 'API Gateway: Verifikasi JWT',
        },
      ],
    },
```

- [ ] **Step 2: Simpan kategori setelah `Learning Path` dan sebelum `Reference`**

Run: `sed -n '1,260p' sidebars.ts`
Expected: kategori `Materi Tambahan` muncul di antara `Learning Path` dan `Reference`

- [ ] **Step 3: Commit perubahan sidebar**

```bash
git add sidebars.ts
git commit -m "Add supplemental auth category to docs sidebar"
```

### Task 2: Tulis halaman overview autentikasi

**Files:**
- Create: `docs/supplemental/auth-jwt-overview.md`

- [ ] **Step 1: Buat dokumen overview**

```md
---
title: Autentikasi JWT: Gambaran Umum
sidebar_position: 1
slug: /supplemental/auth-jwt-overview
pagination_next: supplemental/auth-service-login-jwt
---

# Autentikasi JWT: Gambaran Umum

Materi ini adalah lanjutan opsional setelah menyelesaikan 7 hari inti. Tujuannya bukan membangun sistem autentikasi yang lengkap, tetapi menambahkan lapisan keamanan minimum yang realistis untuk arsitektur microservices yang sudah ada.

## Kenapa Auth Ditempatkan di Materi Tambahan

- fondasi service, gRPC, Kafka, dan gateway tetap jadi fokus utama di jalur inti
- autentikasi menambah kompleksitas baru: token, header, middleware, dan identitas user
- memisahkannya sebagai materi tambahan menjaga ritme belajar tetap bertahap

## Gambaran Arsitektur

```text
Client
  │
  ├── POST /auth/login ───────────────► API Gateway ───────────────► auth-service
  │                                          │
  │                                          └── menerima JWT
  │
  └── request dengan Bearer token ───► API Gateway
                                             │
                                             ├── verifikasi JWT
                                             ├── inject X-User-Id / X-User-Role
                                             └── forward ke service tujuan
```

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

## Hasil Akhir yang Diharapkan

Setelah track ini selesai, pembaca memahami bahwa gateway adalah titik verifikasi utama token, sedangkan service lain cukup menerima identitas user yang sudah diteruskan secara internal.
```

- [ ] **Step 2: Verifikasi isi halaman**

Run: `sed -n '1,220p' docs/supplemental/auth-jwt-overview.md`
Expected: halaman menjelaskan posisi auth sebagai materi tambahan dan menggambarkan alur JWT end-to-end

- [ ] **Step 3: Commit halaman overview**

```bash
git add docs/supplemental/auth-jwt-overview.md
git commit -m "Add supplemental auth overview page"
```

### Task 3: Tulis halaman auth service

**Files:**
- Create: `docs/supplemental/auth-service-login-jwt.md`

- [ ] **Step 1: Buat dokumen auth service**

```md
---
title: Auth Service: Login dan Penerbitan Token
sidebar_position: 2
slug: /supplemental/auth-service-login-jwt
pagination_prev: supplemental/auth-jwt-overview
pagination_next: supplemental/api-gateway-jwt-verification
---

# Auth Service: Login dan Penerbitan Token

Pada versi sederhana ini, `auth-service` hanya punya satu tugas utama: menerima kredensial login, memvalidasinya, lalu menerbitkan JWT.

## Endpoint yang Dibutuhkan

```http
POST /login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "secret123"
}
```

## Bentuk Respons

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Claim Minimum di JWT

```json
{
  "sub": "1",
  "role": "admin",
  "exp": 1710000000
}
```

`sub` mewakili user id, sedangkan `role` cukup untuk contoh otorisasi ringan di tahap berikutnya.

## Contoh Alur Handler

1. baca body login
2. cek user berdasarkan email
3. verifikasi password
4. buat JWT dengan secret yang sama dengan gateway
5. kembalikan token ke client

## Catatan Penyederhanaan

Untuk kebutuhan belajar, data user boleh dibuat sederhana, misalnya tabel kecil atau data hardcoded. Fokus materi ini ada pada alur penerbitan token, bukan pada desain identitas yang lengkap.
```

- [ ] **Step 2: Verifikasi isi halaman**

Run: `sed -n '1,260p' docs/supplemental/auth-service-login-jwt.md`
Expected: halaman menjelaskan endpoint login, respons token, claim JWT, dan langkah dasar pembuatan token

- [ ] **Step 3: Commit halaman auth service**

```bash
git add docs/supplemental/auth-service-login-jwt.md
git commit -m "Add auth service supplemental page"
```

### Task 4: Tulis halaman API Gateway

**Files:**
- Create: `docs/supplemental/api-gateway-jwt-verification.md`

- [ ] **Step 1: Buat dokumen verifikasi JWT di gateway**

```md
---
title: API Gateway: Verifikasi JWT dan Forward User Context
sidebar_position: 3
slug: /supplemental/api-gateway-jwt-verification
pagination_prev: supplemental/auth-service-login-jwt
---

# API Gateway: Verifikasi JWT dan Forward User Context

Setelah client mendapatkan token dari `auth-service`, semua request yang butuh autentikasi akan melewati API Gateway dengan header:

```http
Authorization: Bearer <token>
```

## Tanggung Jawab Gateway

- membaca header `Authorization`
- memverifikasi signature dan expiry JWT
- menolak request tanpa token atau token invalid
- meneruskan identitas user ke downstream service

## Header Internal ke Downstream

Setelah token valid, gateway bisa meneruskan:

```http
X-User-Id: 1
X-User-Role: admin
```

Header ini bersifat internal. Client eksternal tidak seharusnya mengandalkannya secara langsung.

## Endpoint yang Layak Diproteksi Lebih Dulu

- `POST /api/products`
- `POST /api/orders`
- `GET /api/orders/:id`

Sedangkan endpoint baca publik seperti `GET /api/products` bisa tetap dibuka pada tahap awal.

## Alur Middleware Sederhana

1. ambil header `Authorization`
2. pastikan formatnya `Bearer <token>`
3. parse dan verifikasi JWT
4. ekstrak `sub` dan `role`
5. tambahkan `X-User-Id` dan `X-User-Role`
6. forward request ke downstream

## Kenapa Verifikasi Dilakukan di Gateway

Dengan menaruh verifikasi di gateway, service downstream tidak perlu mengulang decode JWT di setiap service. Pola ini menjaga tanggung jawab tetap jelas: gateway memeriksa identitas, service fokus ke logika bisnis.
```

- [ ] **Step 2: Verifikasi isi halaman**

Run: `sed -n '1,260p' docs/supplemental/api-gateway-jwt-verification.md`
Expected: halaman menjelaskan header `Authorization`, verifikasi JWT, dan forwarding context user

- [ ] **Step 3: Commit halaman gateway**

```bash
git add docs/supplemental/api-gateway-jwt-verification.md
git commit -m "Add API gateway JWT supplemental page"
```

### Task 5: Verifikasi akhir dokumentasi

**Files:**
- Modify: `sidebars.ts`
- Create: `docs/supplemental/auth-jwt-overview.md`
- Create: `docs/supplemental/auth-service-login-jwt.md`
- Create: `docs/supplemental/api-gateway-jwt-verification.md`

- [ ] **Step 1: Cek struktur file auth**

Run: `rg --files docs/supplemental`
Expected: tiga file auth tambahan muncul dalam folder `docs/supplemental`

- [ ] **Step 2: Build site**

Run: `npm run build`
Expected: build sukses tanpa broken sidebar atau error markdown

- [ ] **Step 3: Cek status git**

Run: `git status --short`
Expected: hanya file sidebar dan tiga halaman auth yang muncul sebagai perubahan

- [ ] **Step 4: Commit verifikasi akhir**

```bash
git add sidebars.ts docs/supplemental
git commit -m "Add supplemental JWT authentication materials"
```
