"use client";

import { useEffect, useRef, useState } from "react";

import ChatMessage, { MessageProps } from "./ChatMessage";

export default function ChatArea() {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnswering]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() || isAnswering) return;

    const userQuery = inputQuestion.trim();
    setInputQuestion("");

    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsAnswering(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Hata oluştu: ${err.message}`,
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <section className="w-2/3 flex flex-col h-full bg-neutral-950">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 space-y-3">
            <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center text-lg">
              💡
            </div>
            <p className="text-sm">Doküman sorgulama için hazır.</p>
            <p className="text-xs text-neutral-600 max-w-sm">
              Sol panelden bir belge yükleyin veya örnek dokümanları kullanarak
              semantik sorular sorun.
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
          <div className="flex items-center space-y-2">
            <div className="bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-2xl rounded-bl-none text-xs text-neutral-400 animate-pulse">
              Semantik arama yapılıyor ve yanıt üretiliyor...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-neutral-800 bg-neutral-900/30">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Yüklenen belgeler hakkında soru sorun..."
            disabled={isAnswering}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || isAnswering}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium text-white transition-all shadow-sm"
          >
            Gönder
          </button>
        </form>
      </div>
    </section>
  );
}
