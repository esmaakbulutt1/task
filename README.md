# TaskFlow

TaskFlow; çalışma alanı, proje ve görev yönetimini tek uygulamada birleştiren tam yığın bir proje yönetimi uygulamasıdır. Next.js arayüzü, NestJS API, PostgreSQL, Redis Search ve Docker Compose ile çalışır.

## Özellikler

- Access ve refresh token ile kimlik doğrulama
- Owner, admin ve member rollerine göre yetkilendirme
- Workspace, üye, proje ve görev yönetimi
- Proje ve görevlerde arama, filtreleme, sıralama ve sayfalama
- Redis Search ile hızlı proje ve görev araması
- Redis üzerinde paylaşılan rate-limit sayaçları
- Kanban görünümü ve görev durumu yönetimi
- Yorumlar ve PDF/JPEG/PNG dosya ekleri
- Bildirim merkezi, audit log ve deadline hatırlatmaları
- CSV ile toplu görev aktarımı ve hatalı satır raporu
- Türkçe ve İngilizce arayüz

## Teknolojiler

| Katman | Teknolojiler |
| --- | --- |
| Web | Next.js, React, TypeScript, next-intl |
| API | NestJS, TypeScript, JWT, class-validator |
| Veritabanı | PostgreSQL 16 |
| Arama ve rate limiting | Redis 8, Redis Search |
| Arka plan işleri | pg-boss |
| Çalıştırma | Docker Compose |

## Mimari

```text
Tarayıcı (Next.js)
        |
        | HTTP + JWT
        v
NestJS API --------------------> PostgreSQL
    |                                |
    |                                `-> search_outbox
    |
    +--------------------------> Redis
    |                              |- proje/görev arama indeksleri
    |                              `- rate-limit sayaçları
    |
    `--------------------------> pg-boss workerları
                                   |- bildirim ve e-posta
                                   |- audit ve deadline
                                   `- CSV parse / batch insert
```

PostgreSQL uygulamanın ana veri kaynağıdır. Redis, projelerin ve görevlerin aranabilir kopyalarını tutar. PostgreSQL değişiklikleri `search_outbox` tablosuna yazılır ve senkronizasyon servisi bunları Redis’e aktarır. Redis geçici olarak kullanılamazsa proje ve görev listeleme işlemleri PostgreSQL sorgusuna geri döner.

Frontend özellikleri genel olarak şu katman sırasını kullanır:

```text
types -> service -> hook -> component -> app/page
```

## Ekran görüntüleri

### Giriş

![TaskFlow giriş sayfası](docs/screenshots/login.png)

### Dashboard

![TaskFlow dashboard sayfası](docs/screenshots/dashboard.png)

### Çalışma alanları

![TaskFlow çalışma alanları sayfası](docs/screenshots/workspaces.png)

## Docker ile çalıştırma

Gereksinimler: Docker Desktop ve Docker Compose.

1. `.env.example` dosyasını `.env` adıyla kopyalayın.
2. `JWT_SECRET` değerini en az 32 karakterlik rastgele bir değerle değiştirin.
3. E-posta gönderilecekse SMTP alanlarını doldurun.
4. Proje kökünde aşağıdaki komutu çalıştırın:

```bash
docker compose up -d --build
```

Uygulama adresleri:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:5433`

Redis yalnızca Docker ağı içinde API tarafından kullanılır. PostgreSQL sağlıklı hale geldiğinde migration servisi çalışır. API; migration işleminin tamamlanmasını ve Redis’in hazır olmasını bekler, ardından web başlatılır.

Servisleri kontrol etmek veya durdurmak için:

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose down
```

`docker compose down` kalıcı volume verilerini silmez. `docker compose down -v` ise PostgreSQL, Redis ve upload volume verilerini siler; yalnızca tamamen sıfırlamak istediğinizde kullanın.

## Geliştirme modu

Web tarafındaki değişiklikleri Docker image’ını tekrar oluşturmadan görmek için ana compose dosyasını geliştirme override dosyasıyla birlikte çalıştırın:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Bu modda `web/` klasörü konteynere bağlanır ve Next.js değişiklikleri otomatik yeniler. API kaynak kodu için production image kullanıldığı için API değişikliklerinden sonra API servisini yeniden build etmek gerekir.

## Redis Search akışı

1. Proje veya görev PostgreSQL’de oluşturulur, güncellenir ya da silinir.
2. Veritabanı trigger’ı olayı `search_outbox` tablosuna ekler.
3. `SearchSyncService` olayı işler.
4. `SearchDocumentService` ilgili Redis hash kaydını ekler, günceller veya siler.
5. `SearchIndexService` proje ve görev indekslerini hazırlar.
6. Arama servisleri filtreleme, sıralama ve sayfalamayı Redis Search üzerinden yapar.

Uygulama ilk açıldığında PostgreSQL’deki aktif projeler ve görevler Redis ile tekrar karşılaştırılır. Böylece kaçırılmış bir outbox olayı veya silinmiş Redis verisi düzeltilir.

## Testler

```bash
npm --prefix api test -- --runInBand
npm --prefix api run build

npm --prefix web run lint
npm --prefix web run build
```

Çalışan Docker servisleri üzerinde genel akışı kontrol etmek için:

```bash
node scripts/smoke-test.mjs
```

## CSV aktarımı

CSV başlıkları şu sırada olmalıdır:

```csv
title,description,status,priority,due_date,assigned_email
```

Örnek dosyalar [samples/csv](samples/csv) klasöründedir. Performans dosyalarını yeniden oluşturmak için `node scripts/generate-test-csv.mjs` kullanılabilir.

## Dokümantasyon

- [Veritabanı şeması](docs/database-schema.md)
- [Postman koleksiyonu](docs/TaskFlow.postman_collection.json)
- [Proje gereksinimleri ve kontrol listesi](taskflow-project-task.md)

## Önemli klasörler

```text
api/                 NestJS API, arama ve worker servisleri
web/                 Next.js App Router arayüzü
db/migrations/       PostgreSQL migration dosyaları
docs/                Şema, Postman koleksiyonu ve ekran görüntüleri
samples/csv/         CSV örnekleri ve performans dosyaları
scripts/             Test ve yardımcı scriptler
```

## Güvenlik notları

- `.env` dosyasını ve gerçek secret değerlerini repoya eklemeyin.
- Parolalar bcrypt ile hashlenir; refresh ve reset tokenları düz metin tutulmaz.
- SQL sorguları parametrelidir ve DTO verileri global doğrulamadan geçer.
- Upload dosyaları MIME türü ve boyut kontrollerinden geçirilir.


## CI/CD

- **CI:** API ve Web için lint, test ve build kontrollerini çalıştırır.
- **CD:** CI başarılı olursa Docker image’larını GitHub Container Registry’ye yayınlar.

```bash
docker compose -f docker-compose.yml -f docker-compose.release.yml up -d
```