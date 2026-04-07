---
title: Instalasi Software
sidebar_position: 1
slug: /instalasi
pagination_prev: index
pagination_next: intro
---

# Instalasi Software yang Diperlukan

Sebelum memulai panduan ini, pastikan semua software berikut sudah terinstall di sistem kamu. Panduan ini mencakup instalasi untuk **macOS**, **Linux (Ubuntu/Debian)**, dan **Windows (WSL2)**.

---

## Daftar Software

| Software | Versi Minimum | Kegunaan |
|---|---|---|
| Go | Ikuti versi pada `go.mod` service | Bahasa pemrograman utama |
| Protocol Buffers (`protoc`) | 3.x | Kompilasi file `.proto` |
| protoc-gen-go + protoc-gen-go-grpc | latest | Plugin Go untuk protoc |
| Make | 3.x+ | Build automation |
| Apache Kafka | 3.x | Event streaming |
| Docker + Docker Compose | 24.x+ | Containerisasi service |
| Git | 2.x+ | Version control & submodules |

---

## 1. Go (Golang)

### macOS
```bash
brew install go
```

### Linux (Ubuntu/Debian)
```bash
# Download versi terbaru dari https://go.dev/dl/
wget https://go.dev/dl/go1.26.1.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.1.linux-amd64.tar.gz

# Tambahkan ke PATH di ~/.bashrc atau ~/.zshrc
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

### Windows (WSL2)
```bash
# Jalankan di dalam terminal WSL2 (Ubuntu)
wget https://go.dev/dl/go1.26.1.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.26.1.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

### Verifikasi
```bash
go version
# Output: go version go1.26.1 linux/amd64
```

---

## 2. Protocol Buffers (`protoc`)

`protoc` adalah compiler untuk file `.proto` yang digunakan pada Hari 2 (Protobuf & gRPC).

### macOS
```bash
brew install protobuf
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y protobuf-compiler

# Atau install manual versi terbaru:
PB_REL="https://github.com/protocolbuffers/protobuf/releases"
curl -LO $PB_REL/download/v25.1/protoc-25.1-linux-x86_64.zip
unzip protoc-25.1-linux-x86_64.zip -d $HOME/.local
export PATH="$PATH:$HOME/.local/bin"
```

### Windows (WSL2)
```bash
sudo apt-get install -y protobuf-compiler
```

### Verifikasi
```bash
protoc --version
# Output: libprotoc 25.x
```

---

## 3. Plugin protoc untuk Go (`protoc-gen-go` & `protoc-gen-go-grpc`)

Plugin ini diperlukan agar `protoc` bisa menghasilkan kode Go dari file `.proto`.

### Semua Platform (via `go install`)
```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

Pastikan `$GOPATH/bin` ada di PATH:
```bash
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
source ~/.bashrc
```

### Verifikasi
```bash
protoc-gen-go --version
# Output: protoc-gen-go v1.x.x

which protoc-gen-go-grpc
# Output: /home/<user>/go/bin/protoc-gen-go-grpc
```

---

## 4. Make

`make` digunakan untuk menjalankan perintah build dan kompilasi protobuf dengan lebih mudah.

### macOS
```bash
# Biasanya sudah terinstall. Jika belum:
xcode-select --install
# atau
brew install make
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install -y make
```

### Windows (WSL2)
```bash
sudo apt-get install -y make
```

### Verifikasi
```bash
make --version
# Output: GNU Make 4.x
```

---

## 5. Apache Kafka

Kafka digunakan pada Hari 4 untuk event streaming antar service.

> **Rekomendasi:** Gunakan Docker untuk menjalankan Kafka agar lebih mudah dan tidak perlu konfigurasi manual.

### Opsi A: Via Docker (Direkomendasikan)

Tidak perlu install Kafka secara manual. Kafka akan dijalankan via `docker-compose.yml` yang sudah disediakan di Hari 6.

Cukup pastikan **Docker** sudah terinstall (lihat bagian Docker di bawah).

### Opsi B: Install Manual (macOS)
```bash
brew install kafka

# Jalankan Zookeeper (terminal 1)
zookeeper-server-start /usr/local/etc/kafka/zookeeper.properties

# Jalankan Kafka (terminal 2)
kafka-server-start /usr/local/etc/kafka/server.properties
```

### Opsi C: Install Manual (Linux)
```bash
# Download Kafka
wget https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz
tar -xzf kafka_2.13-3.7.0.tgz
cd kafka_2.13-3.7.0

# Jalankan Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties &

# Jalankan Kafka broker
bin/kafka-server-start.sh config/server.properties &
```

### Verifikasi (jika install manual)
```bash
# Cek apakah Kafka berjalan di port 9092
nc -zv localhost 9092
```

---

## 6. Docker & Docker Compose

Docker digunakan untuk containerisasi semua service pada Hari 6.

### macOS & Windows
Download dan install **Docker Desktop** dari:
👉 https://www.docker.com/products/docker-desktop/

Docker Compose sudah termasuk di dalam Docker Desktop.

### Linux (Ubuntu/Debian)
```bash
# Install Docker Engine
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Tambahkan user ke group docker (agar tidak perlu sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### Verifikasi
```bash
docker --version
# Output: Docker version 24.x.x

docker compose version
# Output: Docker Compose version v2.x.x
```

---

## 7. Git

Git digunakan untuk version control dan fitur **Git Submodules** pada Hari 2 & 6.

### macOS
```bash
brew install git
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install -y git
```

### Windows
Download dari: https://git-scm.com/download/win

### Konfigurasi Dasar
```bash
git config --global user.name "Nama Kamu"
git config --global user.email "email@kamu.com"
```

### Verifikasi
```bash
git --version
# Output: git version 2.x.x
```

---

## Checklist Akhir

Jalankan perintah berikut untuk memverifikasi semua software sudah terinstall:

```bash
echo "=== Verifikasi Instalasi ===" && \
echo -n "Go: " && go version && \
echo -n "protoc: " && protoc --version && \
echo -n "protoc-gen-go: " && protoc-gen-go --version && \
echo -n "Make: " && make --version | head -1 && \
echo -n "Docker: " && docker --version && \
echo -n "Docker Compose: " && docker compose version && \
echo -n "Git: " && git --version && \
echo "=== Semua siap! ==="
```

Jika semua perintah di atas menghasilkan output tanpa error, kamu siap memulai **Hari 1**! 🚀

---

## Troubleshooting Umum

**`protoc-gen-go: command not found`**
```bash
# Pastikan GOPATH/bin ada di PATH
export PATH=$PATH:$(go env GOPATH)/bin
```

**`docker: permission denied`** (Linux)
```bash
sudo usermod -aG docker $USER
# Logout dan login ulang, atau jalankan:
newgrp docker
```

**`kafka connection refused`**
```bash
# Pastikan Kafka sudah berjalan, cek port 9092
ss -tlnp | grep 9092
```

**`make: command not found`** (macOS)
```bash
xcode-select --install
```
