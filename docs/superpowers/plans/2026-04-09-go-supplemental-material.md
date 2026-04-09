# Go Supplemental Material Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyamakan struktur dan kedalaman materi supplemental di `docusaurus-site` dengan versi NestJS sambil tetap memakai contoh implementasi Go yang sesuai dengan site ini.

**Architecture:** Sidebar `Materi Tambahan` dipecah menjadi `Foundations`, `Security`, dan `Operations`. Empat dokumen baru ditambahkan untuk topik fondasi dan operasional, lalu tiga dokumen auth yang sudah ada diperkuat agar lebih implementatif. Pagination dirangkai ulang supaya alur belajar berjalan dari Hari 7 ke semua materi supplemental lalu kembali ke Reference.

**Tech Stack:** Docusaurus 3, Markdown docs, TypeScript sidebar config, Go/Fiber-style examples, goose for migrations

---

### Task 1: Restructure Supplemental Navigation

**Files:**
- Modify: `sidebars.ts`

- [ ] **Step 1: Add the new supplemental doc ids to the sidebar structure**

```ts
    {
      type: 'category',
      label: 'Materi Tambahan',
      link: {
        type: 'generated-index',
        title: 'Materi Tambahan',
        description:
          'Topik lanjutan yang melengkapi fondasi microservices utama tanpa mengubah jalur belajar 7 hari inti.',
      },
      items: [
        {
          type: 'category',
          label: 'Foundations',
          link: {
            type: 'generated-index',
            title: 'Foundations',
            description:
              'Fondasi tambahan sebelum masuk ke keamanan dan operasional, dimulai dari konfigurasi aplikasi dan validasi request.',
          },
          items: [
            'supplemental/environment-management',
            'supplemental/request-validation',
          ],
        },
        {
          type: 'category',
          label: 'Security',
          link: {
            type: 'generated-index',
            title: 'Security',
            description:
              'Lapisan keamanan dasar yang menambahkan login JWT dan verifikasi token ke arsitektur microservice yang sudah ada.',
          },
          items: [
            'supplemental/auth-jwt-overview',
            'supplemental/auth-service-login-jwt',
            'supplemental/api-gateway-jwt-verification',
          ],
        },
        {
          type: 'category',
          label: 'Operations',
          link: {
            type: 'generated-index',
            title: 'Operations',
            description:
              'Materi operasional dasar untuk membuat service lebih mudah dijalankan, diamati, dan dirawat.',
          },
          items: [
            'supplemental/structured-logging',
            'supplemental/database-migration',
          ],
        },
      ],
    },
```

- [ ] **Step 2: Run build to verify the expected red failure**

Run: `npm run -s build`
Expected: FAIL because `supplemental/environment-management`, `supplemental/request-validation`, `supplemental/structured-logging`, and `supplemental/database-migration` do not exist yet.

- [ ] **Step 3: Commit the sidebar restructuring after the docs exist and build passes**

```bash
git add sidebars.ts docs/supplemental
git commit -m "feat: reorganize Go supplemental docs"
```

### Task 2: Add Foundations Docs For Go

**Files:**
- Create: `docs/supplemental/environment-management.md`
- Create: `docs/supplemental/request-validation.md`

- [ ] **Step 1: Write `environment-management.md` with Go-specific config flow**

```md
---
title: "Environment Management: Konfigurasi dan .env"
sidebar_position: 1
slug: /supplemental/environment-management
pagination_prev: learning-path/hari-7-integrasi-testing
pagination_next: supplemental/request-validation
---
```

Content requirements:
- Example `.env` for gateway/auth-service/service URLs
- Explanation of startup config validation
- Concrete Go-style pseudocode for reading env and failing fast
- Checklist that ties config back to JWT and service URLs

- [ ] **Step 2: Write `request-validation.md` with Go handler examples**

```md
---
title: "Request Validation: Menjaga Boundary API"
sidebar_position: 2
slug: /supplemental/request-validation
pagination_prev: supplemental/environment-management
pagination_next: supplemental/auth-jwt-overview
---
```

Content requirements:
- Order/login payload examples
- Handler flow: parse body, validate fields, return `400`
- Concrete pseudocode using Go handler style
- Clear distinction between request validation and business validation

- [ ] **Step 3: Run build to verify the new foundations docs resolve**

