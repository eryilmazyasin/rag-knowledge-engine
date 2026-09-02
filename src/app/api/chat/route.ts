import { query } from "@/lib/db";
import { ai, generateEmbedding } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("\n--- [RAG RETRIEVAL & GENERATION BAŞLADI] ---");
    const startTime = Date.now();

    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      console.warn("⚠️ Uyarı: Geçerli bir soru iletilmedi.");
      return NextResponse.json(
        { error: "Geçerli bir soru girilmelidir." },
        { status: 400 },
      );
    }

    console.log(`❓ Kullanıcı Sorusu: "${question}"`);

    // 1. Sorunun Embedding Vektörünü Çıkar
    console.log("🧠 Sorunun embedding koordinatları alınıyor...");
    const questionEmbedding = await generateEmbedding(question);
    const embeddingSqlString = `[${questionEmbedding.join(",")}]`;

    // 2. pgvector ile En Alakalı Parçaları Bul (Top-K Benzerlik Araması)
    /**
     * [ÖĞRENME NOTU: Cosine Distance (<=>)]
     * 'embedding <=> $1' ifadesi vektörler arasındaki açısal uzaklığı (cosine distance) hesaplar.
     * Mesafe 0'a ne kadar yakınsa, metinler anlamsal olarak o kadar birbirine benzerdir.
     * '1 - (embedding <=> $1)' formülü ise bize 0 ile 1 arasında benzerlik skorunu (Similarity Score) verir.
     */
    console.log(
      "🔍 PostgreSQL (pgvector) üzerinde benzerlik araması yapılıyor...",
    );
    const topK = 4; // Modele verilecek en alakalı parça sayısı

    const searchResult = await query(
      `
      SELECT 
        c.id,
        c.content,
        c.chunk_index,
        d.title as document_title,
        1 - (c.embedding <=> $1::vector) as similarity_score
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
      ORDER BY c.embedding <=> $1::vector ASC
      LIMIT $2;
      `,
      [embeddingSqlString, topK],
    );

    const relevantChunks = searchResult.rows;
    console.log(`🎯 En alakalı ${relevantChunks.length} adet parça getirildi:`);

    relevantChunks.forEach((chunk, index) => {
      console.log(
        `   [${index + 1}] Doküman: "${chunk.document_title}" | Skor: ${(
          chunk.similarity_score * 100
        ).toFixed(2)}% | Kesit: "${chunk.content.slice(0, 60)}..."`,
      );
    });

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer:
          "Veritabanında sorgunuzla eşleşen herhangi bir doküman bulunamadı.",
        sources: [],
      });
    }

    // 3. Bağlamı (Context) Birleştirme
    const contextText = relevantChunks
      .map((c, i) => `[Kaynak ${i + 1} - ${c.document_title}]:\n${c.content}`)
      .join("\n\n---\n\n");

    // 4. Prompt Mühendisliği (System Prompt)
    /**
     * [ÖĞRENME NOTU: Prompt Injection ve Hallucination Engelleme]
     * Modele çok katı talimatlar vererek sadece sağlanan doküman bağlamında kalmasını emrediyoruz.
     * Eğer cevap metinde yoksa bunu açıkça itiraf etmesini istiyoruz.
     */
    const prompt = `
You are a precise knowledge assistant answering questions using only the provided context.

Context:
${contextText}

Instructions:
1. Answer the user's question relying strictly on the clear facts directly mentioned in the context above. Do not assume or extrapolate.
2. If the context does not contain enough information to answer the question, state: "Verilen dokümanlarda bu sorunun cevabı yer almamaktadır." (or the equivalent in the user's question language).
3. Cite the source reference where appropriate (e.g., "[Kaynak 1]").
4. Always respond in the language of the question.

Question:
${question}

Answer:
`;

    // 5. LLM'den Cevap Üretme (Gemini 1.5 Flash)
    console.log("⚡ Gemini 1.5 Flash modeli ile yanıt üretiliyor...");
    const modelResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const answer = modelResponse.text || "Yanıt üretilemedi.";
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [RAG CHAT TAMAMLANDI] Toplam Süre: ${totalDuration}s\n`);

    return NextResponse.json({
      answer,
      sources: relevantChunks.map((c) => ({
        id: c.id,
        documentTitle: c.document_title,
        chunkIndex: c.chunk_index,
        similarityScore: Number(c.similarity_score).toFixed(4),
        snippet: c.content.slice(0, 150) + "...",
      })),
    });
  } catch (error: any) {
    console.error("❌ Chat API hatası:", error);
    return NextResponse.json(
      { error: error.message || "İşlem başarısız" },
      { status: 500 },
    );
  }
}
