"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type ChatItem = { role: "user" | "assistant"; content: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
};

const starterPills = [
  "I applied for my degree transcript and yet have not received it",
  "When will my transcript or English proficiency be ready?",
  "How much does transcript delivery via DHL cost?",
  "How can I track my submitted request?",
];

export default function ChatSupportModal({ isOpen, onClose, initialQuestion = "" }: Props) {
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: "assistant",
      content:
        "Hello! 👋 Welcome to TranscriptPoint Live Support.\n\n" +
        "How can we assist you with your degree transcript, English proficiency, or delivery status today?",
    },
  ]);
  const [message, setMessage] = useState(initialQuestion);
  const [conversationId, setConversationId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialQuestion && isOpen) {
      setMessage(initialQuestion);
    }
  }, [initialQuestion, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  if (!isOpen) return null;

  const sendMessage = async (event?: FormEvent, customMessage?: string) => {
    event?.preventDefault();
    const content = (customMessage ?? message).trim();
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
      const result = (await response.json()) as { conversationId?: string; answer?: string; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || "Unable to reach support right now");

      setConversationId(result.conversationId || conversationId);
      setMessages((current) => [...current, { role: "assistant", content: result.answer! }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reach support");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
    >
      <div
        className="relative flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] sm:rounded-[30px] border border-white/70 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-slate-100 bg-[#173d35] px-5 py-4 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-.75-.805 4.887 4.887 0 0 0 .762-2.31C3.87 16.402 3 14.316 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="support-modal-title" className="text-base font-bold text-white sm:text-lg">
                  TranscriptPoint Support
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Live database responses • Standard processing SLA: 2 weeks+
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close support chat modal"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </header>

        {/* Quick Suggestion Pills */}
        <div className="border-b border-slate-100 bg-[#f8faf8] px-4 py-2.5 sm:px-6">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Common Inquiries (Click to Ask)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs scrollbar-thin">
            {starterPills.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => {
                  void sendMessage(undefined, pill);
                }}
                className="shrink-0 rounded-full border border-[#dce5d7] bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm transition hover:border-[#173d35] hover:bg-[#edf2e8] hover:text-[#173d35]"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 space-y-3.5 overflow-y-auto bg-[#f8f9fa] p-4 sm:p-6">
          {messages.map((item, idx) => (
            <div
              key={`${item.role}-${idx}`}
              className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm whitespace-pre-line ${
                  item.role === "user"
                    ? "bg-[#173d35] text-white rounded-br-none"
                    : "border border-slate-200/80 bg-white text-slate-800 rounded-bl-none"
                }`}
              >
                {item.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500 shadow-sm">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                </span>
                <span>Checking verified records &amp; replying...</span>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => void sendMessage(e)} className="border-t border-slate-100 bg-white p-3 sm:p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Chat with support..."
              maxLength={2000}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#173d35] focus:bg-white focus:ring-2 focus:ring-[#173d35]/20"
              required
            />
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-[#173d35] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#173d35]/20 transition hover:bg-[#245246] disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-400">
            Official transcript processing SLA: two weeks+ (14 to 21 working days).
          </p>
        </form>
      </div>
    </div>
  );
}
