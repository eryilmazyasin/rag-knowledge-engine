import { GoogleGenAI } from "@google/genai";

// Gemini SDK Başlatma
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * [ÖĞRENME NOTU: Embedding Mantığı]
 * Bu fonksiyon, verilen metni 768 boyutlu bir float dizisine (koordinatlara) çevirir.
 * "text-embedding-004", Google'ın en optimize ve semantik anlama kapasitesi yüksek modelidir.
 *
 * Yeni SDK yapısında dönen yanıt 'embeddings' dizisi şeklindedir.
 * Tek bir metin gönderdiğimiz için ilk elemanın (index 0) değerlerini alıyoruz.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });

  const values = response.embeddings?.[0]?.values;

  console.log({ values });

  if (!values) {
    throw new Error("Embedding üretilemedi.");
  }

  return values;
}
