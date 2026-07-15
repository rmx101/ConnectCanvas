# Founder notes

Connect Canvas is intentionally small: a private two-person reflection space that starts without accounts and grows through invitation.

## Product promises

- Owners get an anonymous browser session cookie so they can return to canvases from `/my` without creating an account.
- Public invitation links use `/c/[publicToken]/join` so invited participants receive a distinct session from the owner.
- Public tokens are short enough to share comfortably while remaining random URL-safe identifiers.
- `NEXT_PUBLIC_APP_URL` is the canonical base URL for invitation links when it is configured.

## Operational notes

Keep the join flow conservative: reserve participant slot 1 first, then slot 2 atomically, and reject any third participant. Public join pages must not update the owner's `last_viewed_at`; only a restored participant visiting the canvas should refresh it.
