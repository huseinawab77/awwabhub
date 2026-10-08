import { useEffect, useState } from "react";
import { todayKey } from "./dates";

/** Current local date; refreshes when the day changes. Pages render client-side only (AppShell gate). */
export function useToday() {
  const [t, setT] = useState(todayKey);
  useEffect(() => {
    const id = setInterval(() => setT(todayKey()), 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export const meta = (title: string, description: string) => ({
  meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
