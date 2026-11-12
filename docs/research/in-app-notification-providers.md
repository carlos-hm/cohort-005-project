# Which third-party in-app notification providers fit Cadence?

Research for the ticket "Which third-party in-app notification providers fit Cadence?" (child of "Map: In-app Notifications for Students and Instructors").

Researched 2026-11-12 against each vendor's own docs, pricing pages, GitHub repo and npm registry. Pricing and free tiers change often, so check the pricing pages again before committing.

**Cadence constraints:** server-rendered React Router app (`react-router` 8.3.0, React 19.2 per `package.json`) with server loaders and actions, and SQLite via Drizzle. Notifications are in-app only and go to Students and Instructors. Real-time delivery is nice-to-have. Email may come later. `npm run test` (Vitest) should stay offline.

## Summary table

| | Knock | Novu | MagicBell | Courier | SuprSend |
|---|---|---|---|---|---|
| React feed UI | Prebuilt popover, feed and bell, plus hooks (`@knocklabs/react`) | Prebuilt `<Inbox />`, plus headless hooks (`@novu/react`) | Prebuilt `Inbox` and `FloatingInbox` (`@magicbell/react`). No hooks documented | Prebuilt `CourierInbox` and popup, plus `useCourier()` (`@trycourier/courier-react`) | Prebuilt `Inbox` and `NotificationFeed` (`@suprsend/react`), plus headless `@suprsend/react-core` |
| Node SDK | `@knocklabs/node` | `@novu/api` | `magicbell-js/project-client` | `@trycourier/courier` | `@suprsend/node-sdk` |
| Recipient ID | Your user id string, or an inline user object | `subscriberId` (your id) | `external_id` or email | `user_id` (your id) | `distinct_id` (your id) |
| Feed auth | RS256 JWT signed by your server (`signUserToken` helper), with enhanced security mode | HMAC-SHA256 `subscriberHash` | HS256 user JWT | JWT from `POST /auth/issue-token` | ES256 JWT, with enhanced security mode |
| Real-time | WebSocket (`new-message`) | WebSocket | Persistent connection (transport not stated) | WebSocket (`listenForUpdates()`) | Not documented on the pages I read |
| States | seen, read, interacted, archived | read, seen, archived, snoozed | read/unread, archive, delete | read, opened, archived | Not documented on the pages I read |
| Free tier | 10k messages/mo, unlimited workflows | 10k runs/mo, **5 workflows**, 24h activity retention | **1k deliveries/mo** | 10k sends/mo | 10k notifications/mo, SuprSend branding on feed |
| First paid tier | $250/mo | $30/mo | $249/mo | Pay-as-you-go, $0.005/send | $100/mo |
| Self-host | No | Yes: MIT core, but needs Mongo, Redis and S3 | No | No | Enterprise only |
| Dev/test | Dev and prod environments, `sandbox_mode` on trigger, workflow test runner | Dev and prod environments | Projects | Test and prod environments | Staging and prod workspaces |
| Email later | Add an email step to the workflow | Add an email step | Add an email channel | Change channel routing | Add an email channel |

## Knock

