// Account sync: the signed-in user's cloud row is the source of truth; localStorage is a cache
// that keeps working offline. Browser-only. No scoring logic here.
import { useEffect, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getState, hasLocalData, onCommit, replaceState } from "./store";
import { getLang, onLangChange, setLang, type Lang } from "./i18n";

export type SyncStatus = "idle" | "syncing" | "synced" | "pending" | "offline";

let user: User | null = null;
let ready = false;
let status: SyncStatus = "idle";
/** Set when a fresh account meets a device with existing data: the user must choose Import / Start Fresh. */
type Migration = "ask" | "working" | "done" | "error" | null;
let migration = null as Migration;
let snapshot: { user: User | null | undefined; status: SyncStatus; migration: Migration } = { user: undefined, status, migration };

const subs = new Set<() => void>();
const emit = () => {
  snapshot = { user: ready ? user : undefined, status, migration };
  subs.forEach((f) => f());
};
const setStatus = (s: SyncStatus) => { status = s; emit(); };

const PENDING = "awwab:pending"; // user id whose local edits have not reached the cloud yet
const BACKUP = "awwab:v1:local-backup";
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* unavailable */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* unavailable */ } },
};

async function push(): Promise<boolean> {
  if (!user) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) { ls.set(PENDING, user.id); setStatus("offline"); return false; }
  setStatus("syncing");
  const { error } = await supabase.from("user_state").upsert({ user_id: user.id, data: getState() as never, updated_at: new Date().toISOString() });
  if (error) { ls.set(PENDING, user.id); setStatus(navigator.onLine ? "pending" : "offline"); return false; }
  ls.del(PENDING);
  setStatus("synced");
  return true;
}

let timer: ReturnType<typeof setTimeout> | null = null;
const schedule = () => {
  if (!user || migration === "ask") return;
  ls.set(PENDING, user.id); // survives a reload before the debounce fires
  if (timer) clearTimeout(timer);
  timer = setTimeout(push, 800);
};

async function loadProfile(u: User) {
  const { data } = await supabase.from("profiles").select("language").eq("user_id", u.id).maybeSingle();
  if (data?.language === "id" || data?.language === "en") { if (data.language !== getLang()) setLang(data.language as Lang); }
  else await supabase.from("profiles").upsert({ user_id: u.id, language: getLang() }, { onConflict: "user_id" });
}

async function onSignIn(u: User) {
  void loadProfile(u);
  // Unsynced offline edits from this same account win over the older cloud copy.
  if (ls.get(PENDING) === u.id) { await push(); return; }
  setStatus("syncing");
  const { data, error } = await supabase.from("user_state").select("data").eq("user_id", u.id).maybeSingle();
  if (error) { setStatus(navigator.onLine ? "pending" : "offline"); return; }
  const remote = data?.data as Record<string, unknown> | undefined;
  if (remote && Object.keys(remote).length) { replaceState(remote); setStatus("synced"); return; }
  // New account. Ask before moving data that already lives on this device.
  if (hasLocalData(getState())) { migration = "ask"; setStatus("idle"); return; }
  replaceState({}); // default 21 activities, owned by this account
  await push();
}

export async function importLocalData() {
  migration = "working"; emit();
  migration = (await push()) ? "done" : "error";
  emit();
}

export async function startFresh() {
  ls.set(BACKUP, JSON.stringify(getState())); // keep old local data, never delete it silently
  migration = null;
  replaceState({});
  await push();
  emit();
}

export const dismissMigration = () => { migration = null; emit(); };

let started = false;
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  onCommit(schedule);
  onLangChange((l) => {
    if (user) void supabase.from("profiles").update({ language: l, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  });
  window.addEventListener("online", () => { if (user && ls.get(PENDING) === user.id) void push(); else if (user) setStatus("synced"); });
  window.addEventListener("offline", () => { if (user) setStatus("offline"); });
  supabase.auth.onAuthStateChange((event, session) => {
    const next = session?.user ?? null;
    const changed = next?.id !== user?.id;
    user = next;
    ready = true;
    if (next && changed) setTimeout(() => void onSignIn(next), 0);
    if (event === "SIGNED_OUT") { migration = null; status = "idle"; replaceState({}); } // cloud data stays untouched
    emit();
  });
}

function useSnapshot() {
  useEffect(startSync, []);
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => snapshot,
    () => snapshot,
  );
}

/** undefined = still checking the session, null = signed out. */
export const useAuthUser = () => useSnapshot().user;
export const useSyncStatus = () => useSnapshot().status;
export const useMigration = () => useSnapshot().migration;
