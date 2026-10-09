# Generate manifest — mobile-review-modal-layout

Status: ready

## Summary
Mobile review header undo is icon-only (`setIcon` undo-2 → undo fallback) with `er-btn-undo-icon` CSS; desktop label unchanged. Modal `height: 100vh` rules untouched.

## Files
- src/ui/review-header.ts
- styles.css
- src/__tests__/review-header.test.ts
- src/__mocks__/obsidian.ts

## Verify
- `npx jest src/__tests__/review-header.test.ts` — pass
- `npm test` — 241 pass
- `npm run build` — pass
