# TaskFlow veritabanı şeması

Ana ilişkiler aşağıdaki gibidir. pg-boss kendi tablolarını `pgboss` şemasında yönetir; diyagramda yalnız uygulama tabloları gösterilir.

```mermaid
erDiagram
  USERS ||--o{ REFRESH_TOKENS : owns
  USERS ||--o{ PASSWORD_RESET_TOKENS : requests
  USERS ||--o{ WORKSPACES : owns
  USERS ||--o{ WORKSPACE_MEMBERS : joins
  WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
  WORKSPACES ||--o{ PROJECTS : contains
  PROJECTS ||--o{ TASKS : contains
  USERS ||--o{ TASKS : creates
  USERS ||--o{ TASKS : assigned
  TASKS ||--o{ COMMENTS : has
  USERS ||--o{ COMMENTS : writes
  TASKS ||--o{ ATTACHMENTS : has
  USERS ||--o{ ATTACHMENTS : uploads
  USERS ||--o{ NOTIFICATIONS : receives
  WORKSPACES ||--o{ AUDIT_LOGS : records
  PROJECTS ||--o{ IMPORT_JOBS : imports
  IMPORT_JOBS ||--o{ IMPORT_FAILED_ROWS : rejects
  IMPORT_JOBS ||--o{ IMPORT_SUCCEEDED_ROWS : accepts
  TASKS ||--o{ TASK_DEADLINE_REMINDERS : schedules
```

## Temel kararlar

- Tüm ana kimlikler UUID’dir.
- `workspaces`, `projects`, `tasks` ve `comments` soft delete alanı taşır.
- Workspace üyeliği `(workspace_id, user_id)` için tektir.
- `event_id`, notification ve audit workerlarında retry sırasında duplicate kaydı engeller.
- Import başarılı satır tablosundaki `(import_job_id, row_number)` benzersizliği batch retry işlemini idempotent yapar.
- Dashboard ve deadline sorguları için kısmi indexler bulunur.
- `schema_migrations`, çalıştırılan SQL dosyalarını kaydeder.

## Migration ekleme

Yeni dosyayı üç haneli sıra numarasıyla ekleyin:

```text
014_feature_name.sql
```

Sonra çalıştırın:

```bash
docker compose run --rm migrate
```

Migration dosyası uygulandıktan sonra adı `schema_migrations` tablosuna yazılır. Daha önce uygulanmış dosyalar tekrar çalıştırılmaz.
