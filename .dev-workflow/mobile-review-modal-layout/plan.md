# Plan — mobile-review-modal-layout

Status: ready

## Goal
Fix mobile review header crowding where title and undo text button fight for space (1.2.33 regression). Do **not** change mobile modal full-height behavior.

## Constraints
- Keep `height: 100vh` / flex card layout on mobile modal unchanged.
- Desktop undo label stays `撤回上个 ⌫` / `Undo last ⌫`.
- Undo remains in `titleEl` single-row header (shared `mountReviewHeader`).
- Accessibility: visible control + existing `aria-label` (`撤回上一次评分` / equivalent EN).
- Backward compatible: setting `enableUndo` still gates the control.

## Approach
1. In `mountReviewHeader`, when `Platform.isMobile` and undo enabled: render an icon-only button via Obsidian `setIcon` (e.g. `undo-2` or `undo`), no visible text; keep `aria-label`.
2. Add compact CSS for icon-only undo (square padding, no text width) under existing `.er-btn-undo` / optional modifier class.
3. Update `review-header.test.ts`: mobile expects empty/icon mount (no `撤回上个` text); desktop expectations unchanged.
4. Do not touch height-related rules in `@media (max-width: 768px)` for `.er-review-modal`.

## Steps (tracer bullet)
1. Change `src/ui/review-header.ts` mobile undo rendering + class hook.
2. Style compact icon button in `styles.css`.
3. Fix/extend unit tests in `src/__tests__/review-header.test.ts`.
4. Run `npm test` and `npm run build`.

## Risks
- Icon name must exist in Obsidian’s Lucide set; if missing, fall back to a single short glyph (e.g. `↩`) still smaller than full label.
- Close-button `padding-right` on title may still truncate long titles on very narrow devices; acceptable residual with icon-only undo.
- Mock `setIcon` in tests must be assertable or at least not throw.

## Rejected
- Changing modal height / content-sized sheet (user closed).
- Moving undo out of header or two-row header (larger UX change than needed).
