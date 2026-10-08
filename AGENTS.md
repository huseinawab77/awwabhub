<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## AWWAB architecture
- All scoring formulas live in `src/lib/awwab/calc.ts` (pure functions); UI never computes scores — single source of truth per spec.
- Life Score is a non-renormalized sum (domain weight × activity weight × performance), starting at 0; missing data adds 0 but is never a failure, so sparse data cannot inflate it. The progress chart uses `lifeScoreAsOf` (rolling 7 days, entries on/before the date) so later entries never rewrite past days.
- Activity/domain config (`src/lib/awwab/config.ts`) is the only place targets and weights are defined; targets are versioned by `effectiveFrom` so history won't silently change.
- Data persists locally via `src/lib/awwab/store.ts` (raw input only: null = no data, false = not done, 0 = zero); when signed in, `sync.ts` mirrors the whole state as one JSON row per user in `user_state` (account wins on sign-in) — simplest way to keep progress across devices.
- Insights are deterministic (`insights.ts`), never AI.
- Pages render client-side only (AppShell mount gate) because they depend on local date and localStorage.
- `noUncheckedIndexedAccess` is off: config lookups by known IDs made it pure noise.
- Cat mascot state comes only from `resolveCatState()` in `src/lib/branding/catStates.ts`, fed by the existing Life Score (current week); `AwwabCat` maps five states to normalized illustration assets, shared with the dynamic favicon to keep branding consistent.
- Planner items (`plannerItems` in AppState, derivations in `src/lib/awwab/planner.ts`) record intention only; they never write tracking entries or feed calc.ts, so plans cannot inflate Life Score.
- Mobile navigation is isolated in `MobileNavigation` with primary links and a controlled overflow popover; desktop navigation remains in AppShell so mobile simplification does not change desktop access.
- Routines (`routines`/`routineExceptions` in AppState, derivations in `src/lib/awwab/routines.ts`) are templates; occurrences are computed, never stored, and per-date exceptions override them. "This and future" edits split the routine at a date so the past is never rewritten; routines never feed calc.ts.
- Routine weekday details are optional raw template fields resolved by `routineDetailsOn` using the original scheduled date; occurrence detail overrides apply to one date, so rescheduling preserves its content and legacy routines retain general details.
- Daily Opening content lives only in `src/lib/awwab/quotes.data.json` (famous quotes from great figures, picked by local date + opening slot via `reminders.ts`); it shows up to three times per day (morning/afternoon/evening), seen-state is `lastOpeningDate`+`lastOpeningSlot` in AppState so it syncs like everything else and never feeds calc.ts.
