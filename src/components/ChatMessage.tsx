export interface Source {
  id: string;
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
  const isUser = role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-2xl px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
          isUser
            ? "bg-emerald-600 text-white rounded-br-none"
            : "bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>

        {/* Kaynakça Referans Kartı */}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
              Yararlanılan Parçalar (Top-{sources.length} Chunks)
            </span>
            <div className="grid grid-cols-1 gap-2">
              {sources.map((src, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950/60 border border-neutral-800 p-2.5 rounded-lg text-left"
                >
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span className="font-semibold text-emerald-400 truncate max-w-[200px]">
                      {src.documentTitle}
                    </span>
                    <span className="font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                      Benzerlik:{" "}
                      {(Number(src.similarityScore) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 italic line-clamp-2">
                    "{src.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
