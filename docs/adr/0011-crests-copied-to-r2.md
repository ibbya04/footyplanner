# 0011. Crests and logos copied to R2

- Status: Accepted
- Date: 2026-11-18

## Context

The page loads team crests and league logos straight from ESPN's CDN (`a.espncdn.com`). If ESPN changes those URLs or blocks hotlinking, every pin and card loses its crest. Crests are the most-downloaded content in the app: several per match on every page view.

## Decision

- Ingestion records each team's and league's ESPN image URL in D1.
- Each cron run copies up to **three** missing images into an R2 bucket (`IMAGES`, `footyplanner-images`) as `teams/<id>.<ext>` or `leagues/<slug>.<ext>`. Only real images under 1 MB are accepted; a failure is retried the next day.
- If ESPN's URL for a crest changes, the stored copy is dropped and copied again.
- The Worker serves them at `/img/...`, cached for 30 days at the edge and 7 days in browsers. The API returns `/img/...` once a copy exists and ESPN's URL until then.

## Alternatives considered

- **Keep hotlinking ESPN.** Works today, but outside our control. It remains the fallback until a copy exists.
- **Store images in D1.** Rows can hold up to 2 MB, but every image read becomes a query, and D1 isn't made for binary files.
- **KV.** Could hold them, but 1,000 writes a day on Free, and R2 exists for exactly this.
- **Bundle them with the static assets.** New teams arrive every season (promotion, cup draws), and each would need a redeploy.

## Consequences

- Images are served from our own origin, with no egress fees (the reason Rate My Uni chose R2 too). A few hundred crests come to about 5 MB, far inside R2's 10 GB free tier.
- R2 has to be enabled on the Cloudflare account. Its free tier still goes through a checkout step.
- The first copy of every crest takes a while: at three per minute, about 260 crests take around 90 minutes.