Run: `npm run -s build`
Expected: PASS for the new doc ids, but auth/operations docs remain as-is.

- [ ] **Step 4: Commit the foundations docs**

```bash
git add docs/supplemental/environment-management.md docs/supplemental/request-validation.md
git commit -m "feat: add Go supplemental foundations docs"
```

### Task 3: Rewrite Security Docs For Go Auth Flow

**Files:**
- Modify: `docs/supplemental/auth-jwt-overview.md`
- Modify: `docs/supplemental/auth-service-login-jwt.md`
- Modify: `docs/supplemental/api-gateway-jwt-verification.md`

- [ ] **Step 1: Rewrite `auth-jwt-overview.md` as an implementation map**

Content requirements:
- Position auth after config and validation
- Keep Go architecture diagram
- Explain the exact sequence from login to gateway verification
- Set `pagination_prev: supplemental/request-validation`
- Keep `pagination_next: supplemental/auth-service-login-jwt`

- [ ] **Step 2: Rewrite `auth-service-login-jwt.md` with concrete Go login flow**

Include:
- `POST /auth/login`
- minimal user table fields
- login handler flow
- password verification
- JWT generation
- response payload
- checklist tied to seeded admin/demo user

- [ ] **Step 3: Rewrite `api-gateway-jwt-verification.md` with concrete gateway middleware flow**

Include:
- `Authorization: Bearer <token>`
- middleware steps
- protected route examples
- forwarding `X-User-Id` / `X-User-Role`
- `pagination_next: supplemental/structured-logging`

- [ ] **Step 4: Run build to verify all security docs and pagination**

Run: `npm run -s build`
Expected: PASS with the auth flow chained between foundations and operations.

- [ ] **Step 5: Commit the security docs**

```bash
git add docs/supplemental/auth-jwt-overview.md docs/supplemental/auth-service-login-jwt.md docs/supplemental/api-gateway-jwt-verification.md
git commit -m "feat: expand Go supplemental auth docs"
```

### Task 4: Add Operations Docs For Logging And Migrations

**Files:**
- Create: `docs/supplemental/structured-logging.md`
- Create: `docs/supplemental/database-migration.md`

- [ ] **Step 1: Write `structured-logging.md` with Go-oriented request logging**

```md
---
title: "Structured Logging: Log yang Konsisten dan Terbaca"
sidebar_position: 1
slug: /supplemental/structured-logging
pagination_prev: supplemental/api-gateway-jwt-verification
pagination_next: supplemental/database-migration
---
```

Content requirements:
- request id
- structured log examples for request start/finish
- warning about logging sensitive data
- Go-style middleware pseudocode

- [ ] **Step 2: Write `database-migration.md` using goose as the primary tool**

```md
---
title: "Database Migration: Menjaga Perubahan Schema"
sidebar_position: 2
slug: /supplemental/database-migration
pagination_prev: supplemental/structured-logging
pagination_next: reference/glosarium
---
```

Content requirements:
- Why manual schema changes are insufficient
- Goose install and migration file creation
- Complete `up` and `down` SQL flow
- Run migration, verify results, run rollback, verify rollback
- Brief note on alternatives such as `sql-migrate`

- [ ] **Step 3: Run build as final verification**

Run: `npm run -s build`
Expected: PASS and the full supplemental chain appears in the new category order.

- [ ] **Step 4: Commit the operations docs**

```bash
git add docs/supplemental/structured-logging.md docs/supplemental/database-migration.md
git commit -m "feat: add Go supplemental operations docs"
```

### Task 5: Final Review And Integration Check

**Files:**
- Review: `sidebars.ts`
- Review: `docs/supplemental/*.md`

- [ ] **Step 1: Re-read the final doc order against the spec**

Checklist:
- Hari 7 links into foundations
- Foundations -> Security -> Operations chain is continuous
- The Go examples do not mention NestJS, Sequelize, or TypeORM
- Migration doc uses goose as the primary example

- [ ] **Step 2: Run final build verification**

Run: `npm run -s build`
Expected: PASS with no broken doc ids or pagination links.

- [ ] **Step 3: Create the final integration commit**

```bash
git add sidebars.ts docs/supplemental
git commit -m "feat: add Go supplemental platform and auth materials"
```
