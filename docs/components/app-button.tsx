"use client";

import React from "react";
import { Link } from "nextra-theme-docs";
import { Sparkles } from "lucide-react";

export default function TryAppButton() {
  return (
    <Link
      href="/playground"
      className="flex items-center rounded-md gap-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 py-1.5 px-3 transition-all shadow-sm hover:shadow-md"
    >
      <Sparkles className="w-4 h-4 shrink-0" />
      <span className="font-semibold">Playground</span>
    </Link>
  );
}
