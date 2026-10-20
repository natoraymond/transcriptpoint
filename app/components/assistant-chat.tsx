"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ChatItem = { role: "user" | "assistant"; content: string };

const starterQuestions = [
  "Which transcript service should I choose?",
  "How does DHL delivery work?",
  "What do I need before submitting a request?",
];

export default function AssistantChat() {
  const [messages, setMessages] = useState<ChatItem[]>([
    { role: "assistant", content: "Hello, I am the TranscriptPoint AI Assistant. Ask me about transcript services, DHL delivery, or the request process." },
  ]);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = message.trim();
    if (!content || isSending) return;
    setMessage("");
    setError("");
    setMessages((current) => [...current, { role: "user", content }]);
    setIsSending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId || undefined, message: content }),
      });
      const result = await response.json() as { conversationId?: string; answer?: string; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || "Unable to reach the assistant");
      setConversationId(result.conversationId || conversationId);
      setMessages((current) => [...current, { role: "assistant", content: result.answer! }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reach the assistant");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#e8eceb] px-4 py-6 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-8">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">TranscriptPoint</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">AI Assistant</h1></div>
          <Link href="/dashboard" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">My dashboard</Link>
        </header>
        <section className="flex flex-1 flex-col px-4 py-5 sm:px-8">
          <div className="mb-5 grid gap-2 sm:grid-cols-3">{starterQuestions.map((question) => <button key={question} type="button" onClick={() => setMessage(question)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs text-slate-600 transition hover:border-[#173c5c] hover:text-slate-950">{question}</button>)}</div>
          <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-[#f7f9f8] p-4 sm:p-6">{messages.map((item, index) => <div key={`${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-[#173c5c] text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{item.content}</div></div>)}{isSending && <p className="text-sm text-slate-500">TranscriptPoint AI is thinking...</p>}</div>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <form onSubmit={sendMessage} className="mt-4 flex gap-3"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about transcripts or delivery..." className="form-input" maxLength={2000} required /><button type="submit" disabled={isSending} className="rounded-xl bg-[#173c5c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12314a] disabled:opacity-50">Send</button></form>
        </section>
      </div>
    </main>
  );
}
