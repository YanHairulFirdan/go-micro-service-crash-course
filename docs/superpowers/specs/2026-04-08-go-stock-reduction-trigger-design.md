# Go Stock Reduction Trigger Design

## Tujuan

Menyamakan materi Go di `docusaurus-site` dengan alur pada `panduan-microservice-nestjs` untuk mekanisme pengurangan stok.

## Keputusan Desain

- `order-service` tetap memakai gRPC hanya untuk validasi stok dan ambil detail produk.
- Pengurangan stok tidak dilakukan saat request sinkron yang sama.
- Setelah order berhasil disimpan, `order-service` mempublish event `order.created`.
- `product-service` mengonsumsi event `order.created` untuk mengurangi stok secara asynchronous.
- Dokumentasi integrasi dan testing harus memverifikasi bahwa stok berkurang setelah consumer memproses event tersebut.

## Cakupan

- Samakan narasi di pengenalan arsitektur.
- Tegaskan di Hari 3 bahwa stok belum dikurangi dan baru diproses di Hari 4.
- Sesuaikan Hari 4 agar trigger pengurangan stok eksplisit memakai event `order.created`.
- Sesuaikan Hari 7 agar langkah verifikasi dan troubleshooting mengikuti alur event tersebut.

## Di Luar Cakupan

- Mengubah kode aplikasi nyata di repo service terpisah.
- Menambahkan pembahasan idempotency, retry, atau dead-letter queue di luar konteks perapihan materi.
