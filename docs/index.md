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

1. [Instalasi Software](/docs/getting-started/instalasi)
2. [Pendahuluan dan Arsitektur](/docs/getting-started/pengenalan)
3. [Glosarium](/docs/reference/glosarium)
4. [Hari 1: Setup Product Service](/docs/learning-path/hari-1-setup-product-service)
5. [Hari 2: Order Service dan Protobuf](/docs/learning-path/hari-2-order-service-protobuf)
6. [Hari 3: gRPC Communication](/docs/learning-path/hari-3-grpc-communication)
7. [Hari 4: Kafka Event Streaming](/docs/learning-path/hari-4-kafka-event-streaming)
8. [Hari 5: API Gateway](/docs/learning-path/hari-5-api-gateway)
9. [Hari 6: Docker Compose](/docs/learning-path/hari-6-docker-compose)
10. [Hari 7: Integrasi dan Testing](/docs/learning-path/hari-7-integrasi-testing)

## Materi Inti

- HTTP API dengan Fiber v3
- ORM dan PostgreSQL dengan GORM
- gRPC untuk komunikasi sinkron antar-service
- Kafka untuk event streaming asinkron
- API Gateway sebagai single entry point
- Docker Compose untuk menjalankan seluruh stack

Mulai dari [Instalasi Software](/docs/getting-started/instalasi).
