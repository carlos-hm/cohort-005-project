// PROTOTYPE — throwaway Knock spike for "Does Knock hold up against Cadence?"
// (issue #52). Open /prototype/knock, switch users in the DevUI panel.
import { useCallback, useEffect, useState } from "react";
import { data, Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/prototype.knock";
import { getCurrentUserId } from "~/lib/session";
import {
  allUsers,
  clearPreferences,
  getPreferences,
  identify,
  knockConfig,
  knockUserId,
  latestDiscussionReply,
  optInToEnrollments,
  signFor,
  triggerDiscussionReply,
  triggerNewEnrollment,
} from "~/lib/prototype-knock.server";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw data("Select a user from the DevUI panel.", { status: 401 });
  const user = await identify(userId);
  const preferences = await getPreferences(userId).catch((e) => ({ error: String(e) }));
  return {
    user,
    knockUserId: knockUserId(userId),
    userToken: await signFor(userId),
    ...knockConfig(),
    users: allUsers(),
    reply: latestDiscussionReply(),
    preferences,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw data("Select a user from the DevUI panel.", { status: 401 });
  const form = await request.formData();
  const intent = form.get("intent");
  try {
    if (intent === "discussion-reply") return { intent, result: await triggerDiscussionReply(userId) };
    if (intent === "new-enrollment")
      return { intent, result: await triggerNewEnrollment(userId, Number(form.get("studentId"))) };
    if (intent === "opt-in") return { intent, result: await optInToEnrollments(userId) };
    if (intent === "clear-prefs") return { intent, result: await clearPreferences(userId) };
  } catch (e) {
    return { intent, error: String(e) };
  }
  return { intent, error: "unknown intent" };
}

type Feed = {
  entries: Array<{ id: string; seen_at: string | null; read_at: string | null; inserted_at: string; source: { key: string }; blocks: Array<{ name: string; rendered: string }> }>;
  meta: { unread_count: number; unseen_count: number; total_count: number };
};

export default function KnockSpike({ loaderData }: Route.ComponentProps) {
  const { user, knockUserId, userToken, publicKey, feedChannelId, users, reply, preferences } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [tokenOverride, setTokenOverride] = useState<"signed" | "none" | "other">("signed");

  const headers = useCallback(
    (): Record<string, string> => ({
      Authorization: `Bearer ${publicKey}`,
      "Content-Type": "application/json",
      ...(tokenOverride === "signed" ? { "X-Knock-User-Token": userToken } : {}),
      ...(tokenOverride === "other" ? { "X-Knock-User-Token": userToken.slice(0, -4) + "AAAA" } : {}),
    }),
    [publicKey, userToken, tokenOverride]
  );

  const note = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 30));

  // Check 3: headless feed API straight from the browser, public key + signed token.
  const loadFeed = useCallback(async () => {
    const res = await fetch(
      `https://api.knock.app/v1/users/${knockUserId}/feeds/${feedChannelId}?page_size=20`,
      { headers: headers() }
    );
    const body = await res.json();
    note(`GET feed → ${res.status}${res.ok ? ` (${body.entries.length} items, unread ${body.meta.unread_count}, unseen ${body.meta.unseen_count})` : ` ${JSON.stringify(body)}`}`);
    setFeed(res.ok ? body : null);
  }, [knockUserId, feedChannelId, headers]);

  const mark = async (status: "seen" | "read" | "unread" | "unseen", ids: string[]) => {
    const res = await fetch(`https://api.knock.app/v1/messages/batch/${status}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ message_ids: ids }),
    });
    note(`POST batch/${status} (${ids.length}) → ${res.status}`);
    await loadFeed();
  };

  useEffect(() => {
    loadFeed();
  }, [loadFeed, actionData]);

  const busy = navigation.state !== "idle";
  const students = users.filter((u) => u.role === "student");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 font-mono text-sm">
      <div className="rounded border-2 border-dashed border-amber-500 bg-amber-50 p-3">
        PROTOTYPE — Knock spike (issue #52). Throwaway; not production.
      </div>

      <section className="space-y-1">
        <h2 className="font-bold">1. Signed user token</h2>
        <div>DevUI user: {user.name} ({user.role}) → Knock id <b>{knockUserId}</b></div>
        <div className="break-all text-xs text-gray-500">token: {userToken.slice(0, 60)}…</div>
        <div className="flex gap-3">
          Send as:
          {(["signed", "none", "other"] as const).map((t) => (
            <label key={t}>
              <input type="radio" checked={tokenOverride === t} onChange={() => setTokenOverride(t)} /> {t === "other" ? "tampered" : t}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">2. Trigger (Node SDK)</h2>
        <div className="text-xs text-gray-500">
          Latest seed Discussion Reply: #{reply?.replyId} by {reply?.replierName} on “{reply?.lessonTitle}” (real question author: user {reply?.questionAuthorId}{" "}
          {users.find((u) => u.id === reply?.questionAuthorId)?.name})
        </div>
        <Form method="post" className="flex flex-wrap items-center gap-2">
          <button name="intent" value="discussion-reply" disabled={busy} className="rounded border px-2 py-1">
            Trigger discussion-reply → me
          </button>
          <select name="studentId" className="border">
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button name="intent" value="new-enrollment" disabled={busy} className="rounded border px-2 py-1">
            Trigger new-enrollment → me (as instructor)
          </button>
        </Form>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">3. Headless feed</h2>
        <div>
          unread <b>{feed?.meta.unread_count ?? "?"}</b> · unseen <b>{feed?.meta.unseen_count ?? "?"}</b> · total {feed?.meta.total_count ?? "?"}
        </div>
        <div className="flex gap-2">
          <button onClick={loadFeed} className="rounded border px-2 py-1">Refresh</button>
          <button onClick={() => feed && mark("seen", feed.entries.map((e) => e.id))} className="rounded border px-2 py-1">Mark all seen</button>
          <button onClick={() => feed && mark("unseen", feed.entries.map((e) => e.id))} className="rounded border px-2 py-1">Mark all unseen</button>
        </div>
        <ul className="space-y-1">
          {feed?.entries.map((e) => (
            <li key={e.id} className={`rounded border p-2 ${e.read_at ? "opacity-50" : ""}`}>
              <div className="text-xs text-gray-500">
                {e.source.key} · {e.inserted_at} · seen {e.seen_at ? "✓" : "✗"} · read {e.read_at ? "✓" : "✗"}
              </div>
              {e.blocks.map((b) => (
                <div key={b.name} dangerouslySetInnerHTML={{ __html: b.rendered }} />
              ))}
              <button onClick={() => mark(e.read_at ? "unread" : "read", [e.id])} className="text-xs underline">
                mark {e.read_at ? "unread" : "read"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">4. Preferences (my Knock preference set)</h2>
        <Form method="post" className="flex gap-2">
          <button name="intent" value="opt-in" disabled={busy} className="rounded border px-2 py-1">Opt in to enrollments × in_app_feed</button>
          <button name="intent" value="clear-prefs" disabled={busy} className="rounded border px-2 py-1">Clear my preferences</button>
        </Form>
        <pre className="max-h-48 overflow-auto bg-gray-100 p-2 text-xs">{JSON.stringify(preferences, null, 2)}</pre>
      </section>

      <section className="space-y-1">
        <h2 className="font-bold">State</h2>
        <pre className="max-h-48 overflow-auto bg-gray-100 p-2 text-xs">last action: {JSON.stringify(actionData, null, 2)}</pre>
        <pre className="max-h-48 overflow-auto bg-gray-100 p-2 text-xs">{log.join("\n")}</pre>
      </section>
    </div>
  );
}
