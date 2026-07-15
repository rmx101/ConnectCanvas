import { createHash } from "node:crypto";

export const participantCookieName = "connect_canvas_participant";
export const ownerSessionCookieName = "connect_canvas_owner_session";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
