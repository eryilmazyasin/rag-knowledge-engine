import { query } from "@/lib/db";
import { ai, generateEmbedding } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now();
    const { question, documentId } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir soru girilmelidir." },
        { status: 400 },
      );
    }

    console.log(
      `\n❓ Soru: "${question}" | Filtre: ${documentId ? `Doc ID: ${documentId}` : "Tüm Belgeler"}`,
    );

    // 1. Embedding
    const questionEmbedding = await generateEmbedding(question);
    const embeddingSqlString = `[${questionEmbedding.join(",")}]`;

    // 2. pgvector Arama (documentId filtresi opsiyonel olarak eklendi)
    const topK = 4;
    let sql = `
      SELECT 
        c.id,
        c.content,
        c.chunk_index,
        d.title as document_title,
        1 - (c.embedding <=> $1::vector) as similarity_score
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
    `;
    const params: any[] = [embeddingSqlString];

    if (documentId && documentId !== "all") {
      sql += ` WHERE c.document_id = $2 ORDER BY c.embedding <=> $1::vector ASC LIMIT $3;`;
      params.push(documentId, topK);
    } else {
      sql += ` ORDER BY c.embedding <=> $1::vector ASC LIMIT $2;`;
      params.push(topK);
    }

    const searchResult = await query(sql, params);
    const relevantChunks = searchResult.rows;

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer:
          "Seçili dokümanda veya veritabanında sorgunuzla eşleşen bilgi bulunamadı.",
        sources: [],
      });
    }

    // 3. Context Hazırlığı
    const contextText = relevantChunks
      .map((c, i) => `[Kaynak ${i + 1} - ${c.document_title}]:\n${c.content}`)
      .join("\n\n---\n\n");

    // 4. Prompt
    const prompt = `
You are a precise knowledge assistant answering questions strictly using only the provided context.

Context:
${contextText}

Instructions:
1. Answer the user's question relying strictly on the clear facts directly mentioned in the context above. Do not assume or extrapolate.
2. If the context does not contain enough information to answer the question, state: "Verilen dokümanlarda bu sorunun cevabı yer almamaktadır."
3. Refer to sources naturally like "[1]", "[2]" etc. (e.g. "Şirket kurallarına göre... [1]").
4. Always respond in the language of the question.

Question:
${question}

Answer:
`;

    // 5. LLM Yanıtı (Gemini 3.6 Flash)
    const modelResponse = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const answer = modelResponse.text || "Yanıt üretilemedi.";
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [RAG CHAT TAMAMLANDI] Süre: ${totalDuration}s`);

    return NextResponse.json({
      answer,
      sources: relevantChunks.map((c, index) => ({
        id: c.id,
        sourceIndex: index + 1,
        documentTitle: c.document_title,
        chunkIndex: c.chunk_index,
        similarityScore: Number(c.similarity_score).toFixed(4),
        snippet: c.content,
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
