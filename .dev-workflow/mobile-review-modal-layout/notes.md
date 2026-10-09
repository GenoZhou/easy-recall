# Notes — mobile-review-modal-layout

## Explore digest (2026-10-07)

- Screenshot: mobile bottom-sheet review modal; huge empty white under short cloze; title `复习卡片 (1/…` truncated beside `撤回上个` + close X.
- Key files: `styles.css` (`@media max-width:768px` `.er-review-modal`), `src/ui/review-modal.ts` (`er-review-modal-host` on `modalEl`), `src/ui/review-header.ts` (`mountReviewHeader` into `titleEl`).
- Full height: mobile rule sets `.er-review-modal { height/max-height: 100vh }` + `.er-card-content { flex: 1 }` — intentional comment 「移动端全高显示」. Present on **1.2.32** already; 1.2.33 only added `overflow: hidden` and retargeted title selectors to `.er-review-modal-host`.
- Pre-1.2.33 selectors `.er-review-modal .modal-title` / `.modal-content` never matched (title/content are siblings; class is on contentEl). Host class made title padding/border actually apply.
- Header fight: **1.2.33** (`22492ed`) put undo text button in `titleEl` flex row; title has ellipsis; undo `flex-shrink:0`; `padding-right` clears close X → narrow phones truncate title.
- Tests cover DOM/labels only; no CSS height/layout assertions.
- Unknown: whether user perceived content-sized modals via Obsidian theme/chrome vs CSS; product may want to abandon intentional full-height.

## Risks
- Dropping `100vh` needs sticky footer strategy for long cards / rating buttons.
- Header fix must keep close-button clearance and a11y for undo.
