import { splitTextIntoChunks } from "@/lib/chunker";
import { query } from "@/lib/db";
import { generateEmbedding } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

// PDF dosyasından metin çıkaran yardımcı Promise fonksiyonu
function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", () => {
      // pdf2json ham metni encode edilmiş URL formatında döner, decodeURIComponent ile çözeriz
      const rawText = (pdfParser as any).getRawTextContent();
      resolve(decodeURIComponent(rawText));
    });

    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log("\n--- [RAG INGESTION BAŞLADI] ---");
    const startTime = Date.now();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.warn("⚠️ Uyarı: İstekte dosya bulunamadı.");
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    console.log(
      `📁 Alınan Dosya: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
    );

    let extractedText = "";
    const fileType = file.name.split(".").pop()?.toLowerCase() || "txt";

    // 1. Dosya Türüne Göre Metin Ayrıştırma (Parsing)
    if (fileType === "pdf") {
      console.log("⏳ PDF ayrıştırılıyor (pdf2json)...");
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      extractedText = await extractTextFromPDF(buffer);
      console.log("📄 PDF başarıyla çözümlendi.");
    } else {
      console.log("📝 Düz metin dosyası okunuyor...");
      extractedText = await file.text();
    }

    if (!extractedText.trim()) {
      console.warn("⚠️ Uyarı: Dosyadan metin çıkarılamadı veya dosya boş.");
      return NextResponse.json(
        { error: "Dosya içeriği boş veya okunamadı" },
        { status: 400 },
      );
    }

    console.log(`📊 Toplam çıkarılan karakter sayısı: ${extractedText.length}`);

    // 2. Ana doküman kaydını oluştur
    const docResult = await query(
      `INSERT INTO documents (title, file_type) VALUES ($1, $2) RETURNING id`,
      [file.name, fileType],
    );
    const documentId = docResult.rows[0].id;
    console.log(`💾 Doküman 'documents' tablosuna yazıldı. ID: ${documentId}`);

    // 3. Metni Akıllı Parçalara (Chunk) Ayırma
    console.log("✂️ Metin parçalama (chunking) algoritmasına sokuluyor...");
    const chunks = splitTextIntoChunks(extractedText);
    console.log(
      `✅ Chunking tamamlandı: Toplam ${chunks.length} parça üretildi.`,
    );

    // 4. Vektörleştirme (Embedding) ve pgvector'e kaydetme
    console.log(
      "🧠 Vektörleştirme (Embedding) ve pgvector kayıt işlemi başlıyor...",
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      const chunkStartTime = Date.now();

      const embedding = await generateEmbedding(chunkContent);
      const embeddingSqlString = `[${embedding.join(",")}]`;

      await query(
        `INSERT INTO document_chunks (document_id, content, chunk_index, embedding)
         VALUES ($1, $2, $3, $4)`,
        [documentId, chunkContent, i, embeddingSqlString],
      );

      console.log(
        `➡️ Chunk ${i + 1}/${chunks.length} kaydedildi (${Date.now() - chunkStartTime}ms)`,
      );
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `🎉 [RAG INGESTION TAMAMLANDI] Toplam Süre: ${totalDuration}s\n`,
    );

    return NextResponse.json({
      success: true,
      message: "Doküman başarıyla işlendi ve vektörleştirildi.",
      documentId,
      totalChunks: chunks.length,
    });
  } catch (error: any) {
    console.error("❌ Ingest işleminde hata:", error);
    return NextResponse.json(
      { error: error.message || "İşlem başarısız" },
      { status: 500 },
    );
  }
}
