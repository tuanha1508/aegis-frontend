"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#phases" },
  { label: "About", href: "#about" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F8F8F6]/80 backdrop-blur-md border-b border-[#ECECEA]/60">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-14">
        <a href="#" className="flex items-center gap-2">
          <Shield className="h-[18px] w-[18px] text-[#1A1A1A]" strokeWidth={1.8} />
          <span className="text-[15px] font-semibold tracking-tight text-[#1A1A1A]">
            Aegis
          </span>
        </a>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full px-5 h-8 bg-[#1A1A1A] text-[#F8F8F6] hover:bg-[#333] text-[13px] font-medium transition-colors"
          >
            Open Dashboard
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-[#1A1A1A]" />
          ) : (
            <Menu className="h-5 w-5 text-[#1A1A1A]" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#F8F8F6] border-t border-[#ECECEA]/60 px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block text-[13px] text-[#6B6B6B] hover:text-[#1A1A1A] py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="block w-full text-center rounded-full px-5 py-2 bg-[#1A1A1A] text-[#F8F8F6] text-[13px] font-medium"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
