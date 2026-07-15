"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

type CopyInvitationLinkProps = {
  publicToken: string;
};

function getInvitationOrigin() {
  if (canonicalAppUrl) {
    return canonicalAppUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return window.location.origin;
  }

  return "https://connect-canvas-sooty.vercel.app";
}

export function CopyInvitationLink({ publicToken }: CopyInvitationLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const invitationLink = `${getInvitationOrigin()}/c/${publicToken}/join`;

    await navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Button type="button" onClick={copyLink} className="w-full sm:w-auto">
      {copied ? "Invitation link copied" : "Copy invitation link"}
    </Button>
  );
}
