---
title: Mulai Belajar
sidebar_position: 0
slug: /
---

# Panduan Belajar Microservices dengan Go

Course ini disusun sebagai jalur belajar 7 hari yang berurutan. Setiap materi membangun fondasi untuk materi berikutnya, dari instalasi tool sampai integrasi semua service.

## Yang Akan Kamu Bangun

Di akhir course ini kamu akan memiliki satu sistem backend e-commerce sederhana yang terdiri dari beberapa komponen terpisah:

- `product-service` untuk mengelola data produk dan stok
- `order-service` untuk membuat order dan memvalidasi ketersediaan produk
- `api-gateway` untuk menerima request dari client dan meneruskannya ke service yang tepat
- `proto-definitions` untuk menyimpan kontrak gRPC berbasis Protobuf
- environment lokal berbasis Docker Compose untuk menjalankan seluruh stack

Fokus course ini bukan pada tampilan aplikasi, tetapi pada desain backend modern yang modular dan realistis.

## Yang Akan Kamu Pelajari

Setelah menyelesaikan course ini, kamu akan memahami:

- cara memecah sistem menjadi beberapa service dengan tanggung jawab jelas
- cara membangun REST API dengan Go dan Fiber
- cara memakai GORM dan PostgreSQL untuk persistence layer
- cara menghubungkan service dengan gRPC dan Protobuf
- cara memakai Kafka untuk komunikasi asinkron berbasis event
- cara memakai API Gateway sebagai single entry point
- cara membungkus dan menjalankan seluruh sistem dengan Docker Compose

## Urutan Belajar

1. [Instalasi Software](./instalasi-software.md)
2. [Pendahuluan dan Arsitektur](./intro.md)
3. [Glosarium](./glosarium.md)
4. [Hari 1: Setup Product Service](./hari-1/setup-product-service.md)
5. [Hari 2: Order Service dan Protobuf](./hari-2/order-service-protobuf.md)
6. [Hari 3: gRPC Communication](./hari-3/grpc-communication.md)
7. [Hari 4: Kafka Event Streaming](./hari-4/kafka-event-streaming.md)
8. [Hari 5: API Gateway](./hari-5/api-gateway.md)
9. [Hari 6: Docker Compose](./hari-6/docker-compose.md)
10. [Hari 7: Integrasi dan Testing](./hari-7/integrasi-testing.md)

## Materi Inti

- HTTP API dengan Fiber v3
- ORM dan PostgreSQL dengan GORM
- gRPC untuk komunikasi sinkron antar-service
- Kafka untuk event streaming asinkron
- API Gateway sebagai single entry point
- Docker Compose untuk menjalankan seluruh stack

Mulai dari [Instalasi Software](./instalasi-software.md).
