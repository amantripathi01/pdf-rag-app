import React, { useState } from "react";
import { chatQuery } from "../api";

export default function ChatBot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setMessages(msgs => [...msgs, { sender: "user", text: input }]);
    try {
      const res = await chatQuery(input, 1);
      setMessages(msgs => [...msgs, { sender: "bot", text: res.answer }]);
    } catch (err) {
      setMessages(msgs => [...msgs, { sender: "bot", text: "Error: Could not get response." }]);
    }
    setInput("");
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: 500,
      margin: "32px auto",
      padding: 24,
      background: "#f4f6fb",
      borderRadius: 18,
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      border: "1px solid #e3e6ee",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <h2 style={{ color: '#1976d2', marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>PDF Chatbot</h2>
      <div style={{
        minHeight: 220,
        maxHeight: 320,
        overflowY: "auto",
        background: "#fff",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: "1px solid #e3e6ee",
      }}>
        {messages.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
            Start chatting about your PDFs!
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            margin: "10px 0"
          }}>
            <span style={{
              background: msg.sender === "user" ? "linear-gradient(90deg,#1976d2,#64b5f6)" : "#e3fcef",
              color: msg.sender === "user" ? "#fff" : "#388e3c",
              padding: "10px 18px",
              borderRadius: 18,
              fontWeight: 500,
              maxWidth: "70%",
              boxShadow: msg.sender === "user" ? "0 2px 8px rgba(25,118,210,0.10)" : "0 2px 8px rgba(56,142,60,0.10)",
              wordBreak: "break-word",
              fontSize: 16,
            }}>
              {msg.text}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about your PDFs..."
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #bdbdbd",
            fontSize: 16,
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? '#bdbdbd' : 'linear-gradient(90deg,#1976d2,#64b5f6)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: 16,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            transition: 'background 0.2s',
          }}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}
