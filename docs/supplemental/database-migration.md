---
title: "Database Migration: Menjaga Perubahan Schema"
sidebar_position: 2
slug: /supplemental/database-migration
pagination_prev: supplemental/structured-logging
pagination_next: reference/glosarium
---

# Database Migration: Menjaga Perubahan Schema

Begitu aplikasi mulai berkembang, schema database ikut berubah. Kita menambah tabel, mengganti kolom, menambah index, atau memperbaiki constraint. Kalau perubahan itu hanya dilakukan manual lewat GUI database atau query yang diketik langsung, tim cepat kehilangan jejak:

- environment development dan production bisa berbeda
- developer baru tidak tahu urutan perubahan schema
- rollback jadi berbahaya karena tidak ada langkah balik yang jelas
- deploy aplikasi bisa gagal karena kode baru mengasumsikan schema yang belum ada

Karena itu, perubahan schema harus diperlakukan seperti kode: disimpan di repository, ditinjau, dijalankan berurutan, dan bisa diverifikasi. Di Go, salah satu tool yang umum dan sederhana untuk ini adalah `goose`.

## Kenapa Perubahan Manual Saja Tidak Cukup

Mengubah schema langsung di database mungkin terasa cepat saat project masih kecil, tetapi pendekatan ini tidak stabil untuk kerja tim atau deploy berulang.

Masalah yang biasanya muncul:

1. perubahan tidak terdokumentasi dengan baik
2. urutan query antar-environment tidak konsisten
3. tidak ada sumber kebenaran yang bisa dijalankan ulang
4. rollback mengandalkan ingatan, bukan file yang terdokumentasi

Dengan migration file, perubahan schema menjadi proses yang bisa diulang. Repository berisi riwayat perubahan yang sama untuk semua environment.

## Kenapa `goose`

Untuk course ini, `goose` cocok karena:

- sederhana untuk dijalankan dari command line
- mendukung file SQL murni, jadi pembaca tetap belajar SQL secara langsung
- menyimpan status migration yang sudah dijalankan
- cocok untuk project Go yang ingin flow eksplisit dan mudah diaudit

Kita akan memakai migration berbasis SQL agar perubahan schema tetap terlihat jelas tanpa tersembunyi di balik abstraksi yang terlalu tinggi.

## Flow Lengkap Yang Akan Dipakai

Urutan kerja migration yang sehat seperti ini:

1. install `goose`
2. buat file migration baru
3. tulis bagian `up` untuk menerapkan perubahan
4. tulis bagian `down` untuk rollback
5. jalankan migration
6. verifikasi hasil schema di database
7. jalankan rollback
8. verifikasi bahwa rollback benar-benar mengembalikan kondisi sebelumnya

Kalau satu langkah ini dilewati, kita kehilangan kepercayaan pada proses deploy schema.

## 1. Install `goose`

Salah satu cara yang umum:

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

Pastikan binary `goose` sudah ada di `PATH`. Setelah itu, kita bisa memakainya untuk membuat dan menjalankan migration.

## 2. Siapkan Folder Migration

Pilih satu lokasi yang konsisten, misalnya:

```text
db/migrations
```

Struktur sederhananya bisa seperti ini:

```text
.
├── cmd/
├── internal/
├── db/
│   └── migrations/
└── go.mod
```

Yang penting bukan nama foldernya, tetapi konsistensinya. Semua migration file harus hidup di satu tempat agar pipeline deploy tahu harus membaca dari mana.

## 3. Buat File Migration Baru

Misalnya kita ingin menambah tabel `users`:

```bash
goose -dir db/migrations create create_users_table sql
```

Command ini akan membuat file dengan awalan timestamp, misalnya:

```text
db/migrations/20260409103000_create_users_table.sql
```

Timestamp di nama file menjaga urutan eksekusi migration.

## 4. Tulis Bagian `up` dan `down`

Isi file migration SQL bisa dibuat seperti ini:

