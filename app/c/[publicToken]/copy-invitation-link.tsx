"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

function invitationUrl(publicToken: string) {
  const canonicalOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const origin = canonicalOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin.replace(/\/$/, "")}/c/${publicToken}/join`;
}

export function CopyInvitationLink({ publicToken, label = "Copy invitation link" }: { publicToken: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(invitationUrl(publicToken));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Button type="button" onClick={copyLink} className="w-full sm:w-auto">
      {copied ? "Invitation copied" : label}
    </Button>
  );
}
