import * as dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  const client = await pool.connect();
  try {
    console.log("Veritabanı tabloları ve pgvector hazırlanıyor...");

    // 1. pgvector eklentisini aç
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // 2. Belgeler tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Chunks tablosu (text-embedding-004 için 768 boyut)
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        metadata JSONB,
        embedding vector(768),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. HNSW Index (Hızlı benzerlik aramaları için)
    await client.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
      ON document_chunks 
      USING hnsw (embedding vector_cosine_ops);
    `);

    console.log("Veritabanı şeması başarıyla oluşturuldu!");
  } catch (error) {
    console.error("Hata oluştu:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
