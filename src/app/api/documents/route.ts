import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Yüklü tüm belgeleri ve içerdikleri chunk sayılarını listele
export async function GET() {
  try {
    const res = await query(`
      SELECT 
        d.id, 
        d.title, 
        d.file_type, 
        d.created_at,
        COUNT(c.id)::int as chunk_count
      FROM documents d
      LEFT JOIN document_chunks c ON d.id = c.document_id
      GROUP BY d.id
      ORDER BY d.created_at DESC;
    `);

    return NextResponse.json({ documents: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Belgeyi ve ilişkili chunk'larını cascade olarak sil
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Doküman ID gereklidir." },
        { status: 400 },
      );
    }

    await query(`DELETE FROM documents WHERE id = $1;`, [id]);
    return NextResponse.json({ success: true, message: "Doküman silindi." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
