# Go Supplemental Material Design

## Goal

Menyamakan struktur dan kedalaman track supplemental di `docusaurus-site` dengan `panduan-microservice-nestjs`, sambil tetap mempertahankan implementasi yang sesuai dengan stack Go pada site ini.

## Scope

Perubahan mencakup:

- restrukturisasi sidebar `Materi Tambahan` menjadi `Foundations`, `Security`, dan `Operations`
- penambahan empat dokumen supplemental baru:
  - environment management
  - request validation
  - structured logging
  - database migration
- perapihan tiga dokumen auth yang sudah ada agar lebih implementatif
- penyusunan ulang pagination supaya alur belajar berjalan dari Hari 7 ke Foundations, lalu Security, lalu Operations, lalu kembali ke Reference

Di luar scope:

- mengubah learning path utama 7 hari
- menambahkan topik auth lanjutan seperti refresh token atau OAuth
- membangun contoh kode runnable di repo terpisah

## Information Architecture

Kategori `Materi Tambahan` akan dipecah menjadi:

1. `Foundations`
   - `Environment Management`
   - `Request Validation`
2. `Security`
   - `Autentikasi JWT: Gambaran Umum`
   - `Auth Service: Login dan JWT`
   - `API Gateway: Verifikasi JWT`
3. `Operations`
   - `Structured Logging`
   - `Database Migration`

Alur pagination:

- Hari 7 -> Environment Management
- Environment Management -> Request Validation
- Request Validation -> Auth JWT Overview
- Auth JWT Overview -> Auth Service Login
- Auth Service Login -> API Gateway JWT Verification
- API Gateway JWT Verification -> Structured Logging
- Structured Logging -> Database Migration
- Database Migration -> Glosarium

## Content Strategy

Setiap dokumen supplemental baru atau yang dirapikan harus:

- lebih konkret daripada versi konseptual lama
- menunjukkan konteks nyata di arsitektur Go pada site ini
- memberi contoh implementasi yang cukup realistis untuk diikuti
- tetap menjaga scope tetap basic dan core

Penyesuaian per topik:

- `Environment Management`
  - contoh `.env`
  - pembacaan config di startup service Go
  - validasi config penting seperti `JWT_SECRET` dan service URL
- `Request Validation`
  - validasi payload login dan order
  - parsing body dan pengecekan field minimum
  - pembedaan validasi request vs validasi bisnis
- `Auth JWT Overview`
  - diposisikan sebagai peta implementasi auth tambahan
  - menghubungkan config, validation, auth-service, dan gateway
- `Auth Service: Login dan JWT`
  - alur handler login Go yang lebih konkret
  - lookup user, cek password, generate token, respons
- `API Gateway: Verifikasi JWT`
  - middleware verifikasi token di gateway
  - inject `X-User-Id` dan `X-User-Role`
  - proteksi endpoint terpilih
- `Structured Logging`
  - request ID
  - structured log untuk request masuk dan selesai
  - catatan soal data sensitif
- `Database Migration`
  - `goose` sebagai tool utama
  - flow lengkap: create migration, isi `up/down`, run, rollback, verify
  - catatan singkat tentang alternatif seperti `sql-migrate` dan tool lain

## File Changes

Modify:

- `sidebars.ts`
- `docs/supplemental/auth-jwt-overview.md`
- `docs/supplemental/auth-service-login-jwt.md`
- `docs/supplemental/api-gateway-jwt-verification.md`

Create:

- `docs/supplemental/environment-management.md`
- `docs/supplemental/request-validation.md`
- `docs/supplemental/structured-logging.md`
- `docs/supplemental/database-migration.md`

## Verification

Verifikasi utama:

- `npm run -s build` di `docusaurus-site`

Kriteria sukses:

- semua doc ID di sidebar valid
- pagination berantai tanpa broken link
- materi supplemental baru muncul dalam urutan yang benar
- build Docusaurus sukses
