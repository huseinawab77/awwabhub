import { useEffect } from "react";
import type { CatState } from "@/lib/branding/catStates";
import { CAT_IMAGES, AwwabCat } from "./AwwabCat";

export function AwwabWordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display font-semibold tracking-wide ${className}`}>AWWAB</span>;
}

/** Lockup: [cat] AWWAB, or symbol only. */
export function AwwabLogo({ state = "steady", symbolOnly, size = 32, className = "" }: { state?: CatState; symbolOnly?: boolean; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <AwwabCat state={state} size={size} title={symbolOnly ? "AWWAB" : undefined} />
      {!symbolOnly && <AwwabWordmark className="text-2xl" />}
    </span>
  );
}

/** Swaps the browser tab icon — re-runs only when the cat state changes, not on every score change. */
export function useDynamicFavicon(state: CatState) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.type = "image/webp";
    link.href = CAT_IMAGES[state];
  }, [state]);
}
