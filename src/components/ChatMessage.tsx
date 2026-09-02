"use client";

import { useState } from "react";

export interface Source {
  id: string;
  sourceIndex: number;
  documentTitle: string;
  chunkIndex: number;
  similarityScore: string;
  snippet: string;
}

export interface MessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function ChatMessage({ role, content, sources }: MessageProps) {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const isUser = role === "user";

  // [Kaynak X] veya [X] kalıplarını interaktif butonlara dönüştüren parser
  const renderFormattedContent = (text: string) => {
    if (isUser || !sources || sources.length === 0) {
      return text;
    }

    // [Kaynak X] veya [X] eşleşmelerini yakala
    const parts = text.split(
      /(\[(?:Kaynak\s*)?\d+(?:,\s*(?:Kaynak\s*)?\d+)*\])/g,
    );

    return parts.map((part, pIdx) => {
      const match = part.match(/\[(.*?)\]/);
      if (!match) return part;

      // İçindeki numaraları çek (örn: "Kaynak 1, 2" -> [1, 2])
      const numbers = match[1].match(/\d+/g);
      if (!numbers) return part;

      return (
        <span key={pIdx} className="inline-flex gap-1 mx-1 align-baseline">
          {numbers.map((numStr) => {
            const num = parseInt(numStr, 10);
            const sourceItem = sources.find((s) => s.sourceIndex === num);

            return (
              <button
                key={num}
                type="button"
                onClick={() => sourceItem && setSelectedSource(sourceItem)}
                className="inline-flex items-center px-1.5 py-0.2 text-[11px] font-semibold font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded hover:bg-emerald-800 hover:text-white transition-all shadow-xs"
                title={
                  sourceItem
                    ? `${sourceItem.documentTitle} - %${(Number(sourceItem.similarityScore) * 100).toFixed(0)} Eşleşme`
                    : undefined
                }
              >
                [{num}]
              </button>
            );
          })}
        </span>
      );
    });
  };

  return (
    <div
      className={`flex flex-col w-full ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-3xl px-5 py-4 rounded-2xl leading-relaxed shadow-sm transition-all ${
          isUser
            ? "bg-emerald-600 text-white rounded-br-sm text-sm font-medium"
            : "bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-sm text-sm"
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed text-neutral-100">
          {renderFormattedContent(content)}
        </div>

        {/* Alt Kaynak Butonları (Hızlı Erişim) */}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-neutral-800/70 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-neutral-400 font-medium">
              Referanslar:
            </span>
            {sources.map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setSelectedSource(src)}
                className="text-[11px] bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 px-2.5 py-1 rounded-md text-neutral-300 transition-colors flex items-center gap-1.5"
              >
                <span className="text-emerald-400 font-bold">
                  [{src.sourceIndex}]
                </span>
                <span className="truncate max-w-[140px]">
                  {src.documentTitle}
                </span>
                <span className="text-neutral-500 font-mono text-[10px]">
                  %{(Number(src.similarityScore) * 100).toFixed(0)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kaynak Detay Modal / Drawer */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                  Kaynak Detayı [{selectedSource.sourceIndex}]
                </span>
                <h3 className="text-sm font-semibold text-white mt-1.5">
                  {selectedSource.documentTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSource(null)}
                className="text-neutral-400 hover:text-white p-1 text-sm rounded-lg hover:bg-neutral-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Vektör Benzerlik Skoru:</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  %{(Number(selectedSource.similarityScore) * 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Parça İndeksi (Chunk):</span>
                <span className="text-neutral-200 font-mono">
                  #{selectedSource.chunkIndex + 1}
                </span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl text-xs text-neutral-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
              "{selectedSource.snippet}"
            </div>

            <button
              type="button"
              onClick={() => setSelectedSource(null)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white rounded-lg transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
