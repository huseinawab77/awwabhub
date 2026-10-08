import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthForm, signInWithGoogle } from "@/components/awwab/Account";
import { LangSwitch } from "@/components/awwab/ui";
import { AwwabCat } from "@/components/branding/AwwabCat";
import { useT } from "@/lib/awwab/i18n";
import { useAuthUser } from "@/lib/awwab/sync";
import { meta } from "@/lib/awwab/useToday";

export const Route = createFileRoute("/auth")({
  head: () => meta("Masuk — AWWAB", "Masuk atau buat akun AWWAB agar sistem hidupmu tersimpan di semua perangkat."),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const user = useAuthUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) navigate({ to: "/home", replace: true }); }, [user, navigate]);

  const google = async () => {
    setBusy(true); setMsg(null);
    const err = await signInWithGoogle(t);
    setBusy(false);
    if (err) setMsg(err);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4"><LangSwitch /></div>
      <div className="w-full max-w-sm text-center">
        <AwwabCat state="steady" size={140} className="mx-auto" />
        <p className="mt-2 font-display text-3xl font-bold tracking-wide">AWWAB</p>
        <h1 className="mt-4 text-h2">{t("auth.welcome")}</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{t("auth.welcomeSub")}</p>
      </div>
      <div className="surface mt-8 w-full max-w-sm space-y-3 p-6">
        {user === undefined ? (
          <div className="h-24 animate-pulse rounded-lg bg-beige/60" aria-label={t("common.loading")} />
        ) : email ? (
          <>
            <AuthForm />
            <button type="button" className="btn btn-ghost w-full justify-center text-sm" onClick={() => setEmail(false)}>{t("auth.back")}</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary w-full justify-center" onClick={google} disabled={busy}>{busy ? t("auth.busy") : t("auth.google")}</button>
            <button type="button" className="btn btn-soft w-full justify-center" onClick={() => setEmail(true)}>{t("auth.withEmail")}</button>
            {msg && <p className="text-sm text-muted-foreground" role="status">{msg}</p>}
          </>
        )}
      </div>
    </div>
  );
}
