---
title: Glosarium
sidebar_position: 3
slug: /glosarium
pagination_prev: intro
pagination_next: hari-1/setup-product-service
---

# Glosarium

Bagian ini merangkum istilah-istilah utama yang sering muncul di course agar lebih mudah diikuti dari awal sampai akhir.

## API Gateway

Lapisan yang menjadi pintu masuk utama untuk request dari client. Gateway menerima request, lalu meneruskannya ke service yang tepat.

## Consumer

Komponen yang membaca pesan dari message broker seperti Kafka. Dalam course ini Product Service berperan sebagai consumer untuk event order.

## Docker Compose

Tool untuk menjalankan beberapa container sekaligus dengan satu file konfigurasi. Dipakai untuk menyalakan semua service dan infrastructure secara bersamaan.

## Event Streaming

Pola pengiriman data berbasis event melalui broker pesan. Service tidak harus saling memanggil langsung untuk setiap perubahan data.

## gRPC

Framework komunikasi remote procedure call yang efisien dan berbasis Protobuf. Dipakai untuk komunikasi sinkron antar-service.

## Microservice

Service kecil yang fokus pada satu tanggung jawab bisnis tertentu dan bisa dikembangkan atau dideploy secara terpisah.

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
