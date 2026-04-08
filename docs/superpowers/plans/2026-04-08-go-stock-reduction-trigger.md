# Go Stock Reduction Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelaraskan materi Go agar trigger pengurangan stok mengikuti pola `order.created` setelah order tersimpan, sama seperti panduan NestJS.

**Architecture:** Perubahan dibatasi pada dokumentasi Docusaurus. Narasi arsitektur, contoh kode, dan langkah verifikasi akan dibuat konsisten: gRPC untuk cek stok sinkron, Kafka event `order.created` untuk side effect asynchronous pengurangan stok.

**Tech Stack:** Markdown, Docusaurus

---

### Task 1: Selaraskan narasi arsitektur dan prasyarat alur

**Files:**
- Modify: `docusaurus-site/docs/getting-started/pengenalan.md`
- Modify: `docusaurus-site/docs/learning-path/hari-3-grpc-communication.md`

- [ ] Perbarui pengenalan agar menyebut `order.created` sebagai event yang memicu pengurangan stok.
- [ ] Tegaskan di Hari 3 bahwa order sudah bisa divalidasi dan disimpan, tetapi stok belum dikurangi sampai mekanisme event pada Hari 4 ditambahkan.

### Task 2: Selaraskan materi Kafka Hari 4

**Files:**
- Modify: `docusaurus-site/docs/learning-path/hari-4-kafka-event-streaming.md`

- [ ] Perbarui diagram dan penjelasan agar trigger pengurangan stok eksplisit memakai event `order.created`.
- [ ] Ubah snippet producer agar menulis event `order.created` setelah `repo.Create(order)` sukses.
- [ ] Ubah snippet consumer agar memproses event berdasarkan nama event, bukan bergantung pada `status == "confirmed"` sebagai trigger utama.

### Task 3: Selaraskan verifikasi integrasi

**Files:**
- Modify: `docusaurus-site/docs/learning-path/hari-7-integrasi-testing.md`

- [ ] Perbarui langkah end-to-end dan monitoring agar eksplisit memeriksa publish/consume event `order.created`.
- [ ] Perbarui troubleshooting bila stok tidak berkurang agar pembaca mengecek producer, topic, dan consumer pada alur event yang sama.

### Task 4: Verifikasi konsistensi istilah

**Files:**
- Modify: `docusaurus-site/docs/getting-started/pengenalan.md`
- Modify: `docusaurus-site/docs/learning-path/hari-3-grpc-communication.md`
- Modify: `docusaurus-site/docs/learning-path/hari-4-kafka-event-streaming.md`
- Modify: `docusaurus-site/docs/learning-path/hari-7-integrasi-testing.md`

- [ ] Cari istilah lama yang membuat trigger stok ambigu.
- [ ] Pastikan istilah akhir konsisten: validasi stok sinkron via gRPC, pengurangan stok async via event `order.created`.