- **In-app feed:** `@knocklabs/react` ships `NotificationFeedPopover`, `NotificationFeed` and `NotificationIconButton`, plus "a complete set of React hooks" for custom UI ([React overview](https://docs.knock.app/in-app-ui/react/overview)). Setup is `KnockProvider` (public key and user) wrapping `KnockFeedProvider` (feed channel id). You can customise with `renderItem`, `onNotificationClick` and `badgeCountType="unread"`. An Action URL on the template redirects on click automatically ([React feed](https://docs.knock.app/in-app-ui/react/feed)). The npm peer dependencies allow React 17, 18 and 19.
- **Server SDK and trigger:** `@knocklabs/node`, `workflows.trigger(key, { recipients, data, actor, tenant })`. Recipients can be user id strings, object references, or inline user objects, which saves a separate "identify" call. An `Idempotency-Key` header is honoured for 24 hours. The limits are 1,000 recipients per trigger and a 10 MB data payload ([Trigger API](https://docs.knock.app/send-notifications/triggering-workflows/api)).
- **Identity and auth:** The client uses the public API key. With **enhanced security mode** on, the client must also send a server-signed JWT: RS256, `sub` = user id, created by `signUserToken` from `@knocklabs/node/lib/tokenSigner` with a default 3,600 s expiry. The mode is off by default, and the docs say to enable it before going to production ([Security & auth](https://docs.knock.app/in-app-ui/security-and-authentication)).
- **Real-time and state:** A WebSocket pushes `new-message` events, which carry badge counts but not the message body. Statuses are seen (`seen_at`), read (`read_at`), interacted (`link_clicked_at`) and archived (`archived_at`). Archived messages are hidden by default ([In-app APIs](https://docs.knock.app/in-app-ui/api-overview)).
- **Pricing:** The free tier is $0 for 10,000 messages per month, with unlimited workflows and team members. Starter is $250/mo for 50k messages, then $0.005 each. One message is one user on one channel, so in-app feed messages count ([Pricing](https://knock.app/pricing)). Knock is hosted only, and the pricing page doesn't mention self-hosting.
- **Dev and testing:** Each environment (development, production) has isolated data and its own API keys. Workflows are version-controlled commits that you promote between environments ([Environments](https://docs.knock.app/concepts/environments)). The test runner and the trigger API accept `sandbox_mode` (messages are generated but not delivered) and `skip_delay` ([Testing workflows](https://docs.knock.app/send-notifications/testing-workflows)). I found no official offline mock.
- **Email later:** Add an email channel step to the same workflow. Each email counts as a separate message.

## Novu

- **In-app feed:** `@novu/react` (React 18 or 19) ships `<Inbox />`: a bell, a feed and a preferences panel. You can swap sub-components and icons, and it supports tabs, localization and snoozing ([Inbox overview](https://docs.novu.co/platform/inbox/overview)). The headless `useNotifications` hook returns notifications with pagination and filters. Each notification has `read`/`unread`, `seen`, `archive`, `snooze` and `delete` methods. Live updates come over a WebSocket by default (`realtime: false` turns them off) ([useNotifications](https://docs.novu.co/platform/sdks/react/hooks/use-notifications)).
- **Server SDK and trigger:** `@novu/api` sends `novu.trigger({ workflowId, to: { subscriberId }, payload })` ([TypeScript SDK](https://docs.novu.co/platform/sdks/server/typescript)). You can also define workflows in code with `@novu/framework`. That requires serving a "Bridge Endpoint" from your own app ([Framework](https://docs.novu.co/framework/overview)).
- **Identity and auth:** The subscriber is your user id. For production, turn on HMAC in the In-App integration. The server computes `createHmac('sha256', NOVU_SECRET_KEY).update(subscriberId).digest('hex')` and passes it as `subscriberHash`. With HMAC on, the Inbox won't load without that hash. Removing the Novu branding requires a paid plan ([Prepare for production](https://docs.novu.co/platform/inbox/prepare-for-production)).
- **Pricing:** The free tier is $0 for 10k workflow runs per month, but only **5 workflows**, Dev and Prod environments, 3 team members, and 24 h of activity-feed retention. Pro is $30/mo for 30k+ runs (then $1.20 per 1k). Team is $250/mo ([Pricing](https://novu.co/pricing)).
- **Self-host:** The repo is MIT, except `enterprise/packages`, which is under a proprietary license (`LICENSE-ENTERPRISE` in [novuhq/novu](https://github.com/novuhq/novu)). Self-hosting needs API, Worker and WS services plus a dashboard, Redis (two clusters recommended), MongoDB and S3-compatible storage. Some cloud-only features are unavailable ([Self-hosting](https://docs.novu.co/community/self-hosting-novu/overview)). That is heavy compared with Cadence's single SQLite file.
- **Dev and testing:** Dev and Prod environments come with separate keys. I found no offline mock.
- **Email later:** Add an email step to the workflow.

## MagicBell

- **In-app feed:** `@magicbell/react` ships `Inbox`, `FloatingInbox`, `ToastContainer`, `UserPreferences` and others. You can customise with `ItemComponent`, CSS variables and `unstyled`. The current docs don't describe headless hooks ([React lib](https://www.magicbell.com/docs/libraries/magicbell-react)).
- **Server SDK and trigger:** `magicbell-js/project-client`, `client.broadcasts.createBroadcast({ recipients: [...] })`. Recipients are `User` objects with `externalId` and/or `email` ([JS lib](https://www.magicbell.com/docs/libraries/magicbell-js)).
- **Identity and auth:** The user JWT is signed HS256 with the project Secret Key. Claims are `user_email` and/or `user_external_id`, plus `api_key`. The docs' examples use a one-year expiry ([User JWT](https://www.magicbell.com/docs/api/authentication/user)).
- **Real-time and state:** A "persistent connection" delivers notifications without a reload, but the docs don't name the transport. You can mark notifications read or unread, archive them, and delete them. I found no documented "seen" state ([In-app channel](https://www.magicbell.com/docs/channels/in_app)).
- **Pricing:** The free Builder plan covers **1,000 deliveries per month**. Startup is $249/mo for 50k deliveries. Deliveries are counted per channel per user ([Pricing](https://www.magicbell.com/pricing)). The pricing page doesn't mention self-hosting.
- **Fit:** The free tier is the smallest of the five, and the SDK has no documented headless layer.

## Courier

- **In-app feed:** `@trycourier/courier-react` (v9.x on npm, React 18 or later) ships `CourierInbox`, `CourierInboxPopupMenu`, `CourierToast` and `CourierPreferences`. `useCourier()` exposes `auth`, `inbox` and `toast` so you can build your own UI. Components "render client-side only" ([React SDK](https://www.courier.com/docs/sdk-libraries/courier-react-web.md), [Inbox](https://www.courier.com/docs/platform/inbox/inbox-overview)).
- **Server SDK and trigger:** `@trycourier/courier` sends `client.send.message({ message: { to: { user_id }, template, data, routing: { method: "single", channels: ["inbox"] } } })`. This needs a published template with an In-App channel ([Send to inbox](https://www.courier.com/docs/in-app/send-to-the-inbox.md)).
- **Identity and auth:** The server calls `client.auth.issueToken({ scope: "user_id:<id> inbox:read:messages inbox:write:events", expires_in })`, and the client calls `signIn({ userId, jwt })`. Without an expiry the token never expires. The SDK doesn't refresh tokens, so your server must issue new ones ([Authenticate users](https://www.courier.com/docs/in-app/authenticate-users.md)).
- **Real-time and state:** `inbox.listenForUpdates()` opens a WebSocket. Read, opened and archived states sync across devices.
- **Pricing:** The free Developer plan includes 10k sends per month. One send is one template to one recipient, so adding channels doesn't add sends. After that it's pay-as-you-go at $0.005/send ([Pricing](https://www.courier.com/pricing)). The pricing page doesn't say whether Inbox is on the free plan. Courier is hosted only.
- **Dev and testing:** Test and Production environments come with the Inbox provider preconfigured.
- **Email later:** Courier is strongest here. It is a multi-channel router at heart, and you only change the routing.

## SuprSend

- **In-app feed:** `@suprsend/react` (drop-in `Inbox`, `NotificationsFeed` and `Preferences`) is built on `@suprsend/react-core` (providers and hooks for headless use). `SuprSendProvider` takes `publicApiKey`, `distinctId`, `userToken` and `refreshUserToken` ([React SDK](https://docs.suprsend.com/docs/react-sdk)). The older `@suprsend/react-inbox` package is end-of-support ([Inbox React](https://docs.suprsend.com/docs/inbox-react)).
- **Server SDK and trigger:** `@suprsend/node-sdk` sends `new WorkflowTriggerRequest({ workflow, recipients, data, actor }, { tenant_id, idempotency_key })` through `supr_client.workflows.trigger()` ([Node trigger](https://docs.suprsend.com/docs/node-trigger-workflow-from-api)).
- **Identity and auth:** The user token is an ES256 JWT signed with a PEM signing key. Claims are `entity_type: "subscriber"`, `entity_id` = distinct id, `iat`, `exp` and optional `scope.tenant_id`. With enhanced security mode on, requests without a token are rejected ([Client auth](https://docs.suprsend.com/docs/client-authentication)).
- **Pricing:** The free tier is 10k notifications per month and keeps SuprSend branding on the feed. Essentials is $100/mo, and Business, which adds batching and digests, is $250/mo. Self-hosting is Enterprise only ([Pricing](https://www.suprsend.com/pricing)).
- **Dev and testing:** You design in a staging workspace, then clone workflows to production ([Workflows](https://docs.suprsend.com/docs/workflows)).

## Cross-cutting notes for Cadence

- **SSR:** All five feeds are client-side widgets that use browser APIs and sockets. In Cadence they must render only on the client (for example, mount after hydration). Server loaders and actions only call the Node SDK and create the user token or hash.
- **Identity:** Every provider keys recipients on your own user id. Cadence's user id maps 1:1, and the DevUI user switcher just changes which id is signed. Token signing (Knock RS256, SuprSend ES256, MagicBell HS256, Courier API-issued, Novu HMAC) fits naturally in the root loader.
- **Offline tests:** No vendor ships an offline mock. Every provider leads to the same design: wrap the trigger behind one Cadence module (for example `sendNotification(...)`) and swap in a fake in Vitest. Vendor "sandbox" and "test" modes still make network calls.
- **Provider down or slow:** All five are HTTP calls from the action. Idempotency keys (Knock, SuprSend) make retries safe.

## Recommendation: Knock (runner-up: Novu)

**Why Knock:**

- It has the most complete in-app feature set of the five: prebuilt feed and bell, headless hooks, full seen/read/interacted/archived states, and WebSocket push.
- Its server SDK ships a JWT signing helper.
- Inline recipient identification means a trigger doesn't need a prior user-sync step.
- `sandbox_mode` and separate dev/prod environments help with testing.
- The free tier (10k messages/mo, unlimited workflows) comfortably covers a course-sized app.
- Adding email later is one more workflow step.

**Trade-offs:**

- Knock is hosted only, so there's vendor lock-in.
- The next tier is a big jump: free to $250/mo.
- In-app and email messages each count toward the 10k.
- Enhanced security mode must be enabled manually.
- The real-time `new-message` event carries only counts, so the client refetches the feed.

**Choose Novu instead if** open source, self-hosting, or a cheap paid tier ($30/mo) matters more. Know its free-tier limits: 5 workflows, which may be tight once the first set of Notifications is decided, 24 h activity retention, and Novu branding. Self-hosting needs Mongo, Redis and S3, which is far more than Cadence's single SQLite file.

**Not recommended:**

- MagicBell: 1k/mo free and no documented headless layer.
- SuprSend: branding on free, auth setup in PEM/ES256, thinner React docs.
- Courier: fine, and the best email story, but its in-app docs and free-tier Inbox coverage are less clear than Knock's.
