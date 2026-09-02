"use client";

import { useEffect, useState } from "react";

export interface DocumentItem {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
  chunk_count: number;
}

interface SidebarProps {
  onSelectDocument: (id: string, title: string) => void;
  selectedDocId: string;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export default function Sidebar({
  onSelectDocument,
  selectedDocId,
  isProcessing,
  setIsProcessing,
}: SidebarProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error("Dokümanlar alınamadı:", e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setStatus("Doküman parçalanıyor ve pgvector ile indeksleniyor...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus(`✅ ${file.name} başarıyla indekslendi.`);
      await fetchDocuments();
      onSelectDocument(data.documentId, file.name);
      setFile(null);
    } catch (err: any) {
      setStatus(`❌ Hata: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSampleDocument = async (fileName: string, title: string) => {
    setIsProcessing(true);
    setStatus(`Örnek "${title}" yükleniyor...`);

    try {
      const res = await fetch(`/samples/${fileName}`);
      const blob = await res.blob();
      const sampleFile = new File([blob], fileName, { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", sampleFile);

      const uploadRes = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });
      const data = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(data.error);

      setStatus(`✅ ${title} başarıyla indekslendi.`);
      await fetchDocuments();
      onSelectDocument(data.documentId, title);
    } catch (err: any) {
      setStatus(`❌ Hata: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "Bu dokümanı ve tüm vektör parçalarını silmek istediğinize emin misiniz?",
      )
    )
      return;

    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedDocId === id) {
          onSelectDocument("all", "Tüm Belgeler");
        }
        await fetchDocuments();
      }
    } catch (e) {
      console.error("Silinemedi:", e);
    }
  };

  return (
    <section className="w-1/3 border-r border-neutral-800 p-6 flex flex-col justify-between bg-neutral-900/50 h-full overflow-hidden">
      <div className="space-y-5 overflow-y-auto pr-1">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
            Full-Stack RAG Engine
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white mt-2.5">
            Knowledge Engine
          </h1>
          <p className="text-xs text-neutral-400 mt-1 leading-normal">
            pgvector ve Gemini 3.6 ile akıllı doküman sorgulama.
          </p>
        </div>

        {/* Dosya Yükleme */}
        <form
          onSubmit={handleUpload}
          className="space-y-3 pt-3 border-t border-neutral-800"
        >
          <label className="block text-xs font-medium text-neutral-300">
            Özel Belge Yükle (.pdf, .txt)
          </label>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer border border-neutral-700 rounded-lg p-1 bg-neutral-900"
          />
          <button
            type="submit"
            disabled={!file || isProcessing}
            className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-all shadow-sm"
          >
            {isProcessing ? "İşleniyor..." : "Belgeyi İndeksle"}
          </button>
        </form>

        {/* Doküman Havuzu Listesi */}
        <div className="pt-3 border-t border-neutral-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Aktif Doküman Havuzu ({documents.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {/* Tüm Belgeler */}
            <button
              type="button"
              onClick={() => onSelectDocument("all", "Tüm Belgeler")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border flex items-center justify-between ${
                selectedDocId === "all"
                  ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-300"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🌐</span>
                <span className="font-medium">Tüm Belgelerde Ara</span>
              </div>
              {selectedDocId === "all" && (
                <span className="text-emerald-400 text-[10px]">Aktif</span>
              )}
            </button>

            {/* Tekil Belgeler */}
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc.id, doc.title)}
                className={`w-full px-3 py-2 rounded-lg text-xs transition-all border flex items-center justify-between cursor-pointer group ${
                  selectedDocId === doc.id
                    ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-200"
                    : "bg-neutral-900/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                <div className="truncate max-w-[180px]">
                  <div className="font-medium truncate text-xs">
                    {doc.title}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {doc.chunk_count} parça (chunk)
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedDocId === doc.id && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      Seçili
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1 rounded transition-opacity"
                    title="Dokümanı Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Örnek Belgeler */}
        <div className="pt-3 border-t border-neutral-800 space-y-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
            Örnek Belgeler
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-medium text-neutral-200">
                🏢 Şirket Politikası
              </span>
              <div className="flex gap-1 mt-2">
                <a
                  href="/samples/company-policy.txt"
                  download="company-policy.txt"
                  className="flex-1 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-center text-[10px] text-neutral-300"
                >
                  İndir
                </a>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    loadSampleDocument(
                      "company-policy.txt",
                      "Şirket Politikası",
                    )
                  }
                  className="flex-1 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/80 rounded text-center text-[10px] text-emerald-300 disabled:opacity-50"
                >
                  Yükle ⚡
                </button>
              </div>
            </div>

            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col justify-between">
              <span className="text-[11px] font-medium text-neutral-200">
                ⚡ API Mimarisi
              </span>
              <div className="flex gap-1 mt-2">
                <a
                  href="/samples/api-spec.txt"
                  download="api-spec.txt"
                  className="flex-1 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-center text-[10px] text-neutral-300"
                >
                  İndir
                </a>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    loadSampleDocument("api-spec.txt", "API Mimarisi")
                  }
                  className="flex-1 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/80 rounded text-center text-[10px] text-emerald-300 disabled:opacity-50"
                >
                  Yükle ⚡
                </button>
              </div>
            </div>
          </div>
        </div>

        {status && (
          <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs leading-relaxed text-neutral-300">
            {status}
          </div>
        )}
      </div>

      {/* Stack Footer */}
      <div className="border-t border-neutral-800 pt-3 space-y-1 text-[11px] text-neutral-500">
        <div className="flex justify-between">
          <span>Vector Store:</span>
          <span className="text-neutral-300 font-mono">pgvector (768-d)</span>
        </div>
        <div className="flex justify-between">
          <span>Embedding:</span>
          <span className="text-neutral-300 font-mono">gemini-embedding-2</span>
        </div>
        <div className="flex justify-between">
          <span>LLM:</span>
          <span className="text-neutral-300 font-mono">gemini-3.6-flash</span>
        </div>
      </div>
    </section>
  );
}
