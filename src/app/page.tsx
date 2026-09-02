"use client";

import { useState } from "react";

import ChatArea from "@/components/ChatArea";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <main className="flex h-screen bg-neutral-950 text-neutral-100 antialiased overflow-hidden">
      <Sidebar
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        onIngestSuccess={(msg) => console.log(msg)}
      />
      <ChatArea />
    </main>
  );
}
