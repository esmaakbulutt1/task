# Görev: TaskFlow – Workspace, Proje ve Görev Yönetim Sistemi

## Yapılanların Kısa Özeti

- [x] NestJS, Next.js, PostgreSQL ve Docker kullanılarak projenin temel kurulumu yapıldı.
- [x] Veritabanı tabloları, ilişkiler, migration sistemi ve gerekli indexler yapıldı.
- [x] Kayıt, giriş, profil, access/refresh token ve şifre sıfırlama işlemleri yapıldı.
- [x] Owner, admin ve member rollerine göre workspace üye ve yetki yönetimi yapıldı.
- [x] Proje ve görev oluşturma, güncelleme, silme, filtreleme ve sıralama işlemleri yapıldı.
- [x] Kanban, yorum, dosya yükleme, bildirim, dashboard ve profil özellikleri yapıldı.
- [x] pg-boss ile e-posta, bildirim, audit, deadline ve CSV workerları yapıldı.
- [x] Gmail SMTP bağlantısı ve gerçek e-posta gönderimi yapıldı.
- [x] CSV ile toplu görev aktarma, ilerleme takibi ve hatalı satır raporlama işlemleri yapıldı.
- [x] Frontend types, service, hook, component ve page katmanları yapıldı.
- [x] Docker, unit test, E2E test, smoke test, lint, build ve güvenlik kontrolleri yapıldı.
- [x] README, Postman koleksiyonu, veritabanı şeması, örnek CSV ve ekran görüntüleri yapıldı.

> Ana proje tamamlandı, test edildi ve çalışır duruma getirildi. E-posta doğrulama, cache, WebSocket ve iki faktörlü giriş gibi özellikler bonus olarak bırakıldı.

**Seviye:** Orta  
**Tahmini süre:** 4–6 hafta  
**Teknolojiler:** Docker · PostgreSQL · NestJS · Next.js · TypeScript · Tailwind CSS · JWT · pg-boss

---

## Genel Bakış

Bu projede birden fazla kullanıcının çalışma alanları oluşturabildiği, bu çalışma alanlarının içine projeler ekleyebildiği ve projelerdeki görevleri ekip üyelerine atayabildiği bir görev yönetim sistemi geliştireceksin.

Kullanıcılar:

- Çalışma alanı oluşturabilecek.
- Çalışma alanına ekip üyesi ekleyebilecek.
- Proje oluşturabilecek.
- Görev ekleyip üyeye atayabilecek.
- Görev durumu ve önceliğini değiştirebilecek.
- Görevlere yorum ve dosya ekleyebilecek.
- Bildirimlerini görüntüleyebilecek.
- CSV ile toplu görev aktarabilecek.
- Dashboard üzerinden istatistikleri inceleyebilecek.

Todo App içinde öğrendiğin JWT, CRUD, NestJS katmanları, PostgreSQL, Next.js component yapısı, service katmanı, custom hook, Docker ve pg-boss tekrar kullanılacak. Buna ek olarak role-based authorization, workspace üyeliği, pagination, search, filter, sorting, refresh token, soft delete, audit log, file upload, mail worker, scheduled job ve test yazma konularını öğreneceksin.

---

## Proje Senaryosu

Bir yazılım şirketi aynı anda birçok proje yürütüyor. Her projenin farklı görevleri ve ekip üyeleri var.

```text
Workspace: Yazılım Ekibi
Project: E-Ticaret Sistemi
Tasks:
- Login API geliştir
- Ürün listeleme sayfasını hazırla
- Sepet servisini oluştur
- Ödeme sistemi entegrasyonunu yap
```

Kullanıcı yalnızca üyesi olduğu workspace'leri görebilmeli. Workspace sahibi ve yöneticiler ekip üyelerini ve projeleri yönetebilmeli. Normal üyeler yalnızca kendilerine izin verilen işlemleri yapabilmeli.

---

## Roller

### Owner
- Workspace sahibidir.
- Workspace'i günceller veya siler.
- Üye ve rol yönetir.
- Tüm proje ve görevleri yönetir.

### Admin
- Proje ve görev yönetir.
- Üye ekleyebilir.
- Görev atayabilir.
- Owner rolü veremez.

### Member
- Üyesi olduğu projeleri görür.
- Kendisine atanan görevleri yönetir.
- Yorum ve dosya ekleyebilir.

---

## Büyük Resim

