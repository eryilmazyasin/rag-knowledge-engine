# 🧠 RAG Knowledge Engine

[TR] PostgreSQL (pgvector) ve Google Gemini 3.6 destekli, doküman izolasyonlu ve interaktif kaynak atıflı (citation) Full-Stack Retrieval-Augmented Generation (RAG) motoru.

[EN] Production-ready Full-Stack Retrieval-Augmented Generation (RAG) engine powered by PostgreSQL (pgvector) and Google Gemini 3.6, featuring document-level isolation and interactive citations.

---

## 📑 İçindekiler / Table of Contents

1. [Türkçe Dokümantasyon](#-türkçe-dokümantasyon)
   - [Mimarisi ve Özellikler](#özellikler)
   - [Sistem Mimarisi](#sistem-mimarisi)
   - [Kurulum Adımları](#kurulum-adımları)
   - [Karşılaşılan Teknik Zorluklar ve Çözümler](#karşılaşılan-teknik-zorluklar-ve-çözümler)
   - [Olası Hatalar ve Çözüm Rehberi](#olası-hatalar-ve-çözüm-rehberi)
2. [English Documentation](#-english-documentation)
   - [Features](#features)
   - [Architecture](#architecture)
   - [Getting Started](#getting-started)
   - [Technical Challenges & Engineering Decisions](#technical-challenges--engineering-decisions)
   - [Troubleshooting](#troubleshooting)

---

# 🇹🇷 Türkçe Dokümantasyon

## Özellikler

- **Hibrit Belge İndeksleme:** PDF ve TXT formatındaki dokümanları saf Node.js ayrıştırıcısı (`pdf2json`) ile güvenle okur.
- **Akıllı Parçalama (Contextual Chunking):** Cümle ve paragraf bütünlüğünü bozmayan, 150 karakter örtüşmeli (overlap) chunking algoritması.
- **768-Boyutlu Matryoshka Embeddings:** `gemini-embedding-2` modeli kullanılarak üretilen ve HNSW indeks sınırlarına uyumlu hale getirilen vektör temsilleri.
- **HNSW İndeksli pgvector:** Milisaniyeler mertebesinde kosinüs uzaklığı (`<=>`) araması.
- **Doküman İzolasyonu (Document Scoping):** İster tüm doküman havuzunda, ister seçilen tek bir doküman özelinde bağlamsal arama. Dokümana özel bağımsız sohbet oturumu.
- **İnteraktif Atıflar (Interactive Citation Badges):** Yanıt içindeki `[1]`, `[2]` rozetlerine tıklandığında kaynak dokümanın ilgili parçasını ve benzerlik skorunu gösteren modal.
- **Hazır Demo Dokümanları:** Tek tıkla veritabanına indekslenebilen veya indirilebilen hazır test senaryoları.

## Sistem Mimarisi

```text
[ Kullanıcı Arayüzü (Next.js App Router + Tailwind CSS) ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   /api/ingest                       /api/chat
        │                                 │
 [ pdf2json Metin Ayrıştırma ]      [ Soru Vektörleştirme ]
        │                                 │
 [ Overlapping Chunker ]            [ pgvector Cosine Search ]
        │                                 │
 [ gemini-embedding-2 (768-d) ]           │
        │                                 ▼
        ▼                      [ Gemini 3.6 Flash Sentezi ]
[ PostgreSQL (Docker) + HNSW ]            │
        ▲                                 ▼
        └───────────────────────── [ Atıflı JSON Yanıtı ]
```

## Kurulum Adımları

### 1. Gereksinimler

- Node.js 18+
- Docker ve Docker Compose
- Google Gemini API Anahtarı ([Google AI Studio](https://aistudio.google.com/) üzerinden ücretsiz temin edilebilir)

### 2. Repoyu Klonlayın ve Bağımlılıkları Yükleyin

```bash
git clone [https://github.com/kullanici-adiniz/rag-knowledge-engine.git](https://github.com/kullanici-adiniz/rag-knowledge-engine.git)
cd rag-knowledge-engine
npm install
```

### 3. Çevre Değişkenlerini Tanımlayın

Kök dizinde `.env.local` dosyası oluşturun:

```env
GEMINI_API_KEY=AIzaSy...SizinApiKeyiniz
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rag_db
```

### 4. PostgreSQL (pgvector) Konteynerini Başlatın

```bash
docker compose up -d
```

### 5. Veritabanı Tablolarını ve HNSW İndeksini Oluşturun

```bash
docker exec -it rag-postgres psql -U postgres -d rag_db -c "
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    metadata JSONB,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
"
```

### 6. Uygulamayı Başlatın

```bash
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresine gidin. Sol panelden **"Doğrudan Yükle ⚡"** butonuna basarak sistemi anında test edebilirsiniz.

---

## Karşılaşılan Teknik Zorluklar ve Çözümler

### 1. `HNSW Index 2000 Dimension Limit` Darboğazı

- **Problem:** Yeni nesil `gemini-embedding-2` modeli varsayılan olarak **3072 boyut** üretir. Ancak PostgreSQL `pgvector` eklentisindeki HNSW indeksi maksimum **2000 boyut** destekler (`ERROR: column cannot have more than 2000 dimensions for hnsw index`).
- **Mühendislik Çözümü:** İndeksleme hızından taviz vermek yerine, Google'ın _Matryoshka Representation Learning_ özelliğinden faydalanıldı. Model çağrısında `outputDimensionality: 768` parametresi verilerek anlamsal doğruluk korunup vektör boyutu 768'e sabitlendi ve HNSW indeksi devreye alındı.

### 2. Next.js Turbopack ve `DOMMatrix is not defined` Hatası

- **Problem:** Yaygın kullanılan `pdf-parse` paketi, CommonJS yapısı ve arka planda tarayıcı nesnelerine (`DOMMatrix`, `canvas`) bağımlı olması sebebiyle Next.js App Router sunucu tarafında çökmeye yol açtı.
- **Mühendislik Çözümü:** Saf Node.js buffer akışlarını kullanan ve hiçbir tarayıcı polifill'ine ihtiyaç duymayan `pdf2json` mimarisine geçildi.

---

## Olası Hatalar ve Çözüm Rehberi

| Hata Mesajı                                                     | Sebebi                                                                 | Kesin Çözüm                                                                                     |
| :-------------------------------------------------------------- | :--------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `404 NOT_FOUND: models/text-embedding-004 is not found`         | Google API sürümünde eski modellerin kullanımdan kalkması.             | `gemini-embedding-2` modeline geçin (`src/lib/gemini.ts`).                                      |
| `404 NOT_FOUND: models/gemini-2.5-flash is no longer available` | Hesabın daha güncel Flash modeline yönlendirilmesi.                    | `gemini-3.6-flash` modelini kullanın (`src/app/api/chat/route.ts`).                             |
| `expected 768 dimensions, not 3072`                             | PostgreSQL tablosunun 768 boyut beklerken modelin 3072 göndermesi.     | `src/lib/gemini.ts` içinde `config: { outputDimensionality: 768 }` parametresini tanımlayın.    |
| `API_KEY_INVALID` veya Boş Yanıt                                | `.env.local` dosyasının okunmaması veya anahtarın hatalı olması.       | Sunucuyu yeniden başlatın (`npm run dev`) ve Google AI Studio üzerinden anahtarı teyit edin.    |
| `Hydration mismatch: cz-shortcut-listen`                        | ColorZilla veya benzeri tarayıcı eklentilerinin DOM'a müdahale etmesi. | `src/app/layout.tsx` dosyasında `<body>` etiketine `suppressHydrationWarning` prop'unu ekleyin. |

---

# 🇬🇧 English Documentation

## Features

- **Hybrid Document Ingestion:** Production-ready parsing for PDF and TXT documents using pure Node.js streams (`pdf2json`).
- **Contextual Chunking:** Sliding-window text chunker (800 chars) with 150-char overlap to preserve semantic continuity across chunk borders.
- **768-d Matryoshka Embeddings:** State-of-the-art `gemini-embedding-2` embeddings dimensionality-reduced to 768 to comply with HNSW indexing limits without semantic degradation.
- **HNSW Vector Search with pgvector:** High-performance Approximate Nearest Neighbor (ANN) search using cosine distance (`<=>`).
- **Document-Level Scoping & Isolation:** Query across the entire knowledge base or restrict retrieval to a specific document. Isolated chat histories per document.
- **Interactive Citations:** Perplexity-style inline reference badges (`[1]`, `[2]`) triggering detail modals displaying exact source snippets and similarity scores.
- **One-Click Demo Ingestion:** Integrated sample datasets (HR Policy & API Specifications) for instant verification.

## Architecture

```text
[ Client Application (Next.js App Router + Tailwind CSS) ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   /api/ingest                       /api/chat
        │                                 │
 [ pdf2json Stream Extraction ]     [ Query Vectorization ]
        │                                 │
 [ Overlapping Chunker ]            [ pgvector Cosine Search ]
        │                                 │
 [ gemini-embedding-2 (768-d) ]           │
        │                                 ▼
        ▼                      [ Gemini 3.6 Flash Synthesis ]
[ PostgreSQL (Docker) + HNSW ]            │
        ▲                                 ▼
        └───────────────────────── [ Cited JSON Response ]
```

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Google Gemini API Key ([Obtain free from Google AI Studio](https://aistudio.google.com/))

### 2. Clone and Install

```bash
git clone [https://github.com/your-username/rag-knowledge-engine.git](https://github.com/your-username/rag-knowledge-engine.git)
cd rag-knowledge-engine
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=AIzaSy...YourKeyHere
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rag_db
```

### 4. Spin up PostgreSQL with pgvector

```bash
docker compose up -d
```

### 5. Initialize Schema & HNSW Index

```bash
docker exec -it rag-postgres psql -U postgres -d rag_db -c "
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    metadata JSONB,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
"
```

### 6. Run the Application

```bash
npm run dev
```

Open `http://localhost:3000`. Click **"Doğrudan Yükle ⚡"** on any sample document to ingest and test the RAG engine immediately.

---

## Technical Challenges & Engineering Decisions

### 1. Handling pgvector's HNSW 2000-Dimension Limit

- **Challenge:** Google's `gemini-embedding-2` produces 3072-dimensional embeddings by default. However, PostgreSQL's `pgvector` HNSW index limits indexing to 2000 dimensions (`ERROR: column cannot have more than 2000 dimensions for hnsw index`).
- **Decision:** Dropping the HNSW index would degrade search latency from sub-millisecond to sequential scan ($O(N)$). Leveraging Google's _Matryoshka Representation Learning_, we set `outputDimensionality: 768`. This preserves semantic fidelity, reduces database memory footprint by 4x, and enables full HNSW indexing.

### 2. Turbopack Compatibility & Browser Polifill Crashes

- **Challenge:** Traditional libraries like `pdf-parse` rely on outdated `pdfjs-dist` builds that attempt to access browser globals (`DOMMatrix`, `canvas`), crashing Next.js App Router during server execution.
- **Decision:** Replaced with `pdf2json`, a pure Node.js buffer-based parser that executes deterministically across serverless and Node environments.

---

## Troubleshooting

| Error                                      | Cause                                                               | Resolution                                                               |
| :----------------------------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| `404 NOT_FOUND: models/text-embedding-004` | Deprecated embedding model in current API tier.                     | Upgraded to `gemini-embedding-2`.                                        |
| `404 NOT_FOUND: models/gemini-2.5-flash`   | Tier restriction on legacy Flash alias.                             | Upgraded to `gemini-3.6-flash`.                                          |
| `expected 768 dimensions, not 3072`        | Database vector column mismatch.                                    | Ensure `outputDimensionality: 768` is configured in `src/lib/gemini.ts`. |
| `API_KEY_INVALID`                          | Malformed or missing environment key.                               | Verify credentials in `.env.local` and restart the server.               |
| `Hydration mismatch: cz-shortcut-listen`   | Third-party browser extensions (e.g. ColorZilla) modifying the DOM. | Applied `suppressHydrationWarning` on root `<body>`.                     |

---

## License

MIT © 2026. Built with focus on production-grade AI integration and modern engineering standards.
