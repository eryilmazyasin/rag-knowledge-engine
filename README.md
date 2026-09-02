# 🧠 RAG Knowledge Engine

<p align="center">
  <img src="./public/Screenshot-4.png" alt="RAG Knowledge Engine Chat Preview" width="850" />
</p>

[TR] PostgreSQL (pgvector), Drizzle ORM ve Google Gemini 3.6 destekli, doküman izolasyonlu ve interaktif kaynak atıflı (citation) Full-Stack Retrieval-Augmented Generation (RAG) motoru.

[EN] Production-ready Full-Stack Retrieval-Augmented Generation (RAG) engine powered by PostgreSQL (pgvector), Drizzle ORM, and Google Gemini 3.6, featuring document-level isolation, interactive citations, and Drizzle Studio visualizer.

---

## 📑 İçindekiler / Table of Contents

1. [Türkçe Dokümantasyon](#-türkçe-dokümantasyon)
   - [Özellikler](#özellikler)
   - [Teknoloji Yığını](#teknoloji-yığını)
   - [Sistem Mimarisi](#sistem-mimarisi)
   - [Kurulum Adımları](#kurulum-adımları)
   - [Drizzle Studio ile Vektörleri İnceleme](#drizzle-studio-ile-vektörleri-ve-veritabanını-görselleştirme)
   - [Mimari Kararlar ve Optimizasyonlar](#mimari-kararlar-ve-optimizasyonlar)
   - [Olası Hatalar ve Çözüm Rehberi](#olası-hatalar-ve-çözüm-rehberi)
2. [English Documentation](#-english-documentation)
   - [Features](#features)
   - [Tech Stack](#tech-stack)
   - [Architecture](#architecture)
   - [Getting Started](#getting-started)
   - [Visualizing Data with Drizzle Studio](#visualizing-data-with-drizzle-studio)
   - [Architectural Decisions & Optimizations](#architectural-decisions--optimizations)
   - [Troubleshooting](#troubleshooting)

---

# 🇹🇷 Türkçe Dokümantasyon

## Özellikler

- **Hibrit Belge İndeksleme:** PDF ve TXT formatındaki dokümanları saf Node.js stream mimarisi (`pdf2json`) ile güvenle okur.
- **Akıllı Parçalama (Contextual Chunking):** Paragraf ve cümle bütünlüğünü koruyan, 150 karakter örtüşmeli (overlap) sliding-window algoritması.
- **768-Boyutlu Matryoshka Embeddings:** `gemini-embedding-2` modeli üzerinden üretilen, semantik kaliteden ödün vermeden HNSW indeks sınırlarına uyumlu hale getirilmiş vektörler.
- **Tip Güvenli ORM Katmanı (Drizzle ORM):** Özel pgvector tipleriyle modellenmiş, tip güvenli veritabanı şeması.
- **HNSW İndeksli pgvector:** Milisaniyeler mertebesinde kosinüs uzaklığı (`<=>`) araması.
- **Doküman İzolasyonu (Document Scoping):** Tüm havuzda veya seçilen doküman özelinde arama yapabilme; dokümana özel izole chat oturumları.
- **İnteraktif Atıflar (Citation Badges):** Model yanıtındaki `[1]`, `[2]` butonlarına tıklandığında kaynak metin parçasını ve benzerlik skorunu gösteren modal.
- **Görsel Veritabanı Yönetimi (Drizzle Studio):** Tek komutla tarayıcı üzerinden tabloları ve 768 boyutlu ham vektörleri inceleme imkanı.

## Teknoloji Yığını

- **Frontend / Fullstack:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Veritabanı & Vektör Deposu:** PostgreSQL 16 + `pgvector` eklentisi (Docker Compose)
- **ORM & Veri Yönetimi:** Drizzle ORM, Drizzle Studio, node-postgres (`pg`)
- **Yapay Zeka & Embedding:** Google Gemini SDK (`gemini-embedding-2`, `gemini-3.6-flash`)
- **Belge Ayrıştırma:** `pdf2json`

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
- Google Gemini API Anahtarı ([Google AI Studio](https://aistudio.google.com/))

### 2. Repoyu Klonlayın ve Bağımlılıkları Yükleyin

```bash
git clone [https://github.com/kullanici-adiniz/rag-knowledge-engine.git](https://github.com/kullanici-adiniz/rag-knowledge-engine.git)
cd rag-knowledge-engine
npm install
```

### 3. Çevre Değişkenlerini Tanımlayın

Kök dizinde `.env.example` dosyasını `.env.local` olarak kopyalayın ve anahtarınızı ekleyin:

```bash
cp .env.example .env.local
```

`.env.local` içeriği:

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

Tarayıcınızda `http://localhost:3000` adresine gidin. Sol paneldeki hazır örneklerden **"Doğrudan Yükle ⚡"** butonuna basarak sistemi anında deneyebilirsiniz.

---

## Drizzle Studio ile Vektörleri ve Veritabanını Görselleştirme

İndekslenen parçaları ve koordinat vektörlerini görsel arayüz üzerinden incelemek için:

```bash
npm run db:studio
```

Tarayıcınızda `https://local.drizzle.studio` adresini açarak:

- `documents`: Yüklenen dosyaların başlıklarını ve kimliklerini (ID),
- `document_chunks`: Metin kesitlerini, parça sıra numaralarını ve 768 boyutlu ham embedding dizilerini görebilirsiniz.

---

## Mimari Kararlar ve Optimizasyonlar

### `HNSW Index 2000 Dimension Limit` ve Matryoshka Embeddings

- **Teknik Durum:** `gemini-embedding-2` modeli varsayılan olarak **3072 boyutlu** vektör çıktısı üretir. Ancak PostgreSQL `pgvector` eklentisindeki HNSW (Hierarchical Navigable Small World) indeksi maksimum **2000 boyut** destekler.
- **Mühendislik Çözümü:** İndeks kullanmayıp doğrusal tarama ($O(N)$) ile aramayı yavaşlatmak yerine, Google'ın _Matryoshka Representation Learning_ özelliği kullanıldı. Model çağrısında `outputDimensionality: 768` parametresi verilerek anlamsal kalite kaybı olmadan vektör boyutu 768'e sabitlendi; böylece HNSW indeksi tam performansla çalışır hale getirildi ve bellek tüketimi 4 kat azaltıldı.

---

## Olası Hatalar ve Çözüm Rehberi

| Hata Mesajı                                | Sebebi                                                             | Kesin Çözüm                                                                                  |
| :----------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| `expected 768 dimensions, not 3072`        | PostgreSQL tablosunun 768 boyut beklerken modelin 3072 göndermesi. | `src/lib/gemini.ts` içinde `config: { outputDimensionality: 768 }` parametresini tanımlayın. |
| `Error: listen EADDRINUSE: 127.0.0.1:4983` | Drizzle Studio portunun önceki bir process tarafından tutulması.   | `npx kill-port 4983` komutunu çalıştırıp tekrar deneyin.                                     |
| `API_KEY_INVALID` veya Boş Yanıt           | `.env.local` dosyasının okunmaması veya anahtarın hatalı olması.   | `.env.local` dosyasındaki `GEMINI_API_KEY` değerini teyit edin ve sunucuyu yeniden başlatın. |
| `Hydration mismatch: cz-shortcut-listen`   | Tarayıcı eklentilerinin (ColorZilla vb.) DOM'a müdahale etmesi.    | `src/app/layout.tsx` dosyasında `<body>` etiketine `suppressHydrationWarning` ekleyin.       |

---

# 🇬🇧 English Documentation

## Features

- **Hybrid Document Ingestion:** Memory-efficient stream parsing for PDF and TXT documents using `pdf2json`.
- **Contextual Chunking:** Sliding-window text chunker (800 chars) with 150-char overlap to preserve semantic continuity across chunk boundaries.
- **768-d Matryoshka Embeddings:** State-of-the-art `gemini-embedding-2` embeddings dimensionality-reduced to 768 to comply with HNSW indexing limits without semantic degradation.
- **Type-Safe ORM Layer (Drizzle ORM):** Custom pgvector types, type-safe schema definitions, and seamless database operations.
- **HNSW Vector Search with pgvector:** Sub-millisecond Approximate Nearest Neighbor (ANN) search using cosine distance (`<=>`).
- **Document-Level Scoping & Isolation:** Query across the entire knowledge base or scope retrieval down to a specific document. Isolated chat history per document.
- **Interactive Citations:** Perplexity-style inline reference badges (`[1]`, `[2]`) opening modals that inspect exact source text chunks and similarity scores.
- **Visual Vector Inspection (Drizzle Studio):** Zero-config browser-based GUI to inspect documents, chunk tokens, and high-dimensional vector embeddings.

## Tech Stack

- **Frontend / Fullstack:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database & Vector Store:** PostgreSQL 16 with `pgvector` (Docker Compose)
- **ORM & Data Layer:** Drizzle ORM, Drizzle Studio, node-postgres (`pg`)
- **AI & Embedding Engine:** Google Gemini SDK (`gemini-embedding-2`, `gemini-3.6-flash`)
- **Document Parser:** `pdf2json`

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

Copy `.env.example` to `.env.local` and provide your Gemini API key:

```bash
cp .env.example .env.local
```

Contents of `.env.local`:

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

## Visualizing Data with Drizzle Studio

To visually explore the database tables, stored chunks, and raw embedding arrays:

```bash
npm run db:studio
```

Open `https://local.drizzle.studio` in your browser to inspect records in real-time.

---

## Architectural Decisions & Optimizations

### Handling pgvector's HNSW 2000-Dimension Limit with Matryoshka Embeddings

- **Technical Context:** Google's `gemini-embedding-2` produces 3072-dimensional embeddings by default. However, PostgreSQL's `pgvector` HNSW index caps dimensionality at 2000.
- **Decision:** Dropping the index would force sequential scans ($O(N)$). Leveraging Google's _Matryoshka Representation Learning_, we set `outputDimensionality: 768`. This preserves semantic fidelity, reduces database memory footprint by 4x, and enables full HNSW indexing.

---

## Troubleshooting

| Error                                      | Cause                                                               | Resolution                                                               |
| :----------------------------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| `expected 768 dimensions, not 3072`        | Database vector column mismatch.                                    | Ensure `outputDimensionality: 768` is configured in `src/lib/gemini.ts`. |
| `Error: listen EADDRINUSE: 127.0.0.1:4983` | Port 4983 occupied by a lingering process.                          | Run `npx kill-port 4983` and restart Drizzle Studio.                     |
| `API_KEY_INVALID`                          | Malformed or missing environment key.                               | Verify credentials in `.env.local` and restart the server.               |
| `Hydration mismatch: cz-shortcut-listen`   | Third-party browser extensions (e.g. ColorZilla) modifying the DOM. | Applied `suppressHydrationWarning` on root `<body>`.                     |

---

## License

MIT © 2026. Built with focus on production-grade AI integration and modern engineering standards.
