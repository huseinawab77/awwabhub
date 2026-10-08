import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authError } from "@/components/awwab/Account";
import { AwwabCat } from "@/components/branding/AwwabCat";
import { useT } from "@/lib/awwab/i18n";
import { meta } from "@/lib/awwab/useToday";

export const Route = createFileRoute("/reset-password")({
  head: () => meta("Atur ulang kata sandi — AWWAB", "Buat kata sandi baru untuk akun AWWAB kamu."),
  component: ResetPage,
});

function ResetPage() {
  const t = useT();
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const recovery = window.location.hash.includes("type=recovery") || window.location.search.includes("code=");
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setOk(true); });
    void supabase.auth.getSession().then(({ data: s }) => setOk(recovery || !!s.session));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return setMsg(t("auth.pwShort"));
    if (pw !== confirm) return setMsg(t("auth.pwMismatch"));
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg(authError(t, error));
    setMsg(t("auth.pwSaved"));
    setTimeout(() => navigate({ to: "/home", replace: true }), 900);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <AwwabCat state="waking" size={110} />
      <div className="surface mt-6 w-full max-w-sm space-y-3 p-6">
        <h1 className="text-h3">{t("auth.resetTitle")}</h1>
        {ok === false ? <p className="text-sm text-muted-foreground">{t("auth.resetInvalid")}</p> : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.newPw")}</span>
              <input className="field" type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("auth.confirm")}</span>
              <input className="field" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
            {msg && <p className="text-sm text-muted-foreground" role="status">{msg}</p>}
            <button className="btn btn-primary w-full justify-center">{t("auth.setPw")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
