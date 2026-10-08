import { resolveCatState, type CatState } from "@/lib/branding/catStates";
import resting from "@/assets/awwab-resting.webp";
import waking from "@/assets/awwab-waking.webp";
import steady from "@/assets/awwab-steady.webp";
import growing from "@/assets/awwab-growing.webp";
import thriving from "@/assets/awwab-thriving.webp";

export const CAT_IMAGES: Record<CatState, string> = { resting, waking, steady, growing, thriving };
const SIZES = { xs: 24, sm: 32, md: 96, lg: 144 } as const;

export function AwwabCat({ lifeScore, state, size = "md", className = "", title }: {
  lifeScore?: number | null; state?: CatState; size?: keyof typeof SIZES | number; className?: string; title?: string | undefined;
}) {
  const s = state ?? resolveCatState(lifeScore);
  const px = typeof size === "number" ? size : SIZES[size];
  return <img src={CAT_IMAGES[s]} width={px} height={px} alt={title ?? ""} aria-hidden={title ? undefined : true} data-cat-state={s} className={`object-contain ${className}`} draggable={false} />;
}

export function AwwabAppIcon({ lifeScore, state, size = 64 }: { lifeScore?: number | null; state?: CatState; size?: number }) {
  return <AwwabCat state={state ?? resolveCatState(lifeScore)} size={size} className="rounded-lg bg-cat-tile" />;
}