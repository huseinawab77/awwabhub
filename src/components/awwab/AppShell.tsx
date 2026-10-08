import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

const PUBLIC_PATHS = ["/auth", "/reset-password"];
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, CalendarCheck, CalendarDays, CalendarRange, Home, Lightbulb, NotebookPen, PenLine, Repeat, Settings, Target } from "lucide-react";
import { useT } from "@/lib/awwab/i18n";
import { LangSwitch } from "./ui";
import { useAuthUser } from "@/lib/awwab/sync";
import { MigrationDialog, SyncBadge } from "./Account";
import { compare } from "@/lib/awwab/calc";
import { periodFor } from "@/lib/awwab/dates";
import { useAppState } from "@/lib/awwab/store";
import { openingDue, openingSlot } from "@/lib/awwab/reminders";
import { useToday } from "@/lib/awwab/useToday";
import { resolveCatState } from "@/lib/branding/catStates";
import { AwwabLogo, useDynamicFavicon } from "@/components/branding/AwwabLogo";
import { MobileNavigation } from "./MobileNavigation";
import { DailyOpening } from "./DailyOpening";

/** Current state of the companion cat, from this week's Life Score (same number Home shows by default). */
export function useCurrentCatState() {
  const state = useAppState();
  const today = useToday();
  const score = compare(periodFor("week", today), state.entries, today, state.habits).current.lifeScore;
  return resolveCatState(score);
}

const NAV = [
  { to: "/home", key: "nav.home", icon: Home },
  { to: "/daily", key: "nav.daily", icon: PenLine },
  { to: "/planner", key: "nav.planner", icon: CalendarCheck },
  { to: "/routines", key: "nav.routines", icon: Repeat },
  { to: "/weekly", key: "nav.weekly", icon: BarChart3 },
  { to: "/monthly", key: "nav.monthly", icon: CalendarRange },
  { to: "/insights", key: "nav.insights", icon: Lightbulb },
  { to: "/goals", key: "nav.goals", icon: Target },
  { to: "/review", key: "nav.review", icon: NotebookPen },
  { to: "/calendar", key: "nav.calendar", icon: CalendarDays },
] as const;

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const t = useT();
  const user = useAuthUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PATHS.includes(pathname);
  // Signed-out visitors go to /auth; undefined means the session is still being checked.
  useEffect(() => { if (!isPublic && mounted && user === null) navigate({ to: "/auth", replace: true }); }, [isPublic, mounted, user, navigate]);
  const cat = useCurrentCatState();
  const appState = useAppState();
  const today = useToday();
  const slot = openingSlot(new Date().getHours());
  useDynamicFavicon(cat);
  // Sign-in pages render full-screen, without the app frame.
  if (isPublic) return mounted ? <>{children}</> : null;
  if (mounted && user && openingDue(appState.lastOpeningDate, appState.lastOpeningSlot, today, slot)) return <DailyOpening user={user} today={today} slot={slot} />;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-cream px-4 py-8 md:flex">
        <Link to="/home" className="mb-10 px-3">
          <AwwabLogo state={cat} size={36} />
          <span className="block text-xs text-muted-foreground">{t("app.tagline")}</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {[...NAV, { to: "/settings", key: "nav.settings", icon: Settings } as const].map(({ to, key, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-beige hover:text-foreground"
              activeProps={{ className: "bg-beige !text-foreground" }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-3">{mounted && <LangSwitch />}</div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-cream/95 px-4 py-2 backdrop-blur md:hidden">
        <Link to="/home" aria-label="AWWAB"><AwwabLogo state={cat} size={28} /></Link>
        <div className="flex items-center gap-2">
          {mounted && <LangSwitch />}
          <Link to="/settings" className="btn btn-ghost !p-2" aria-label={t("nav.settings")} activeProps={{ className: "bg-beige" }}>
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 md:pb-16 md:pt-10">
        <div className="mx-auto max-w-4xl">
          {mounted && user ? children : <div className="h-64 animate-pulse rounded-xl bg-beige/60" aria-label={t("common.loading")} />}
        </div>
      </main>
      {user && <div className="fixed right-3 top-14 z-30 rounded-full bg-cream/90 px-3 py-1 md:top-3"><SyncBadge /></div>}
      {user && <MigrationDialog />}

      <MobileNavigation />
    </div>
  );
}
