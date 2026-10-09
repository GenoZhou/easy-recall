# Questions — mobile-review-modal-layout

### Q1: Mobile modal height model
Status: answered

User: 高度不改了 (keep current full-height / do not change height model). Overrides prior recommendation A.

Answer: Keep existing `height: 100vh` mobile modal behavior; out of scope for this topic.

### Q2: Title vs undo on narrow header
Status: answered

User: 只修这个按钮的问题，按照你推荐来 → A.

Answer: Mobile: icon-only (or shorter) undo control in single-row header; keep `aria-label`; desktop keeps text + ⌫.

### Q3: Scope of height change
Status: answered

User: height not changing → N/A for height. Header undo fix via shared `mountReviewHeader` still applies to modal + review view.

Answer: No height CSS changes. Header/undo compact control shared by Modal and View.
