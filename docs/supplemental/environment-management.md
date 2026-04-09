---
title: "Environment Management: Konfigurasi dan .env"
sidebar_position: 1
slug: /supplemental/environment-management
pagination_prev: learning-path/hari-7-integrasi-testing
pagination_next: supplemental/request-validation
---

# Environment Management: Konfigurasi dan `.env`

Setelah 7 hari inti selesai, konfigurasi aplikasi biasanya jadi bagian pertama yang perlu dirapikan. Di stack Go, pola yang paling aman adalah membaca semua environment variable saat startup, memvalidasi nilainya, lalu menghentikan proses jika ada konfigurasi wajib yang belum siap.

## Kenapa Konfigurasi Perlu Ditangani di Awal

- aplikasi microservice bergantung pada banyak URL dan secret
- bug konfigurasi sering baru terlihat saat request pertama masuk
- startup yang gagal cepat lebih mudah didiagnosis daripada service yang "jalan" tetapi salah alamat

Pendekatan ini membuat service tidak memulai listener HTTP sebelum semua dependensi penting jelas.

## Contoh `.env`

Contoh berikut menunjukkan tiga hal yang biasanya paling penting: URL gateway, URL auth-service, dan alamat service internal lain.

```env
APP_ENV=development
HTTP_PORT=8080

GATEWAY_URL=http://localhost:8080
AUTH_SERVICE_URL=http://localhost:8083
ORDER_SERVICE_URL=http://localhost:8082
PRODUCT_SERVICE_URL=http://localhost:8081

JWT_SECRET=dev-super-secret
JWT_ISSUER=learning-platform
JWT_AUDIENCE=learning-platform-client
```

Jika aplikasi dijalankan di Docker Compose atau cluster lain, nilai URL ini bisa berubah tanpa perlu mengubah kode. Itulah alasan konfigurasi dipisahkan dari source code.

## Apa Saja Yang Harus Divalidasi

Saat startup, validasi minimal biasanya mencakup:

- port harus ada dan bisa diparse ke angka
- URL service harus punya skema yang benar, misalnya `http://`
- `JWT_SECRET` tidak boleh kosong
- `JWT_ISSUER` dan `JWT_AUDIENCE` harus konsisten dengan token yang dipakai gateway dan auth-service

Jika salah satu nilai wajib tidak valid, service harus berhenti dengan error yang jelas.

## Pseudocode Go Untuk Load Config

```go
type Config struct {
    HTTPPort        string
    GatewayURL      string
    AuthServiceURL  string
    OrderServiceURL string
    ProductServiceURL string
    JWTSecret       string
    JWTIssuer      string
    JWTAudience     string
}

func LoadConfig() (Config, error) {
    cfg := Config{
        HTTPPort:         os.Getenv("HTTP_PORT"),
        GatewayURL:       os.Getenv("GATEWAY_URL"),
        AuthServiceURL:   os.Getenv("AUTH_SERVICE_URL"),
        OrderServiceURL:  os.Getenv("ORDER_SERVICE_URL"),
        ProductServiceURL: os.Getenv("PRODUCT_SERVICE_URL"),
        JWTSecret:        os.Getenv("JWT_SECRET"),
        JWTIssuer:        os.Getenv("JWT_ISSUER"),
        JWTAudience:      os.Getenv("JWT_AUDIENCE"),
    }

    if cfg.HTTPPort == "" || cfg.JWTSecret == "" {
        return Config{}, fmt.Errorf("config wajib belum lengkap")
    }

    if _, err := strconv.Atoi(cfg.HTTPPort); err != nil {
        return Config{}, fmt.Errorf("HTTP_PORT harus berupa angka: %w", err)
    }

    if !strings.HasPrefix(cfg.AuthServiceURL, "http://") && !strings.HasPrefix(cfg.AuthServiceURL, "https://") {
        return Config{}, fmt.Errorf("AUTH_SERVICE_URL harus berupa URL valid")
    }

    return cfg, nil
}
```

```go
func main() {
    cfg, err := LoadConfig()
    if err != nil {
        log.Fatalf("startup gagal: %v", err)
    }

    app := fiber.New()
    app.Listen(":" + cfg.HTTPPort)
}
```

Contoh ini sengaja sederhana. Intinya bukan pada library env tertentu, melainkan pada kebiasaan memvalidasi konfigurasi sebelum server mulai menerima traffic.

## Hubungan Dengan JWT

Konfigurasi JWT tidak berdiri sendiri. `JWT_SECRET` dipakai untuk:

- menandatangani token di `auth-service`
- memverifikasi token di API Gateway
- memastikan token yang dibuat satu service tetap bisa dibaca service lain yang memiliki peran verifikasi

`JWT_ISSUER` dan `JWT_AUDIENCE` membantu mencegah token dari environment lain dipakai secara salah. Misalnya token dari lingkungan development tidak seharusnya dianggap valid di environment production.

## Hubungan Dengan Service URL

Service URL juga bagian dari keamanan operasional. Jika `AUTH_SERVICE_URL` salah, gateway bisa gagal login. Jika `ORDER_SERVICE_URL` salah, request order akan diarahkan ke target yang keliru. Karena itu, validasi URL di startup lebih baik daripada menunggu request gagal di runtime.

## Ringkasan Praktis

- simpan konfigurasi di environment, bukan hardcode
- validasi semua konfigurasi wajib saat startup
- hentikan aplikasi jika `JWT_SECRET` atau URL service tidak valid
- pastikan nilai config mendukung flow JWT dan routing antar service
