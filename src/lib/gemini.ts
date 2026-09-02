import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * [ÖĞRENME NOTU: Matryoshka Embeddings & HNSW Boyut Sınırı]
 * PostgreSQL pgvector'de HNSW indeksi maksimum 2000 boyuta izin verir.
 * 'gemini-embedding-2' varsayılan olarak 3072 boyut üretse de, Google'ın
 * 'Matryoshka Embedding' desteği sayesinde 'outputDimensionality: 768' vererek
 * semantik kaliteyi kaybetmeden vektörü 768 boyuta indirgeriz.
 * Böylece pgvector HNSW indeksi kusursuz çalışır.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  console.log(
    `📡 [Embedding İsteği]: "${text.slice(0, 50)}..." (${text.length} karakter)`,
  );

  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
    config: {
      outputDimensionality: 768,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (!values) {
    console.error("❌ [Embedding Hatası]: API boş vektör döndü.");
    throw new Error("Embedding üretilemedi.");
  }

  console.log(
    `✨ [Embedding Üretildi]: ${values.length} boyutlu vektör hazır.`,
  );
  return values;
}
