---
title: Glosarium
sidebar_position: 1
slug: /reference/glosarium
pagination_prev: supplemental/database-migration
---

# Glosarium

Bagian ini merangkum istilah-istilah utama yang sering muncul di course agar lebih mudah diikuti dari awal sampai akhir.

## API Gateway

Lapisan yang menjadi pintu masuk utama untuk request dari client. Gateway menerima request, lalu meneruskannya ke service yang tepat.

## Consumer

Komponen yang membaca pesan dari message broker seperti Kafka. Dalam course ini Product Service berperan sebagai consumer untuk event order.

## Docker Compose

Tool untuk menjalankan beberapa container sekaligus dengan satu file konfigurasi. Dipakai untuk menyalakan semua service dan infrastructure secara bersamaan.

## Eventual Consistency

Kondisi ketika data antar-service tidak selalu sinkron pada saat yang sama, tetapi akan menjadi konsisten setelah event atau proses tertentu selesai diproses.

## Event Streaming

Pola pengiriman data berbasis event melalui broker pesan. Service tidak harus saling memanggil langsung untuk setiap perubahan data.

## gRPC

Framework komunikasi remote procedure call yang efisien dan berbasis Protobuf. Dipakai untuk komunikasi sinkron antar-service.

## Microservice

Service kecil yang fokus pada satu tanggung jawab bisnis tertentu dan bisa dikembangkan atau dideploy secara terpisah.

## Asynchronous Communication

Pola komunikasi di mana pengirim tidak perlu menunggu jawaban langsung dari penerima. Dalam course ini pola ini dipakai saat service bertukar event melalui Kafka.

## Synchronous Communication

Pola komunikasi di mana satu service menunggu respons langsung dari service lain sebelum melanjutkan proses. Dalam course ini contohnya adalah pemanggilan gRPC dari Order Service ke Product Service.

## Producer

Komponen yang mengirim pesan ke message broker. Dalam course ini Order Service mengirim event order ke Kafka.

## Protobuf

Format schema dan serialisasi data yang dipakai untuk mendefinisikan kontrak gRPC dan menghasilkan kode Go secara otomatis.

## Reverse Proxy

Komponen yang menerima request dari client lalu meneruskannya ke server lain di belakangnya. API Gateway di course ini bekerja dengan pola ini.

## Service Contract

Aturan atau definisi formal tentang bagaimana dua service saling berkomunikasi. Dalam course ini kontrak itu ditulis dalam file `.proto`.

## Submodule

Fitur Git untuk memasukkan repository lain sebagai bagian dari repository utama. Dipakai untuk menyertakan `proto-definitions` di service lain.

## Idempotency

Sifat sebuah operasi yang tetap memberi hasil akhir yang sama walaupun request yang sama dikirim lebih dari sekali. Konsep ini penting dalam sistem terdistribusi untuk mengurangi efek duplikasi request atau event.
