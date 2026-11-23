// PROTOTYPE — throwaway, for "What does the Notification Feed look like in Cadence?" (#60).
// Three structurally different Notification Feeds in the real app shell, all reading the
// DevUI user's live Knock feed (public key + signed user token, headless API).
//   A "Bell popover":      bell in the sidebar header, badge = UNSEEN, opening marks all seen.
//   B "Inbox drawer":      sidebar nav item, badge = UNREAD, right slide-over, per-row read/unread + dismiss.
//   C "Notifications page": sidebar nav item with a dot, full /notifications page, visiting marks seen.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useFetcher, useLocation, useNavigate } from "react-router";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageSquare,
  Receipt,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";

// ─── Feed data (shared — data only, no layout) ─────────────────────────────

export type FeedConfig = {
  knockUserId: string;
  userToken: string;
  publicKey: string;
  feedChannelId: string;
};

type Entry = {
  id: string;
  data: Record<string, any>;
  inserted_at: string;
  seen_at: string | null;
  read_at: string | null;
  actors: Array<{ id: string; name?: string }>;
};
type Meta = { unread_count: number; unseen_count: number; total_count: number };

function useKnockFeed(config: FeedConfig | null) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [meta, setMeta] = useState<Meta>({ unread_count: 0, unseen_count: 0, total_count: 0 });
  const [log, setLog] = useState<string[]>([]);
  const note = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${s}`, ...l].slice(0, 6));

  const headers = useMemo(
    () =>
      config && {
        Authorization: `Bearer ${config.publicKey}`,
        "X-Knock-User-Token": config.userToken,
        "Content-Type": "application/json",
      },
    [config]
  );

  const refresh = useCallback(async () => {
    if (!config || !headers) return;
    const res = await fetch(
      `https://api.knock.app/v1/users/${config.knockUserId}/feeds/${config.feedChannelId}?page_size=30`,
      { headers }
    );
    if (!res.ok) return note(`GET feed → ${res.status}`);
    const body = await res.json();
    setEntries(body.entries);
    setMeta(body.meta);
  }, [config, headers]);

  const mark = useCallback(
    async (status: "seen" | "read" | "unread" | "archived", ids: string[]) => {
      if (!headers || ids.length === 0) return; // empty batch → 422 (spike gotcha)
      const res = await fetch(`https://api.knock.app/v1/messages/batch/${status}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message_ids: ids }),
      });
      note(`mark ${status} ×${ids.length} → ${res.status}`);
      await refresh();
    },
    [headers, refresh]
  );

  useEffect(() => {
    setEntries([]);
    refresh();
    const t = setInterval(refresh, 8000); // prototype: polling, not Knock's realtime socket
    return () => clearInterval(t);
  }, [refresh]);

  return {
    entries,
    meta,
    log,
    refresh,
    markSeen: () => mark("seen", entries.filter((e) => !e.seen_at).map((e) => e.id)),
    markRead: (e: Entry) => mark("read", [e.id]),
    markUnread: (e: Entry) => mark("unread", [e.id]),
    markAllRead: () => mark("read", entries.filter((e) => !e.read_at).map((e) => e.id)),
    dismiss: (e: Entry) => mark("archived", [e.id]),
  };
}

type Feed = ReturnType<typeof useKnockFeed>;
const FeedContext = createContext<Feed | null>(null);
const useFeed = () => useContext(FeedContext)!;

// ─── What a Notification says (rendered by Cadence from trigger data) ──────

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function describe(e: Entry) {
  const d = e.data;
  const who = d.actor_name ?? "Someone";
  switch (d.kind) {
    case "refund-approved":
      return { icon: Receipt, group: "Refunds", title: `Your refund for ${d.course_title} was approved`, detail: d.note, actor: null };
    case "refund-declined":
      return { icon: Receipt, group: "Refunds", title: `Your refund for ${d.course_title} was declined`, detail: `${d.note} You can ask again.`, actor: null };
    case "refund-requested":
      return { icon: Receipt, group: "Refunds", title: `${who} requested a refund for ${d.course_title}`, detail: `${money(d.amount_cents ?? 0)} · "${d.reason}"`, actor: who };
    case "seat-claimed":
      return { icon: UsersRound, group: "Team", title: `${who} claimed a Seat in ${d.course_title}`, detail: `${d.seats_left} Seats left`, actor: who };
    case "new-enrollment":
      return { icon: UserPlus, group: "Enrollments", title: `${who} enrolled in ${d.course_title}`, detail: null, actor: who };
    case "discussion-question":
      return { icon: MessageSquare, group: "Discussions", title: `${who} asked a question on ${d.lesson_title}`, detail: `"${d.snippet}"`, actor: who };
    case "discussion-reply":
    default:
      return { icon: MessageSquare, group: "Discussions", title: `${d.actor_name ?? d.replier_name ?? who} replied to your question on ${d.lesson_title}`, detail: d.snippet ? `"${d.snippet}"` : null, actor: d.actor_name ?? d.replier_name ?? who };
  }
}

function openLabel(kind: string) {
  switch (kind) {
    case "refund-approved":
    case "refund-declined":
      return "Go to course";
    case "refund-requested":
      return "Review Refund Request";
    case "seat-claimed":
      return "View team";
    case "new-enrollment":
      return "View students";
    default:
      return "Go to discussion";
  }
}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function Initial({ name }: { name: string | null }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {name ? name[0] : "C"}
    </div>
  );
}

function useOpen() {
  const navigate = useNavigate();
  const { markRead } = useFeed();
  return (e: Entry, after?: () => void) => {
    if (!e.read_at) markRead(e);
    after?.();
    if (e.data.url) navigate(e.data.url);
  };
}

// ─── Variant A: Bell popover ───────────────────────────────────────────────

// Bell + compact one-liners. Clicking a row opens its detail inside the popover and marks
// it read; the detail has "Open" (go to the thing) and "Dismiss". Rows also dismiss on hover.
function VariantAHeader() {
  const feed = useFeed();
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = feed.entries.find((e) => e.id === selectedId) ?? null;
  const close = () => {
    setOpen(false);
    setSelectedId(null);
  };
  const toggle = () => {
    if (isOpen) return close();
    feed.markSeen(); // opening the feed = seen; the badge clears
    setOpen(true);
  };
  const select = (e: Entry) => {
    if (!e.read_at) feed.markRead(e); // opening the detail = read
    setSelectedId(e.id);
  };
  const dismiss = (e: Entry) => {
    feed.dismiss(e); // Knock archive; no toast, no undo
    setSelectedId(null);
  };
  return (
    <>
      <button onClick={toggle} className="relative ml-auto rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent" title="Notifications">
        <Bell className="size-4" />
        {feed.meta.unseen_count > 0 && (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
        )}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="fixed left-52 top-3 z-50 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
            {selected ? (
              (() => {
                const d = describe(selected);
                const Icon = d.icon;
                return (
                  <div>
                    <div className="flex items-center justify-between border-b px-2 py-1.5">
                      <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 rounded px-1 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                        <ChevronLeft className="size-4" /> Notifications
                      </button>
                      <button onClick={() => dismiss(selected)} title="Dismiss" className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <Initial name={d.actor} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{d.actor ?? "Cadence"}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Icon className="size-3" /> {d.group} · {ago(selected.inserted_at)} ago
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed">{d.title}{d.detail && <span className="text-muted-foreground"> — {d.detail}</span>}</p>
                    </div>
                    {selected.data.url && (
                      <div className="px-4 pb-4">
                        <button onClick={() => { close(); navigate(selected.data.url); }} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                          {openLabel(selected.data.kind)} →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <>
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button onClick={feed.markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
                    Mark all as read
                  </button>
                </div>
                <div className="max-h-[28rem] overflow-y-auto">
                  {feed.entries.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
                  {feed.entries.map((e) => {
                    const d = describe(e);
                    return (
                      <div key={e.id} className={cn("group relative flex w-full items-start gap-3 px-4 py-2.5 hover:bg-accent", !e.read_at && "bg-primary/5")}>
                        <button onClick={() => select(e)} className="flex flex-1 items-start gap-3 text-left">
                          <Initial name={d.actor} />
                          <span className="flex-1 text-sm leading-snug">{d.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground group-hover:invisible">{ago(e.inserted_at)}</span>
                        </button>
                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", !e.read_at ? "bg-blue-500" : "bg-transparent")} />
                        <button onClick={() => dismiss(e)} title="Dismiss" className="absolute right-8 top-2.5 hidden rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground group-hover:block">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ─── Variant B: Inbox drawer ───────────────────────────────────────────────

function VariantBNav() {
  const feed = useFeed();
  const open = useOpen();
  const [isOpen, setOpen] = useState(false);
  const today = feed.entries.filter((e) => Date.now() - new Date(e.inserted_at).getTime() < 86400e3);
  const earlier = feed.entries.filter((e) => !today.includes(e));
  const Group = ({ label, items }: { label: string; items: Entry[] }) =>
    items.length === 0 ? null : (
      <div>
        <div className="px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="space-y-2 px-3">
          {items.map((e) => {
            const d = describe(e);
            const Icon = d.icon;
            return (
              <div key={e.id} className={cn("group relative rounded-lg border p-3", !e.read_at ? "border-primary/40 bg-primary/5" : "opacity-75")}>
                <button onClick={() => open(e, () => setOpen(false))} className="flex w-full gap-3 text-left">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-sm", !e.read_at && "font-semibold")}>{d.title}</div>
                    {d.detail && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.detail}</div>}
                    <div className="mt-1.5 text-xs text-muted-foreground">{ago(e.inserted_at)} ago</div>
                  </div>
                </button>
                <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                  <button onClick={() => (e.read_at ? feed.markUnread(e) : feed.markRead(e))} className="rounded bg-background px-1.5 py-0.5 text-[11px] shadow-sm hover:bg-accent">
                    {e.read_at ? "Mark unread" : "Mark read"}
                  </button>
                  <button onClick={() => feed.dismiss(e)} title="Dismiss" className="rounded bg-background p-0.5 shadow-sm hover:bg-accent">
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
        <Inbox className="size-4" />
        Notifications
        {feed.meta.unread_count > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2 text-xs font-semibold leading-5 text-primary-foreground">{feed.meta.unread_count}</span>
        )}
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <div className="flex h-full w-[26rem] flex-col bg-background shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <div className="flex items-center gap-2">
                <button onClick={feed.markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
                <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-accent"><X className="size-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              {feed.entries.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
              <Group label="Today" items={today} />
              <Group label="Earlier" items={earlier} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Variant C: Notifications page ─────────────────────────────────────────

function VariantCNav() {
  const feed = useFeed();
  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <Bell className="size-4" />
      Notifications
      {feed.meta.unseen_count > 0 && <span className="ml-auto size-2 rounded-full bg-red-500" />}
    </NavLink>
  );
}

export function NotificationsPage() {
  const feed = useFeed();
  const open = useOpen();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [group, setGroup] = useState<string | null>(null);
  useEffect(() => {
    if (feed.meta.unseen_count > 0) feed.markSeen(); // visiting the page = seen
  }, [feed.meta.unseen_count]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = ["Refunds", "Team", "Enrollments", "Discussions"].filter((g) => feed.entries.some((e) => describe(e).group === g));
  const shown = feed.entries.filter((e) => (tab === "all" || !e.read_at) && (!group || describe(e).group === group));
  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{feed.meta.unread_count} unread</p>
        </div>
        <button onClick={feed.markAllRead} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Mark all as read</button>
      </div>
      <div className="mb-4 flex items-center gap-2">
        {(["all", "unread"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1 text-sm capitalize", tab === t ? "bg-foreground text-background" : "hover:bg-accent")}>{t}</button>
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        {groups.map((g) => (
          <button key={g} onClick={() => setGroup(group === g ? null : g)} className={cn("rounded-full border px-3 py-0.5 text-xs", group === g && "border-primary bg-primary/10")}>{g}</button>
        ))}
      </div>
      <div className="divide-y rounded-lg border">
        {shown.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">Nothing to show.</p>}
        {shown.map((e) => {
          const d = describe(e);
          const Icon = d.icon;
          return (
            <div key={e.id} className={cn("flex items-center gap-4 px-4 py-3", !e.read_at && "bg-primary/5")}>
              <span className={cn("size-2 shrink-0 rounded-full", !e.read_at ? "bg-blue-500" : "bg-transparent")} />
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm", !e.read_at && "font-medium")}>{d.title}</div>
                {d.detail && <div className="truncate text-sm text-muted-foreground">{d.detail}</div>}
              </div>
              <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">{new Date(e.inserted_at).toLocaleDateString()}</span>
              <button onClick={() => open(e)} className="shrink-0 text-sm font-medium text-primary hover:underline">Open →</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Wiring + floating switcher ────────────────────────────────────────────

const VARIANTS = [
  { key: "A", name: "Bell + detail" },
  { key: "B", name: "Inbox drawer" },
  { key: "C", name: "Notifications page" },
];

function useVariant() {
  const location = useLocation();
  const navigate = useNavigate();
  const fromUrl = new URLSearchParams(location.search).get("variant");
  const [stored, setStored] = useState("A");
  useEffect(() => setStored(localStorage.getItem("prototype-feed-variant") ?? "A"), []);
  const variant = fromUrl ?? stored;
  const set = (v: string) => {
    localStorage.setItem("prototype-feed-variant", v);
    setStored(v);
    const p = new URLSearchParams(location.search);
    p.set("variant", v);
    navigate({ search: p.toString() }, { replace: true, preventScrollReset: true });
  };
  return [variant, set] as const;
}

export function PrototypeFeedProvider({ config, children }: { config: FeedConfig | null; children: React.ReactNode }) {
  const feed = useKnockFeed(config);
  return <FeedContext.Provider value={feed}>{children}</FeedContext.Provider>;
}

export function PrototypeFeedHeaderSlot() {
  const [variant] = useVariant();
  return variant === "A" ? <VariantAHeader /> : null;
}

export function PrototypeFeedNavSlot() {
  const [variant] = useVariant();
  if (variant === "B") return <VariantBNav />;
  if (variant === "C") return <VariantCNav />;
  return null;
}

const KIND_OPTIONS = [
  "refund-approved",
  "refund-declined",
  "refund-requested",
  "seat-claimed",
  "new-enrollment",
  "discussion-question",
  "discussion-reply",
];

export function PrototypeFeedSwitcher() {
  const [variant, setVariant] = useVariant();
  const feed = useFeed();
  const fetcher = useFetcher();
  const [kind, setKind] = useState(KIND_OPTIONS[6]);
  const i = Math.max(0, VARIANTS.findIndex((v) => v.key === variant));
  const step = (d: number) => setVariant(VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length].key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) setTimeout(feed.refresh, 2500);
  }, [fetcher.state, fetcher.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-zinc-900 px-4 py-2 font-mono text-xs text-white shadow-2xl ring-2 ring-amber-400">
      <div className="flex items-center gap-3">
        <span className="text-amber-400">PROTOTYPE #60</span>
        <button onClick={() => step(-1)} className="rounded p-0.5 hover:bg-white/20"><ChevronLeft className="size-4" /></button>
        <span className="w-44 text-center">{VARIANTS[i].key} ({VARIANTS[i].name})</span>
        <button onClick={() => step(1)} className="rounded p-0.5 hover:bg-white/20"><ChevronRight className="size-4" /></button>
        <span className="h-4 w-px bg-white/30" />
        <fetcher.Form method="post" action="/api/prototype-notify" className="flex items-center gap-1">
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="rounded bg-zinc-800 px-1 py-0.5">
            {KIND_OPTIONS.map((k) => <option key={k}>{k}</option>)}
          </select>
          <button className="rounded bg-amber-400 px-2 py-0.5 font-bold text-zinc-900 disabled:opacity-50" disabled={fetcher.state !== "idle"}>
            {fetcher.state !== "idle" ? "…" : "Send to me"}
          </button>
        </fetcher.Form>
      </div>
      <div className="text-white/60">
        unseen {feed.meta.unseen_count} · unread {feed.meta.unread_count} · total {feed.meta.total_count}
        {feed.log[0] && <> · last: {feed.log[0]}</>}
      </div>
    </div>
  );
}