```text
Next.js arayüzü
        ↓
NestJS API
        ↓
JWT ve rol kontrolü
        ↓
Controller
        ↓
Service
        ↓
PostgreSQL
        ↓
Gerekirse pg-boss
        ↓
Worker
        ↓
Web arayüzünde güncel sonuç
```


# 1. Proje Kurulumu

## Yapılacaklar

1. Proje ana klasörünü oluştur.
2. `api/`, `web/` ve `db/` klasörlerini oluştur.
3. NestJS API projesini hazırla.
4. Next.js web projesini hazırla.
5. PostgreSQL, API ve web servislerini Docker Compose içine ekle.
6. `.env` ve `.env.example` dosyalarını oluştur.
7. PostgreSQL volume tanımla.
8. Servislerin aynı Docker ağı üzerinden haberleşmesini sağla.
9. API'yi 4000, web'i 3000 portunda çalıştır.
10. Docker servislerini build edip logları kontrol et.

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 web
```

**Düşün:** API container içinden PostgreSQL'e neden `localhost` ile değil service adıyla bağlanır?

---

# 2. Veritabanı Tasarımı

## Tablolar

### users
`id`, `email`, `password_hash`, `name`, `surname`, `profile_image`, `is_active`, `created_at`, `updated_at`

### refresh_tokens
`id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at`

### workspaces
`id`, `name`, `description`, `owner_id`, `created_at`, `updated_at`, `deleted_at`

### workspace_members
`id`, `workspace_id`, `user_id`, `role`, `joined_at`

### projects
`id`, `workspace_id`, `name`, `description`, `status`, `start_date`, `due_date`, `created_by`, `created_at`, `updated_at`, `deleted_at`

### tasks
`id`, `project_id`, `title`, `description`, `status`, `priority`, `due_date`, `created_by`, `assigned_to`, `created_at`, `updated_at`, `deleted_at`

### comments
`id`, `task_id`, `user_id`, `content`, `created_at`, `updated_at`, `deleted_at`

### attachments
`id`, `task_id`, `uploaded_by`, `original_name`, `stored_name`, `mime_type`, `size`, `created_at`

### notifications
`id`, `user_id`, `type`, `title`, `message`, `is_read`, `created_at`

### audit_logs
`id`, `workspace_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_data`, `new_data`, `created_at`

### import_jobs
`id`, `workspace_id`, `project_id`, `user_id`, `file_name`, `stored_file_name`, `status`, `total_rows`, `processed_rows`, `failed_rows`, `parsing_finished`, `error_message`, `created_at`, `updated_at`

### import_failed_rows
`id`, `import_job_id`, `row_number`, `raw_data`, `error_message`, `created_at`

## Öğreneceğin konular

- One-to-many ve many-to-many
- Foreign key ve unique constraint
- Check constraint
- Composite index
- UUID
- JSONB
- Soft delete
- Transaction

**Düşün:** Workspace üyeliği neden doğrudan `users` tablosunda değil, ayrı `workspace_members` tablosunda tutulmalı?

---

# 3. Migration Sistemi

1. `db/migrations/` klasörünü oluştur.
2. Her büyük şema değişikliğini ayrı migration dosyasında tut.
3. Dosyaları sıralı isimlendir:

```text
001_create_users.sql
002_create_workspaces.sql
003_create_projects.sql
004_create_tasks.sql
005_create_comments.sql
006_create_notifications.sql
007_create_import_tables.sql
```

4. Migration'ları PostgreSQL'e uygula.
5. Oluşan tabloları `information_schema.tables` üzerinden kontrol et.
6. Foreign key, index ve constraint'leri ayrıca doğrula.

---

# 4. DbService

1. `pg` kullanarak Pool oluştur.
2. Ortak `query()` metodu yaz.
3. Transaction için client alma ve release etme yapısı kur.
4. Parameterized query kullan.
5. Bağlantı hatalarını NestJS Logger ile logla.
6. Uygulama kapanırken pool'u kapat.

**Öğren:** Connection pool, dependency injection, singleton service, SQL injection ve transaction client.

---

# 5. Authentication

## Endpointler

```text
POST  /auth/register
POST  /auth/login
POST  /auth/refresh
POST  /auth/logout
GET   /auth/profile
PATCH /auth/profile
PATCH /auth/password
POST  /auth/forgot-password
POST  /auth/reset-password
```

## Gereksinimler

- Şifre bcrypt ile hashlenmeli.
- Access token kısa süreli olmalı.
- Refresh token daha uzun süreli olmalı.
- Refresh token veritabanında hashlenerek tutulmalı.
- Çıkışta refresh token iptal edilmeli.
- Pasif kullanıcı giriş yapamamalı.
- JWT secret `.env` içinde olmalı.
- Kullanıcı bulunamadığında ve şifre yanlış olduğunda aynı hata mesajı dönmeli.

---

# 6. Workspace Modülü

## Endpointler

```text
GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id
DELETE /workspaces/:id
```

## Kurallar

- Workspace'i oluşturan kişi otomatik owner olmalı.
- Kullanıcı yalnızca üyesi olduğu workspace'leri görebilmeli.
- Sadece owner workspace'i silebilmeli.
- Silme soft delete olmalı.
- Aynı kullanıcı aynı workspace'e iki kez eklenememeli.

---

# 7. Workspace Üye Yönetimi

## Endpointler

```text
GET    /workspaces/:workspaceId/members
POST   /workspaces/:workspaceId/members
PATCH  /workspaces/:workspaceId/members/:memberId
DELETE /workspaces/:workspaceId/members/:memberId
```

## Kurallar

- Owner ve admin üye ekleyebilmeli.
- Admin owner rolü verememeli.
- Owner kendisini silememeli.
- Üye eklendiğinde bildirim oluşturulmalı.
- Üye çıkarıldığında atanmış görevler için belirlediğin davranışı uygula ve README'de açıkla.

---

# 8. Role-Based Authorization

1. `WorkspaceRoleGuard` oluştur.
2. Custom decorator yaz:

```ts
@WorkspaceRoles('owner', 'admin')
```

3. Guard içinde workspace üyeliğini sorgula.
4. Yetki yoksa `ForbiddenException` döndür.
5. JWT doğrulaması ile rol kontrolünü ayrı sorumluluklar olarak tut.

**Öğren:** Metadata, Reflector, custom decorator, guard chain ve RBAC.

---

# 9. Project Modülü

## Endpointler

```text
GET    /workspaces/:workspaceId/projects
POST   /workspaces/:workspaceId/projects
GET    /projects/:projectId
PATCH  /projects/:projectId
DELETE /projects/:projectId
```

## Durumlar

`planned`, `active`, `completed`, `archived`

## Listeleme özellikleri

- Pagination
- Search
- Status filtresi
- Tarih filtresi
- Sorting

```text
GET /workspaces/10/projects?page=1&limit=10&search=api&status=active&sort=created_at&order=desc
```

Response içinde `page`, `limit`, `total` ve `totalPages` dön.

---

# 10. Task Modülü

## Endpointler

```text
GET    /projects/:projectId/tasks
POST   /projects/:projectId/tasks
GET    /tasks/:taskId
PATCH  /tasks/:taskId
DELETE /tasks/:taskId
```

## Status

`backlog`, `todo`, `in_progress`, `review`, `completed`

## Priority

`low`, `medium`, `high`, `urgent`

## Kurallar

- Görev yalnızca aynı workspace üyesine atanabilmeli.
- Oluşturan ve atanan kullanıcı ayrı alanlarda tutulmalı.
- Silme soft delete olmalı.
- Tamamlanan görev tekrar açılabilmeli.
- Listeleme search, filter, sorting ve pagination desteklemeli.

---

# 11. Kanban Görünümü

1. Task'ları durumlarına göre sütunlara ayır.
2. İlk sürümde butonla durum değiştir.
3. İkinci sürümde drag-and-drop ekle.
4. Optimistic update uygula.
5. API hatasında state'i eski hâline getir.

```text
Backlog | Todo | In Progress | Review | Completed
```

---

# 12. Comment Modülü

## Endpointler

```text
GET    /tasks/:taskId/comments
POST   /tasks/:taskId/comments
PATCH  /comments/:commentId
DELETE /comments/:commentId
```

## Kurallar

- Yalnızca workspace üyeleri görebilmeli.
- Kullanıcı kendi yorumunu düzenleyebilmeli.
- Owner ve admin yorum silebilmeli.
- Silme soft delete olmalı.
- Yeni yorum görev sahibine bildirim üretmeli.

---

# 13. Attachment Modülü

## Endpointler

```text
POST   /tasks/:taskId/attachments
GET    /tasks/:taskId/attachments
DELETE /attachments/:attachmentId
```

## Kurallar

- Maksimum dosya boyutu belirle.
- MIME type whitelist kullan.
- Diskte UUID isimli dosya sakla.
- Orijinal adı veritabanında tut.
- `uploads/` klasörünü `.gitignore` içine ekle.
- Attachment silindiğinde disk dosyasını da kaldır.

**Öğren:** Multer, FileInterceptor, MIME doğrulama ve dosya temizleme.

---

# 14. Notification Sistemi

## Bildirim türleri

- Workspace'e eklendin.
- Sana görev atandı.
- Görevine yorum yapıldı.
- Son teslim tarihi yaklaşıyor.
- Proje tamamlandı.

## Endpointler

```text
GET   /notifications
PATCH /notifications/:id/read
PATCH /notifications/read-all
```

Kullanıcı yalnızca kendi bildirimlerini görmeli. Okunmamış bildirim sayısı ve pagination desteği olmalı.

---

# 15. pg-boss

## Queue adları

```text
notification-created
send-email
task-deadline-reminder
parse-task-csv
insert-task-batch
audit-log
```

## Yapılacaklar

1. pg-boss module ve service oluştur.
2. Queue isimlerini constants dosyasında tut.
3. `boss.start()` ve `boss.stop()` yaşam döngüsünü kur.
4. Job retry, backoff ve timeout ayarlarını belirle.
5. Worker concurrency değerini küçük başlayarak test et.
6. Job isimlerinin producer ve worker tarafında birebir eşleşmesini sağla.

---

# 16. Mail Worker

## Senaryolar

- Workspace daveti
- Şifre sıfırlama
- Görev atama
- Son teslim tarihi hatırlatması

API yalnızca job göndermeli. Worker maili arka planda göndermeli. Geliştirme ortamında MailHog kullanabilirsin.

**Düşün:** Mail gönderilemezse ana işlem başarısız sayılmalı mı?

---

# 17. Deadline Reminder Worker

1. Her gün çalışan scheduled job oluştur.
2. 24 saat içinde süresi dolacak görevleri sorgula.
3. Bildirim ve mail job'ı oluştur.
4. Aynı hatırlatmanın iki kez gitmesini engelle.
5. Geciken görevler için ayrı bildirim oluştur.

**Öğren:** Cron, idempotency ve duplicate prevention.

---

# 18. CSV ile Toplu Task Aktarımı

## Format

```csv
title,description,status,priority,due_date,assigned_email
Login ekranı,Giriş ekranını oluştur,todo,high,2026-09-10,user@example.com
```

## Endpointler

```text
POST /projects/:projectId/import/upload
GET  /imports/:jobId/status
GET  /imports/:jobId/failed-rows
```

## Akış

```text
Dosya yüklenir
↓
Diskte saklanır
↓
import_jobs kaydı açılır
↓
parse-task-csv job'ı oluşur
↓
Stream ile satırlar okunur
↓
Batch'lere ayrılır
↓
insert-task-batch job'ları oluşur
↓
Geçerli task'lar toplu eklenir
↓
Hatalı satırlar ayrı kaydedilir
↓
Progress bar güncellenir
```

## Doğrulama

- Title zorunlu.
- Status ve priority izin verilen değer olmalı.
- Due date geçerli olmalı.
- assigned_email workspace üyesine ait olmalı.
- Aynı import satırı iki kez eklenmemeli.

---

# 19. Dashboard

## Bilgiler

- Toplam workspace
- Toplam proje
- Toplam görev
- Tamamlanan görev
- Devam eden görev
- Geciken görev
- Kullanıcıya atanmış görevler
- Priority dağılımı
- Status dağılımı
- Son 7 günde tamamlanan görevler

## Endpoint

```text
GET /dashboard/summary
```

**Öğren:** COUNT, GROUP BY, FILTER, CASE WHEN ve tarih sorguları.

---

# 20. Audit Log

Aşağıdaki işlemleri kaydet:

- Workspace oluşturma
- Üye ekleme/çıkarma
- Rol değiştirme
- Proje oluşturma
- Görev oluşturma
- Görev atama
- Durum değiştirme
- Silme

Audit log içinde eski ve yeni veriyi JSONB olarak tut. Ana isteği yavaşlatmamak için audit job'ını pg-boss üzerinden işleyebilirsin.

---

# 21. Next.js Layout Yapısı

```text
app/
├── layout.tsx
├── (auth)/
│   ├── layout.tsx
│   ├── login/
│   ├── register/
│   └── forgot-password/
└── (dashboard)/
    ├── layout.tsx
    ├── dashboard/
    ├── workspaces/
    ├── projects/
    ├── tasks/
    ├── imports/
    ├── notifications/
    └── profile/
