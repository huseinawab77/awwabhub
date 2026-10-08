import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT, type T } from "@/lib/awwab/i18n";
import { dismissMigration, importLocalData, startFresh, useAuthUser, useMigration, useSyncStatus } from "@/lib/awwab/sync";

/** Human-readable auth errors; never show raw provider messages. */
export function authError(t: T, e: { message?: string | undefined; code?: string | undefined } | null | undefined) {
  const m = `${e?.code ?? ""} ${e?.message ?? ""}`.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid_credentials")) return t("auth.err.invalid");
  if (m.includes("not confirmed") || m.includes("email_not_confirmed")) return t("auth.err.unconfirmed");
  if (m.includes("already") || m.includes("user_already_exists")) return t("auth.err.exists");
  if (m.includes("weak") || m.includes("pwned") || m.includes("password should")) return t("auth.err.weak");
  if (m.includes("invalid") && m.includes("email")) return t("auth.err.email");
  if (m.includes("fetch") || m.includes("network")) return t("auth.err.network");
  return t("auth.err.generic");
}

type Mode = "login" | "signup" | "forgot";

export function AuthForm({ initial = "login" }: { initial?: Mode }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => { setMode(m); setMsg(null); setCanResend(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setCanResend(false);
    if (mode === "forgot") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      return setMsg(error ? authError(t, error) : t("auth.resetSent"));
    }
    if (password.length < 6) return setMsg(t("auth.pwShort"));
    if (mode === "signup" && password !== confirm) return setMsg(t("auth.pwMismatch"));
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() || undefined } },
      });
      setBusy(false);
      if (error) return setMsg(authError(t, error));
      if (data.user && data.user.identities?.length === 0) return setMsg(t("auth.err.exists"));
      if (!data.session) { setCanResend(true); return setMsg(t("auth.checkEmail")); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { setCanResend(error.code === "email_not_confirmed"); return setMsg(authError(t, error)); }
    }
  };

  const resend = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
    setMsg(error ? authError(t, error) : t("auth.resent"));
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.name")}</span>
          <input className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
      )}
      <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.email")}</span>
        <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      {mode !== "forgot" && (
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.password")}</span>
          <input className="field" type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      )}
      {mode === "signup" && (
        <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.confirm")}</span>
          <input className="field" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
      )}
      {mode === "login" && (
        <button type="button" className="text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline" onClick={() => go("forgot")}>{t("auth.forgot")}</button>
      )}
      {msg && <p className="text-sm text-muted-foreground" role="status">{msg}</p>}
      {canResend && <button type="button" className="btn btn-ghost w-full justify-center text-sm" onClick={resend}>{t("auth.resend")}</button>}
      <button className="btn btn-primary w-full justify-center" disabled={busy}>
        {busy ? t("auth.busy") : mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.signup") : t("auth.sendReset")}
      </button>
      <button type="button" className="btn btn-ghost w-full justify-center text-sm" onClick={() => go(mode === "signup" ? "login" : mode === "login" ? "signup" : "login")}>
        {mode === "signup" ? t("auth.toLogin") : mode === "login" ? t("auth.toSignup") : t("auth.back")}
      </button>
    </form>
  );
}

// Google sign-in goes straight through this project's own Supabase (external project; the Lovable broker only serves Lovable Cloud).
export async function signInWithGoogle(t: T): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth` } });
  return error ? authError(t, error) : null;
}

export function SyncBadge() {
  const t = useT();
  const s = useSyncStatus();
  const user = useAuthUser();
  if (!user || s === "idle") return null;
  const label = s === "offline" ? t("sync.offline") : s === "pending" ? t("sync.pending") : s === "syncing" ? t("sync.syncing") : t("sync.synced");
  return <p className="text-xs text-muted-foreground" role="status">{label}</p>;
}

export function MigrationDialog() {
  const t = useT();
  const m = useMigration();
  if (!m) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-labelledby="mig-title">
      <div className="surface w-full max-w-md space-y-4 p-6">
        {m === "ask" || m === "working" ? (
          <>
            <h2 id="mig-title" className="text-h3">{t("mig.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("mig.body")}</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={m === "working"} onClick={importLocalData}>{m === "working" ? t("mig.working") : t("mig.import")}</button>
              <button className="btn btn-soft" disabled={m === "working"} onClick={startFresh}>{t("mig.fresh")}</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="mig-title" className="text-h3">{m === "done" ? t("mig.done") : t("mig.error")}</h2>
            <button className="btn btn-primary" onClick={m === "done" ? dismissMigration : importLocalData}>{m === "done" ? t("mig.ok") : t("mig.import")}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function AccountCard() {
  const t = useT();
  const user = useAuthUser();
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => setName(data?.display_name ?? ""));
  }, [user]);

  if (!user) return null;
  const hasPassword = user.app_metadata?.providers?.includes("email") ?? user.app_metadata?.provider === "email";
  const avatar = user.user_metadata?.["avatar_url"] as string | undefined;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    setNameMsg(error ? t("auth.err.generic") : t("auth.saved"));
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return setPwMsg(t("auth.pwShort"));
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never);
    if (!error) { setCur(""); setPw(""); }
    setPwMsg(error ? authError(t, error) : t("auth.pwSaved"));
  };
  const reset = async () => {
    await supabase.auth.resetPasswordForEmail(user.email ?? "", { redirectTo: `${window.location.origin}/reset-password` });
    setPwMsg(t("auth.resetSent"));
  };

  return (
    <>
      <section className="surface space-y-3 p-5">
        <h2 className="text-h3">{t("auth.profile")}</h2>
        <div className="flex items-center gap-3">
          {avatar ? <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
            : <div className="grid h-12 w-12 place-items-center rounded-full bg-beige text-lg font-bold">{(name || user.email || "?").slice(0, 1).toUpperCase()}</div>}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{t("auth.signedInAs", { e: user.email ?? "" })}</p>
            <SyncBadge />
          </div>
        </div>
        <form onSubmit={saveName} className="flex flex-wrap items-end gap-2">
          <label className="block min-w-0 flex-1"><span className="mb-1 block text-sm font-bold">{t("auth.name")}</span>
            <input className="field" value={name} onChange={(e) => { setName(e.target.value); setNameMsg(null); }} /></label>
          <button className="btn btn-soft">{t("auth.saveName")}</button>
        </form>
        {nameMsg && <p className="text-sm text-muted-foreground" role="status">{nameMsg}</p>}
      </section>

      <section className="surface space-y-3 p-5">
        <h2 className="text-h3">{t("auth.security")}</h2>
        {hasPassword && (
          <form onSubmit={changePw} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.currentPw")}</span>
              <input className="field" type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.newPw")}</span>
              <input className="field" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            <button className="btn btn-soft">{t("auth.changePw")}</button>
          </form>
        )}
        {hasPassword && <button className="text-sm font-semibold text-muted-foreground hover:underline" onClick={reset}>{t("auth.forgot")}</button>}
        {pwMsg && <p className="text-sm text-muted-foreground" role="status">{pwMsg}</p>}
        <div className="border-t pt-3">
          <button className="btn btn-soft" onClick={() => supabase.auth.signOut()}>{t("auth.logout")}</button>
        </div>
      </section>
    </>
  );
}
