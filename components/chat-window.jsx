"use client";

import { useState } from "react";

export default function ChatWindow({ documents = [] }) {
  const [selectedIds, setSelectedIds] = useState(
    documents.length > 0 ? [documents[0].id] : []
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  function toggleDocument(documentId) {
    setSelectedIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    );
  }

  async function handleSend(e) {
    e.preventDefault();

    if (!input.trim() || selectedIds.length === 0 || loading) {
      return;
    }

    const question = input.trim();

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: question,
      },
      {
        role: "assistant",
        content: "",
      },
    ]);

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          documentIds: selectedIds,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error("The server did not return a response body.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        const parts = buffer.split("\n\n");

        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) {
            continue;
          }

          try {
            const payload = JSON.parse(part.slice(6));

            const { event, data } = payload;

            if (event === "token") {
              setMessages((prev) => {
                const updated = [...prev];

                const last = updated[updated.length - 1];

                if (!last || last.role !== "assistant") {
                  return prev;
                }

                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + (data?.delta || ""),
                };

                return updated;
              });
            }

            if (event === "done") {
              setMessages((prev) => {
                const updated = [...prev];

                const last = updated[updated.length - 1];

                if (!last || last.role !== "assistant") {
                  return prev;
                }

                updated[updated.length - 1] = {
                  ...last,
                  content: data?.answer || last.content,
                  steps: data?.steps,
                  sources: data?.sources || [],
                };

                return updated;
              });
            }

            if (event === "error") {
              setMessages((prev) => {
                const updated = [...prev];

                const last = updated[updated.length - 1];

                if (!last || last.role !== "assistant") {
                  return prev;
                }

                updated[updated.length - 1] = {
                  ...last,
                  content:
                    "Something went wrong: " +
                    (data?.message || "Unknown error"),
                };

                return updated;
              });
            }
          } catch (error) {
            console.error("Failed to parse streaming event:", error);
          }
        }
      }
    } catch (error) {
      console.error("Chat request failed:", error);

      setMessages((prev) => {
        const updated = [...prev];

        const last = updated[updated.length - 1];

        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content:
              "Something went wrong while contacting the document assistant.",
          };
        }

        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Document selector */}
      <div className="border border-[#A98F5A]/30 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-lg">
            Select documents
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Choose the documents you want the AI to search.
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="text-sm text-gray-500">
            No documents have been uploaded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => {
              const selected = selectedIds.includes(document.id);

              return (
                <label
                  key={document.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    selected
                      ? "border-[#C1442D] bg-[#C1442D]/5"
                      : "border-gray-200 hover:border-[#A98F5A]/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleDocument(document.id)}
                    className="mt-1"
                  />

                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {document.title}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {document.fileName}
                      {document.chunkCount
                        ? ` · ${document.chunkCount} chunks`
                        : ""}
                    </p>

                    {document.summary && (
                      <p className="text-xs text-gray-500 mt-2">
                        {document.summary}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="border border-[#A98F5A]/30 rounded-xl overflow-hidden">
        <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-5 space-y-5">
          {messages.length === 0 ? (
            <div className="flex min-h-[350px] items-center justify-center text-center">
              <div className="max-w-md">
                <h2 className="text-xl font-semibold">
                  Ask your documents
                </h2>

                <p className="text-sm text-gray-500 mt-2">
                  Select one or more documents above and ask a question.
                  The AI will search their contents and ground its answer
                  in the retrieved passages.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-[#C1442D] text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-6">
                    {message.content ||
                      (loading && index === messages.length - 1
                        ? "Thinking..."
                        : "")}
                  </p>

                  {/* Agentic search information */}
                  {message.role === "assistant" &&
                    message.steps != null && (
                      <p className="text-xs opacity-60 mt-3">
                        Agent searches: {message.steps}
                      </p>
                    )}

                  {/* Sources */}
                  {message.role === "assistant" &&
                    message.sources?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-300/50">
                        <p className="text-xs font-semibold mb-2">
                          Sources
                        </p>

                        <div className="space-y-2">
                          {message.sources.map((source, sourceIndex) => (
                            <div
                              key={source.id || sourceIndex}
                              className="text-xs opacity-80"
                            >
                              [{sourceIndex + 1}]{" "}
                              {source.title || source.source || "Document"}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="border-t border-gray-200 p-4"
        >
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || selectedIds.length === 0}
              placeholder={
                selectedIds.length === 0
                  ? "Select a document first..."
                  : "Ask a question about your documents..."
              }
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#C1442D] disabled:bg-gray-100"
            />

            <button
              type="submit"
              disabled={
                loading ||
                !input.trim() ||
                selectedIds.length === 0
              }
              className="rounded-lg bg-[#C1442D] px-5 py-3 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Thinking..." : "Ask"}
            </button>
          </div>

          {selectedIds.length === 0 && documents.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Select at least one document before asking a question.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}