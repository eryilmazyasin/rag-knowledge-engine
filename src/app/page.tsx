"use client";

import { useState } from "react";

import ChatArea from "@/components/ChatArea";
import { MessageProps } from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>("all");
  const [selectedDocTitle, setSelectedDocTitle] =
    useState<string>("All Documents");

  // Independent chat session cache per document scope
  const [chatSessions, setChatSessions] = useState<
    Record<string, MessageProps[]>
  >({});

  const handleSelectDocument = (id: string, title: string) => {
    setSelectedDocId(id);
    setSelectedDocTitle(title);
  };

  const handleUpdateMessages = (docId: string, messages: MessageProps[]) => {
    setChatSessions((prev) => ({
      ...prev,
      [docId]: messages,
    }));
  };

  return (
    <main className="flex h-screen bg-neutral-950 text-neutral-100 antialiased overflow-hidden">
      <Sidebar
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        selectedDocId={selectedDocId}
        onSelectDocument={handleSelectDocument}
      />
      <ChatArea
        selectedDocId={selectedDocId}
        selectedDocTitle={selectedDocTitle}
        messages={chatSessions[selectedDocId] || []}
        setMessages={(msgs) => handleUpdateMessages(selectedDocId, msgs)}
      />
    </main>
  );
}
