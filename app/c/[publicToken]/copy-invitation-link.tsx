"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyInvitationLink() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Button type="button" onClick={copyLink} className="w-full sm:w-auto">
      {copied ? "Invitation link copied" : "Copy invitation link"}
    </Button>
  );
}
