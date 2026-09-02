"use client";

import { useEffect, useRef, useState } from "react";

import ChatMessage, { MessageProps } from "./ChatMessage";

interface ChatAreaProps {
  selectedDocId: string;
  selectedDocTitle: string;
  messages: MessageProps[];
  setMessages: (messages: MessageProps[]) => void;
}

export default function ChatArea({
  selectedDocId,
  selectedDocTitle,
  messages,
  setMessages,
}: ChatAreaProps) {
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnswering]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedDocId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() || isAnswering) return;

    const userQuery = inputQuestion.trim();
    setInputQuestion("");

    const newMessages: MessageProps[] = [
      ...messages,
      { role: "user", content: userQuery },
    ];
    setMessages(newMessages);
    setIsAnswering(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userQuery,
          documentId: selectedDocId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Hata: ${err.message}`,
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <section className="w-2/3 flex flex-col h-full bg-neutral-950">
      {/* Üst Bar: Aktif Doküman Kapsamı */}
      <div className="px-6 py-3 border-b border-neutral-800/80 bg-neutral-900/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-neutral-300">
            Aktif İndeks:{" "}
            <strong className="text-emerald-400 font-mono">
              {selectedDocTitle}
            </strong>
          </span>
        </div>
        <span className="text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-medium">
          {selectedDocId === "all"
            ? "Tüm Belgeler Kapsamında"
            : "Belgeye Özel Oturum"}
        </span>
      </div>

      {/* Mesaj Akışı */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 space-y-3">
            <div className="w-12 h-12 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center text-xl">
              💡
            </div>
            <p className="text-sm font-medium text-neutral-300">
              {selectedDocTitle}
            </p>
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              {selectedDocId === "all"
                ? "Havuzdaki tüm dokümanlar üzerinden arama yapabilirsiniz."
                : `"${selectedDocTitle}" dokümanına özel sorularınızı aşağıdan yöneltebilirsiniz.`}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              role={msg.role}
              content={msg.content}
              sources={msg.sources}
            />
          ))
        )}

        {isAnswering && (
          <div className="flex items-center space-x-2">
            <div className="bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-2xl rounded-bl-none text-xs text-emerald-400 flex items-center gap-2">
              <span className="animate-spin text-sm">⚙️</span>
              <span>Semantik arama yapılıyor ve yanıt derleniyor...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mesaj Giriş Alanı */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/40">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder={
              selectedDocId === "all"
                ? "Tüm doküman havuzu hakkında bir soru sorun..."
                : `"${selectedDocTitle}" hakkında bir soru sorun...`
            }
            disabled={isAnswering}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-normal"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || isAnswering}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-all shadow-sm"
          >
            Gönder
          </button>
        </form>
      </div>
    </section>
  );
}
