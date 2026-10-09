# Outcome — mobile-review-modal-layout

## What was built
Mobile review header undo is icon-only (`setIcon` Lucide `undo-2` → `undo`) with `aria-label`; desktop keeps text + ⌫. Compact `.er-btn-undo-icon` styles. Unit tests cover mobile/desktop. Modal `100vh` height left unchanged per product decision.

## Signed decision
- Height: do not change full-screen mobile modal.
- Header: recommendation A — icon-only undo on mobile, single-row header.
- Scope: shared `mountReviewHeader` (modal + review view); no height CSS edits.

## What changed across GAN rounds
Single round: generator implemented; evaluator passed with no claims; dual sign-off.

## Residual risks
- Very narrow titles may still ellipsis beside close-button padding (accepted).
- Lucide icon missing in exotic Obsidian builds → second `setIcon('undo')` only; no glyph fallback.
- Shared mock `setIconCalls` unused by header suite (local virtual mock is harness).

## Rejected alternatives
- Content-sized / hybrid modal height.
- Two-row header or moving undo out of `titleEl`.

## Verify
- `npm test`
- `npm run build`
- Manual: enable Undo; open mobile review; confirm icon undo and readable title.

## Suggested next step
Merge PR https://github.com/GenoZhou/easy-recall/pull/2 after mobile smoke check with Undo enabled.