```

Auth layout içinde logo ve formlar; dashboard layout içinde header, sidebar, bildirim alanı ve `children` bulunmalı.

---

# 22. Frontend Service Katmanı

```text
services/
├── api.service.ts
├── auth.service.ts
├── workspace.service.ts
├── project.service.ts
├── task.service.ts
├── comment.service.ts
├── attachment.service.ts
├── notification.service.ts
├── dashboard.service.ts
└── import.service.ts
```

Component içinde doğrudan HTTP isteği yazma. Token, refresh, hata yönetimi ve FormData desteğini ortak API service içinde çöz.

---

# 23. Custom Hook Yapısı

```text
hooks/
├── useAuth.ts
├── useWorkspaces.ts
├── useProjects.ts
├── useTasks.ts
├── useComments.ts
├── useNotifications.ts
├── useDashboard.ts
└── useImport.ts
```

Service API ile konuşur. Hook loading, error, processing ve state'i yönetir. Component yalnızca arayüz ve kullanıcı etkileşiminden sorumludur.

---

# 24. Search, Filter, Sort ve Pagination

Task listesinde şu parametreleri destekle:

```text
search
status
priority
assignedTo
createdBy
dueDateFrom
dueDateTo
page
limit
sort
order
```

Filtreleri URL query string içinde tut. Sayfa yenilendiğinde seçimler kaybolmamalı.

---

# 25. Validation

## Backend
- DTO
- class-validator
- ValidationPipe

## Frontend
- Zorunlu alanlar
- Tarih doğrulama
- E-posta doğrulama
- Dosya boyutu ve MIME kontrolü
- Alan bazlı hata mesajları

Bonus olarak Zod ve React Hook Form araştır.

---

# 26. Error Handling

Global exception filter oluştur. Hata cevabını standartlaştır:

```json
{
  "statusCode": 400,
  "message": "Geçersiz veri.",
  "error": "Bad Request",
  "path": "/tasks",
  "timestamp": "..."
}
```

Frontend'de network hatası, API hatası ve validation hatasını ayır. Toast bildirim sistemi ekle.

---

# 27. Logging

NestJS Logger kullan. Şu noktaları logla:

- API başlangıcı
- pg-boss başlangıcı
- Worker job alma ve tamamlama
- Retry
- Dosya yükleme
- Import batch sonucu
- Beklenmeyen hata

Şifre, token ve hassas verileri loglama.

---

# 28. Rate Limiting

Login, register, forgot-password ve upload endpointlerine rate limit uygula. Brute-force ve dosya yükleme kötüye kullanımını önle.

---

# 29. Testler

## Unit test
- AuthService
- WorkspaceService
- ProjectService
- TaskService
- ImportService
- BatchWorker
- Guards

## Integration test
- Register → Login
- Workspace oluşturma
- Üye ekleme
- Project oluşturma
- Task oluşturma ve atama
- Yorum
- Attachment
- CSV import
- Yetkisiz erişim

## Kritik senaryolar
- Member owner işlemi yapamamalı.
- Başka workspace verisi görülememeli.
- Başka kullanıcı yorumu düzenlenememeli.
- Geçersiz status reddedilmeli.
- Hatalı CSV satırları diğer satırları engellememeli.
- Retry sonrası job tamamlanabilmeli.

---

# 30. Büyük Veri Testi

100, 10.000 ve 100.000 satırlık CSV üret.

Kontrol et:

- Batch sayısı
- Başarılı ve hatalı satır sayısı
- İşlem süresi
- Bellek kullanımı
- Worker logları
- Retry
- Duplicate prevention

```bash
docker stats
```

---

# 31. Güvenlik Kontrol Listesi

- SQL sorguları parametreli mi?
- Şifreler hashleniyor mu?
- Secrets `.env` içinde mi?
- Refresh token hashleniyor mu?
- Workspace yetkisi tüm endpointlerde kontrol ediliyor mu?
- Dosya türü ve boyutu kontrol ediliyor mu?
- Soft-deleted kayıtlar filtreleniyor mu?
- Hata mesajları hassas bilgi içeriyor mu?

---

# 32. Performance Kontrolü

- Sık sorgulanan kolonlarda index var mı?
- Pagination zorunlu mu?
- N+1 sorgu var mı?
- Dashboard sorguları optimize mi?
- CSV stream ile okunuyor mu?
- Batch boyutu uygun mu?
- Concurrency connection pool'u tüketiyor mu?

---

# 33. Build ve Son Kontrol

```bash
npm --prefix ./api test -- --runInBand
npm --prefix ./api run build
npm --prefix ./web run lint
npm --prefix ./web run build
docker compose up -d --build
docker compose ps
```

API ve web loglarını kontrol et.

---

# 34. Uçtan Uca Kullanıcı Testi

1. Kayıt ol.
2. Giriş yap.
3. Workspace oluştur.
4. Üye ekle.
5. Proje oluştur.
6. Görev oluştur.
7. Görevi üyeye ata.
8. Üye görev durumunu değiştir.
9. Yorum yaz.
10. Dosya ekle.
11. Bildirim oluştuğunu doğrula.
12. CSV ile task aktar.
13. Progress'i izle.
14. Hatalı satırları görüntüle.
15. Dashboard değerlerini kontrol et.
16. Audit logları kontrol et.
17. Çıkış yap.
18. Refresh token'ın iptal edildiğini doğrula.

---

# 35. Teslim Edilecekler

- Docker Compose
- PostgreSQL migration'ları
- NestJS API
- Next.js web uygulaması
- README
- `.env.example`
- Postman collection
- Test CSV'leri
- Unit/integration testleri
- Build sonuçları
- Büyük veri test sonucu
- Veritabanı şeması
- Ekran görüntüleri

---

# 36. README İçeriği

- Proje amacı
- Kullanılan teknolojiler
- Kurulum
- Environment değişkenleri
- Docker komutları
- Migration kullanımı
- Endpoint özeti
- Roller ve yetkiler
- CSV formatı
- Test komutları
- Klasör yapısı
- Bilinen sınırlamalar

---

# 37. Öğrenme Kontrol Soruları

1. Workspace üyeliği neden ayrı tabloda?
2. Role guard nasıl çalışır?
3. Access ve refresh token farkı nedir?
4. Soft delete neden kullanılır?
5. Pagination neden önemlidir?
6. Dynamic SQL'de güvenlik nasıl sağlanır?
7. Transaction ne zaman gerekir?
8. Queue, job ve worker farkı nedir?
9. Retry ve backoff ne işe yarar?
10. Idempotency nedir?
11. Streaming neden güvenlidir?
12. Batch boyutu nasıl seçilir?
13. Race condition nedir?
14. Atomik update neden önemlidir?
15. Audit log neden tutulur?
16. Optimistic update nedir?
17. Rate limiting neden gerekir?
18. Index ne zaman kullanılmalıdır?
19. N+1 sorgu problemi nedir?
20. Service, hook ve component görevleri nasıl ayrılır?

---

# 38. Bonus Özellikler

- WebSocket ile gerçek zamanlı bildirim
- Gerçek zamanlı Kanban
- Takvim görünümü
- Gantt chart
- Proje şablonları
- Tekrarlayan görevler
- Task dependency
- Etiket ve mention
- S3 dosya depolama
- Redis cache
- BullMQ karşılaştırması
- PostgreSQL full-text search
- Multi-tenant yapı
- Two-factor authentication

---

# Hata Ayıklama Sırası

Bir özellik çalışmadığında:

1. Tarayıcı Network
2. Frontend component
3. Frontend hook
4. Frontend service
5. API route
6. JWT guard
7. Role guard
8. Controller
9. Service
10. SQL sorgusu
11. PostgreSQL kayıtları
12. pg-boss job durumu
13. Worker logları
14. Docker kaynak kullanımı

Tahmin ederek kod değiştirme. Önce hatanın bulunduğu katmanı kanıtla.

---

# Son Not

Bu projede amaç yalnızca çalışan bir uygulama yapmak değil; katmanlı mimariyi, ilişkili veritabanı tasarımını, yetkilendirmeyi, kuyruk sistemini, büyük veri işlemeyi, test yazmayı ve profesyonel hata ayıklama alışkanlığını öğrenmektir.

Her modülü şu sırayla geliştir:

```text
İhtiyaçları anla
↓
Veritabanını tasarla
↓
Migration yaz
↓
Backend'i geliştir
↓
Postman ile test et
↓
Frontend service yaz
↓
Hook oluştur
↓
Component ve page oluştur
↓
Uçtan uca test et
```
