# An unknown country pays full price; no geo-IP lookup

Purchasing-power prices depend on the buyer's country. Behind Cloudflare the request carries it in the `CF-IPCountry` header. When it doesn't, we treat the country as unknown and charge full price rather than look it up over the network, so a page never waits on a third party to render.

## Considered Options

- **Look up the `X-Forwarded-For` address on ip-api.com.** Tried and rejected: the course list, purchase page and every lesson page for a discounted Purchase waited on a plain-HTTP call limited to 45 requests a minute.
- **Bundle a MaxMind GeoLite2 database.** Rejected: it needs a licence key, a download of tens of megabytes, and an update every month.

## Consequences

A Student outside Cloudflare's reach is overcharged: the very people purchasing-power pricing is for. Fixing that means bringing back one of the options above.
