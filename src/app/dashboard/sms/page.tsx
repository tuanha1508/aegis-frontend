"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";

interface ParsedReport {
  id: number;
  raw_text: string;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  incident_type: string | null;
  people_mentioned: number;
  has_children: number;
  language: string;
  processed: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  report?: ParsedReport;
  error?: boolean;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SUGGESTED = [
  "Flooding on Bay to Bay Blvd, water entering homes",
  "Family trapped on second floor, Henderson Blvd, 2 adults 2 children",
  "Hillsborough High shelter needs more water and blankets",
  "Familia atrapada, necesitamos ayuda en Davis Islands",
];

const incidentColors: Record<string, string> = {
  flooding: "bg-blue-50 text-blue-700",
  trapped_person: "bg-red-50 text-red-700",
  supply_shortage: "bg-amber-50 text-amber-700",
  power_outage: "bg-violet-50 text-violet-700",
  road_blocked: "bg-orange-50 text-orange-700",
  damage: "bg-rose-50 text-rose-700",
};

export default function SMSPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(
    new Set()
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  };

  useEffect(scrollToBottom, [messages, loading]);

  const toggleReport = (id: string) => {
    setExpandedReports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch(`${BASE}/api/v1/sms/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();

      if (data.status === "error" || !res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            text: "Unable to process your report. Please try again.",
            error: true,
          },
        ]);
      } else {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: data.reply,
          report: data.report,
        };
        setMessages((prev) => [...prev, botMsg]);
        // Auto-expand the report card
        setExpandedReports((prev) => new Set(prev).add(botMsg.id));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: "Unable to process your report. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E5E4E2] flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
          <Icon icon={icons.chatText} className="h-4.5 w-4.5 text-[#F8F8F6]" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[#1A1A1A]">
            SMS Simulator
          </h1>
          <p className="text-[10px] text-[#6B6B6B]">
            Report emergencies via text — powered by AI
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Icon
              icon={icons.chatText}
              className="h-10 w-10 text-[#E5E4E2] mb-3"
            />
            <p className="text-sm text-[#6B6B6B] mb-1">
              Send a message to report an emergency
            </p>
            <p className="text-xs text-[#6B6B6B]/60">
              The AI agent will parse your report and extract key details
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              {/* Bubble */}
              <div
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#1A1A1A] text-[#F8F8F6] rounded-br-md"
                      : msg.error
                        ? "bg-red-50 text-red-800 border border-red-200 rounded-bl-md"
                        : "bg-white border border-[#E5E4E2] text-[#1A1A1A] rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>

              {/* Report card */}
              {msg.report && (
                <div className="flex justify-start mt-1.5">
                  <div className="max-w-[85%]">
                    <button
                      onClick={() => toggleReport(msg.id)}
                      className="text-[10px] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors flex items-center gap-1 mb-1"
                    >
                      <Icon
                        icon={icons.chevronRight}
                        className={`h-2.5 w-2.5 transition-transform ${expandedReports.has(msg.id) ? "rotate-90" : ""}`}
                      />
                      Parsed Report #{msg.report.id}
                    </button>

                    {expandedReports.has(msg.id) && (
                      <div className="bg-[#FAFAF9] border border-[#E5E4E2] rounded-xl p-3.5 space-y-2.5">
                        {msg.report.location_text && (
                          <div className="flex items-center gap-2">
                            <Icon
                              icon={icons.mapPin}
                              className="h-3.5 w-3.5 text-[#6B6B6B] shrink-0"
                            />
                            <span className="text-xs text-[#1A1A1A]">
                              {msg.report.location_text}
                            </span>
                            {msg.report.lat && msg.report.lng && (
                              <span className="text-[10px] text-[#6B6B6B]/50">
                                {msg.report.lat.toFixed(3)},{" "}
                                {msg.report.lng.toFixed(3)}
                              </span>
                            )}
                          </div>
                        )}

                        {msg.report.incident_type && (
                          <div className="flex items-center gap-2">
                            <Icon
                              icon={icons.alert}
                              className="h-3.5 w-3.5 text-[#6B6B6B] shrink-0"
                            />
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-2 py-0.5 ${incidentColors[msg.report.incident_type] ?? "bg-[#F0EFED] text-[#6B6B6B]"}`}
                            >
                              {msg.report.incident_type.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          {msg.report.people_mentioned > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Icon
                                icon={icons.users}
                                className="h-3.5 w-3.5 text-[#6B6B6B]"
                              />
                              <span className="text-xs text-[#1A1A1A]">
                                {msg.report.people_mentioned} people
                              </span>
                            </div>
                          )}
                          {msg.report.has_children === 1 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700"
                            >
                              Children involved
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Icon
                            icon="ph:translate-bold"
                            className="h-3.5 w-3.5 text-[#6B6B6B] shrink-0"
                          />
                          <span className="text-xs text-[#6B6B6B]">
                            {msg.report.language === "es"
                              ? "Spanish"
                              : msg.report.language === "en"
                                ? "English"
                                : msg.report.language}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E5E4E2] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#6B6B6B]/40 animate-bounce [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#6B6B6B]/40 animate-bounce [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#6B6B6B]/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested messages */}
      {messages.length === 0 && (
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {SUGGESTED.map((text) => (
            <button
              key={text}
              onClick={() => sendMessage(text)}
              className="text-xs bg-white border border-[#E5E4E2] rounded-full px-3 py-1.5 text-[#6B6B6B] hover:text-[#1A1A1A] hover:border-[#D5D4D2] transition-colors text-left"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t border-[#E5E4E2] flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the emergency..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-white border border-[#E5E4E2] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 outline-none focus:border-[#1A1A1A]/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="h-10 w-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center hover:bg-[#2A2A2A] transition-colors disabled:opacity-30 shrink-0"
        >
          <Icon icon={icons.send} className="h-4 w-4 text-[#F8F8F6]" />
        </button>
      </form>
    </div>
  );
}
