export const ownerCookieName = "connect_canvas_owner";

export function participantCookieName(publicToken: string) {
  return `connect_canvas_participant_${publicToken}`;
}
