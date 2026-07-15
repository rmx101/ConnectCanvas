"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyInvitationLinkProps = {
  publicToken?: string;
  label?: string;
};

export function CopyInvitationLink({ publicToken, label = "Copy invitation link" }: CopyInvitationLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const invitationHref = publicToken ? `${window.location.origin}/c/${publicToken}/join` : window.location.href;

    await navigator.clipboard.writeText(invitationHref);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Button type="button" onClick={copyLink} className="w-full sm:w-auto">
      {copied ? "Invitation link copied" : label}
    </Button>
  );
}
