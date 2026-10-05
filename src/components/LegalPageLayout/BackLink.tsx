"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/lib/constants";
import { useBackLink } from "@/lib/navigation/previousPage";

export function BackLink() {
  const backLink = useBackLink(ROUTES.home);
  return (
    <Link
      {...backLink}
      className="flex items-center gap-2 font-body text-sm text-j-text-muted hover:text-j-text-gold transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </Link>
  );
}
