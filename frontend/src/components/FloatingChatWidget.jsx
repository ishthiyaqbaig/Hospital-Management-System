import { useEffect, useRef, useState } from "react";

import { sendChatMessage } from "../api/chat";

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!typing) {
      return undefined;
    }
    if (typing.index >= typing.text.length) {
      setTyping(null);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const nextIndex = typing.index + 1;
      setMessages((current) =>
        current.map((message) =>
          message.id === typing.id
            ? { ...message, text: typing.text.slice(0, nextIndex) }
            : message
        )
      );
      setTyping({ ...typing, index: nextIndex });
    }, 14);
    return () => window.clearTimeout(timer);
  }, [typing]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage = { id: crypto.randomUUID(), role: "patient", text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await sendChatMessage(trimmed);
      const assistantId = response.id;
      setMessages((current) => [
        ...current,
        { id: assistantId, role: "assistant", text: "" },
      ]);
      setTyping({ id: assistantId, text: response.answer, index: 0 });
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "I could not answer right now. Please contact the hospital desk or consult your doctor.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {isOpen ? (
        <section className="mb-3 flex h-[480px] w-[min(360px,calc(100vw-40px))] flex-col rounded border border-cyan-100 bg-white shadow-soft">
          <header className="flex items-center justify-between border-b border-cyan-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-medical-navy">Patient chat</p>
              <p className="text-xs text-slate-500">Hospital questions only</p>
            </div>
            <button
              className="rounded px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-cyan-50"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Close
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-medical-ice p-4">
            {!messages.length ? (
              <p className="rounded border border-cyan-100 bg-white p-3 text-sm text-slate-600">
                Ask about appointments, prescriptions, billing, or hospital services.
              </p>
            ) : null}
            {messages.map((message) => (
              <div
                className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                  message.role === "patient"
                    ? "ml-auto bg-medical-teal text-white"
                    : "bg-white text-slate-700"
                }`}
                key={message.id}
              >
                {message.text}
              </div>
            ))}
            {isSending ? (
              <p className="rounded bg-white px-3 py-2 text-sm text-slate-500">
                Thinking
              </p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form className="flex gap-2 border-t border-cyan-100 p-3" onSubmit={handleSubmit}>
            <input
              className="min-w-0 flex-1 rounded border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message"
              value={input}
            />
            <button
              className="rounded bg-medical-teal px-4 py-2 text-sm font-semibold text-white hover:bg-medical-blue disabled:opacity-60"
              disabled={isSending}
              type="submit"
            >
              Send
            </button>
          </form>
        </section>
      ) : null}

      <button
        className="rounded-full bg-medical-teal px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-medical-blue"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        Chat
      </button>
    </div>
  );
}
