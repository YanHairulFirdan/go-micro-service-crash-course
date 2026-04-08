# Auth Supplemental Material Design

## Latar Belakang

Materi inti `docusaurus-site` saat ini fokus pada fondasi microservices Go selama tujuh hari: Product Service, Order Service, gRPC, Kafka, API Gateway, Docker Compose, dan integrasi akhir. Autentikasi dinilai sebagai materi lanjutan yang paling relevan karena menambah nilai praktis tanpa memaksa perubahan besar pada alur inti.

Memasukkan autentikasi langsung ke learning path tujuh hari akan memperbesar scope, mengaburkan fokus, dan membuat pembaca pemula harus mempelajari terlalu banyak konsep sekaligus. Karena itu, autentikasi akan ditempatkan sebagai materi tambahan yang terpisah dari jalur inti.

## Tujuan

- Menambahkan menu baru `Materi Tambahan` di sidebar Docusaurus.
- Menambahkan track autentikasi JWT sederhana yang tetap konsisten dengan arsitektur sistem yang sudah ada.
- Menjaga materi inti 7 hari tetap utuh dan tidak berubah struktur belajarnya.
- Menyajikan autentikasi sebagai lanjutan praktis yang masih realistis diselesaikan oleh pembaca setelah menyelesaikan materi inti.

## Ruang Lingkup

Track autentikasi tambahan akan terdiri dari tiga halaman:

1. `Autentikasi JWT: Gambaran Umum`
2. `Auth Service: Login dan Penerbitan Token`
3. `API Gateway: Verifikasi JWT dan Forward User Context`

Konten akan difokuskan pada:

- alasan menempatkan autentikasi di gateway
- peran `auth-service` sederhana
- endpoint login yang mengembalikan JWT
- middleware verifikasi JWT di API Gateway
- forwarding identitas user ke downstream service melalui header internal

## Di Luar Ruang Lingkup

Agar tetap ringan dan cocok sebagai materi tambahan, topik berikut tidak dibahas:

- refresh token
- OAuth / social login
- registrasi user penuh
- RBAC kompleks
- session management
- secret rotation
- distributed authorization policy

## Pendekatan yang Dipertimbangkan

### Opsi 1: Menyisipkan autentikasi ke 7 hari inti

Kelebihan:

- semua topik terasa berada dalam satu jalur belajar

Kekurangan:

- scope membengkak
- ritme belajar tujuh hari menjadi lebih berat
- pembaca pemula harus memahami auth sebelum fondasi sistem cukup matang

### Opsi 2: Satu halaman tambahan panjang tentang autentikasi

Kelebihan:

- implementasi dokumentasi paling cepat

Kekurangan:

- topik login, JWT, gateway middleware, dan downstream context akan menumpuk dalam satu halaman
- lebih sulit dipindai dan diikuti bertahap

### Opsi 3: Menu `Materi Tambahan` dengan tiga halaman auth

Kelebihan:

- struktur paling jelas
- ritme belajar lebih bertahap
- mudah diperluas di masa depan untuk topik lanjutan lain seperti observability atau testing

Kekurangan:

- perlu perubahan sidebar dan penambahan beberapa dokumen baru

## Keputusan

Menggunakan Opsi 3.

Autentikasi akan ditempatkan dalam menu baru `Materi Tambahan` dan dipecah menjadi tiga halaman agar pembaca bisa mengikuti alur dari konsep ke implementasi tanpa membuat satu halaman terlalu padat.

## Desain Konten

### 1. Halaman Gambaran Umum

Halaman pertama menjelaskan:

- mengapa autentikasi tidak dimasukkan ke jalur inti
- posisi `auth-service` di arsitektur
- alur login dan penggunaan access token
- alasan gateway menjadi titik verifikasi JWT

Halaman ini bertugas memberi konteks, bukan langsung tenggelam ke kode.

### 2. Halaman Auth Service

Halaman kedua menjelaskan implementasi service autentikasi minimal:

- endpoint login sederhana
- validasi kredensial dasar
- pembuatan JWT
- payload claim minimum seperti `sub` dan `role`

Contoh akan tetap sederhana dan edukatif. Asumsi user store boleh dijelaskan secara ringan, misalnya hardcoded atau tabel sederhana, selama tujuannya jelas: menunjukkan alur penerbitan token.

### 3. Halaman API Gateway

Halaman ketiga menjelaskan bagaimana gateway:

- membaca header `Authorization`
- memverifikasi JWT
- menolak request tanpa token atau token invalid
- meneruskan context user ke downstream melalui header internal seperti `X-User-Id` dan `X-User-Role`

Halaman ini juga akan memberi contoh endpoint mana yang layak diproteksi lebih dulu agar pembaca tidak merasa semua endpoint harus langsung diamankan sekaligus.

## Perubahan Navigasi

- Tambahkan kategori baru `Materi Tambahan` di sidebar.
- Tambahkan tiga dokumen auth ke kategori tersebut.
- Pastikan urutan kategori tidak mengganggu kategori `Getting Started`, `Learning Path`, `Reference`, dan dokumen lain yang sudah ada.

## Risiko dan Mitigasi

### Risiko 1: Materi auth terasa seperti sistem baru yang terpisah

Mitigasi:

- narasi harus selalu mengaitkan auth dengan arsitektur yang sudah dibangun
- gunakan istilah service dan gateway yang konsisten dengan materi inti

### Risiko 2: Scope auth melebar ke topik security tingkat lanjut

Mitigasi:

- jelaskan secara eksplisit apa yang sengaja tidak dibahas
- batasi implementasi pada JWT sederhana dan gateway verification

### Risiko 3: Sidebar menjadi ramai

Mitigasi:

- kelompokkan seluruh topik auth di bawah satu menu `Materi Tambahan`
- gunakan judul halaman yang ringkas dan berurutan

## Strategi Verifikasi

Setelah implementasi dokumentasi:

- jalankan `npm run build` untuk memastikan halaman baru dan sidebar valid
- cek ulang keterhubungan internal antarhalaman auth
- pastikan istilah auth konsisten di ketiga halaman

## Hasil yang Diharapkan

Setelah perubahan ini, pembaca akan melihat bahwa:

- 7 hari inti tetap fokus pada fondasi microservices
- autentikasi tersedia sebagai lanjutan yang praktis dan terstruktur
- materi tambahan punya tempat yang jelas untuk berkembang tanpa mengacaukan kurikulum utama
