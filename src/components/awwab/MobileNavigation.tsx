import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, CalendarCheck, CalendarDays, CalendarRange, Home, Lightbulb, MoreHorizontal, NotebookPen, PenLine, Repeat, Settings, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/lib/awwab/i18n";

const PRIMARY = [
  { to: "/home", key: "nav.home", icon: Home },
  { to: "/daily", key: "nav.daily", icon: PenLine },
  { to: "/calendar", key: "nav.calendar", icon: CalendarDays },
  { to: "/monthly", key: "nav.monthly", icon: CalendarRange },
  { to: "/goals", key: "nav.goals", icon: Target },
] as const;

const MORE = [
  { to: "/planner", key: "nav.planner", icon: CalendarCheck },
  { to: "/routines", key: "nav.routines", icon: Repeat },
  { to: "/weekly", key: "nav.weekly", icon: BarChart3 },
  { to: "/insights", key: "nav.insights", icon: Lightbulb },
  { to: "/review", key: "nav.review", icon: NotebookPen },
  { to: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function MobileNavigation() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some(({ to }) => pathname === to);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <nav aria-label={t("nav.mobile")} className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t bg-cream/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {PRIMARY.map(({ to, key, icon: Icon }) => (
        <Link key={to} to={to} className="flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-bold text-muted-foreground transition-colors hover:bg-beige focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" activeProps={{ className: "bg-beige/50 !text-foreground", "aria-current": "page" }}>
          <Icon className="h-5 w-5 shrink-0" />
          <span className="w-full text-center">{t(key)}</span>
        </Link>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className={`h-16 min-w-0 flex-col gap-1 px-0 text-[10px] font-bold [&_svg]:size-5 ${moreActive || open ? "bg-beige/50 text-foreground" : "text-muted-foreground"}`}>
            <MoreHorizontal />
            <span>{t("nav.more")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" sideOffset={12} aria-label={t("nav.more")} className="w-56 max-w-[calc(100vw-1rem)] p-2 shadow-soft md:hidden motion-reduce:animate-none">
          <p className="px-3 py-2 text-xs font-bold text-muted-foreground">{t("nav.more")}</p>
          <nav aria-label={t("nav.more")} className="flex flex-col gap-1">
            {MORE.map(({ to, key, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-beige hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" activeProps={{ className: "bg-beige !text-foreground", "aria-current": "page" }}>
                <Icon className="h-5 w-5 shrink-0" />
                {t(key)}
              </Link>
            ))}
          </nav>
        </PopoverContent>
      </Popover>
    </nav>
  );
}