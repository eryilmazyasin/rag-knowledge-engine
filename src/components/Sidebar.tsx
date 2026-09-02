"use client";

import { useState } from "react";

interface SidebarProps {
  onIngestSuccess: (message: string) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export default function Sidebar({
  onIngestSuccess,
  isProcessing,
  setIsProcessing,
}: SidebarProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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

      const msg = `✅ ${file.name} başarıyla indekslendi (${data.totalChunks} parça).`;
      setStatus(msg);
      onIngestSuccess(msg);
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

      const msg = `✅ ${title} indekslendi (${data.totalChunks} parça).`;
      setStatus(msg);
      onIngestSuccess(msg);
    } catch (err: any) {
      setStatus(`❌ Hata: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="w-1/3 border-r border-neutral-800 p-6 flex flex-col justify-between bg-neutral-900/50">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
            Full-Stack RAG Engine
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white mt-3">
            Knowledge Engine
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Belgeleri semantik olarak vektörleştirin ve pgvector üzerinden
            doğrudan sorgulayın.
          </p>
        </div>

        {/* Dosya Yükleme Formu */}
        <form
          onSubmit={handleUpload}
          className="space-y-4 pt-4 border-t border-neutral-800"
        >
          <label className="block text-xs font-medium text-neutral-300">
            Özel Belge Yükle (.pdf, .txt)
          </label>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer border border-neutral-700 rounded-lg p-1 bg-neutral-900"
          />
          <button
            type="submit"
            disabled={!file || isProcessing}
            className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-all shadow-sm"
          >
            {isProcessing ? "İşleniyor..." : "Belgeyi İndeksle"}
          </button>
        </form>

        {/* Hızlı Test Örnekleri */}
        <div className="pt-4 border-t border-neutral-800 space-y-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
            Test İçin Hazır Belgeler
          </span>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() =>
                loadSampleDocument("company-policy.txt", "Şirket Politikası")
              }
              className="text-left px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs transition-colors flex justify-between items-center group disabled:opacity-50"
            >
              <div>
                <div className="font-medium text-neutral-200">
                  🏢 Şirket Politikası
                </div>
                <div className="text-[10px] text-neutral-500">
                  İzinler, maaş ve çalışma saatleri
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 group-hover:underline">
                Tek Tıkla Yükle →
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => loadSampleDocument("api-spec.txt", "API Mimarisi")}
              className="text-left px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs transition-colors flex justify-between items-center group disabled:opacity-50"
            >
              <div>
                <div className="font-medium text-neutral-200">
                  ⚡ API & Cloud Mimarisi
                </div>
                <div className="text-[10px] text-neutral-500">
                  Rate limitler, auth kodları
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 group-hover:underline">
                Tek Tıkla Yükle →
              </span>
            </button>
          </div>
        </div>

        {status && (
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs leading-relaxed text-neutral-300">
            {status}
          </div>
        )}
      </div>

      {/* Stack Bilgisi */}
      <div className="border-t border-neutral-800 pt-4 space-y-2 text-[11px] text-neutral-500">
        <div className="flex justify-between">
          <span>Vector Store:</span>
          <span className="text-neutral-300 font-mono">
            PostgreSQL + pgvector
          </span>
        </div>
        <div className="flex justify-between">
          <span>Embedding:</span>
          <span className="text-neutral-300 font-mono">text-embedding-004</span>
        </div>
        <div className="flex justify-between">
          <span>LLM:</span>
          <span className="text-neutral-300 font-mono">Gemini 1.5 Flash</span>
        </div>
      </div>
    </section>
  );
}