```sql
-- +goose Up
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- +goose Down
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

Bagian `up` adalah perubahan yang diterapkan saat schema maju. Bagian `down` adalah langkah balik bila migration perlu dibatalkan.

Tulislah `down` dengan serius. Migration tanpa rollback yang jelas sering terlihat cepat di awal, lalu menyulitkan saat deploy bermasalah.

## 5. Jalankan Migration

Contoh untuk PostgreSQL:

```bash
goose -dir db/migrations postgres "postgres://postgres:postgres@localhost:5432/app_db?sslmode=disable" up
```

Setelah dijalankan, `goose` akan:

- memastikan tabel versi migration tersedia
- membaca migration yang belum pernah dijalankan
- mengeksekusi file sesuai urutan timestamp
- mencatat migration yang sukses

Dalam praktik project nyata, connection string biasanya tidak ditulis langsung di command, tetapi diambil dari environment variable.

## 6. Verifikasi Hasil Migration

Jangan berhenti setelah command `up` sukses. Tetap cek apakah schema benar-benar berubah sesuai ekspektasi.

Yang bisa diverifikasi:

1. tabel baru memang ada
2. kolom yang diharapkan terbentuk dengan tipe yang benar
3. index atau constraint ikut terbentuk
4. aplikasi bisa membaca atau menulis data dengan schema baru

Contoh verifikasi cepat di PostgreSQL:

```sql
\d users
```

Atau cek daftar migration yang sudah tercatat:

```bash
goose -dir db/migrations postgres "postgres://postgres:postgres@localhost:5432/app_db?sslmode=disable" status
```

Kalau `status` menunjukkan migration terbaru sudah `applied`, lalu schema di database juga sesuai, barulah langkah ini dianggap selesai.

## 7. Jalankan Rollback

Untuk membatalkan migration terakhir:

```bash
goose -dir db/migrations postgres "postgres://postgres:postgres@localhost:5432/app_db?sslmode=disable" down
```

Command ini akan menjalankan bagian `down` dari migration terakhir yang sudah `applied`.

Rollback penting untuk dua alasan:

- memastikan file `down` memang valid
- memberi jalur keluar saat deploy schema menimbulkan masalah

Kalau rollback tidak pernah diuji, kita sebenarnya belum tahu apakah migration itu aman.

## 8. Verifikasi Hasil Rollback

Setelah rollback, cek lagi database:

1. tabel atau kolom yang tadi dibuat memang hilang
2. index yang terkait juga hilang
3. status migration kembali berubah

Contoh:

```bash
goose -dir db/migrations postgres "postgres://postgres:postgres@localhost:5432/app_db?sslmode=disable" status
```

Lalu cek schema:

```sql
\d users
```

Kalau tabel sudah tidak ada, berarti rollback benar-benar bekerja. Verifikasi seperti ini penting karena command berhasil belum tentu berarti schema akhir sesuai harapan.

## Menjalankan Ulang Setelah Rollback

Setelah rollback berhasil diverifikasi, migration bisa dijalankan lagi dengan `up` untuk memastikan file yang sama tetap bisa dipakai secara konsisten:

```bash
goose -dir db/migrations postgres "postgres://postgres:postgres@localhost:5432/app_db?sslmode=disable" up
```

Flow `up -> verify -> down -> verify -> up` memberi kepercayaan lebih tinggi daripada sekadar menjalankan satu arah.

## Kapan Migration Dijalankan

Di project kecil, migration sering dijalankan manual sebelum aplikasi start. Di project yang lebih rapi, migration menjadi bagian dari pipeline deploy atau langkah startup yang terkontrol.

Yang penting:

- jangan mengandalkan perubahan schema manual di production
- pastikan kode aplikasi dan migration dikirim bersama
- verifikasi urutan deploy supaya aplikasi tidak membaca schema yang belum siap

## Catatan Tentang Alternatif

Selain `goose`, ada tool lain seperti `sql-migrate`. Alternatif itu tetap valid, tetapi untuk materi ini `goose` dijadikan contoh utama karena alurnya sederhana, eksplisit, dan cocok untuk migration SQL berbasis file.

## Checklist Implementasi Minimum

Sebelum proses migration dianggap siap dipakai, pastikan:

1. binary `goose` terpasang
2. folder migration sudah konsisten
3. setiap migration punya bagian `up` dan `down`
4. migration bisa dijalankan dengan `up`
5. hasil `up` diverifikasi di database
6. rollback dengan `down` benar-benar diuji
7. hasil rollback juga diverifikasi

Kalau checklist ini terpenuhi, perubahan schema tidak lagi bergantung pada ingatan atau langkah manual. Schema menjadi bagian dari alur engineering yang bisa ditinjau, dijalankan ulang, dan dipulihkan dengan aman.
