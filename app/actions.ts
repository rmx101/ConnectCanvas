"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { canvases } from "@/db/schema";

function createPublicToken() {
  return randomBytes(24).toString("base64url");
}

export async function startCanvas() {
  const publicToken = createPublicToken();

  await db.insert(canvases).values({ publicToken });

  redirect(`/c/${publicToken}`);
}
