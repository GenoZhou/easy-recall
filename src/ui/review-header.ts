import { Platform, setIcon } from 'obsidian';
import { t } from '../i18n';
import type { ReviewHeaderState } from './review-session';

export interface ReviewHeaderOptions {
	enableUndo?: boolean;
	onUndo?: () => void;
}

export interface ReviewHeaderControls {
	setHeader(state: ReviewHeaderState): void;
}

/** Prefer Lucide `undo-2`; fall back to `undo` if the SVG did not mount. */
function mountUndoIcon(button: HTMLElement): void {
	setIcon(button, 'undo-2');
	if (!button.querySelector('svg')) {
		setIcon(button, 'undo');
	}
}

/** Empties `containerEl` and mounts title + optional undo control. */
export function mountReviewHeader(
	containerEl: HTMLElement,
	options: ReviewHeaderOptions = {}
): ReviewHeaderControls {
	const lang = t();
	const enableUndo = options.enableUndo === true;
	containerEl.empty();
	containerEl.classList.add('er-review-header');

	const titleEl = containerEl.createSpan({
		cls: 'er-review-header-title',
		text: lang.review.title,
	});

	let undoButton: HTMLButtonElement | null = null;
	if (enableUndo) {
		const useIconOnly = Platform.isMobile;
		undoButton = containerEl.createEl('button', {
			cls: useIconOnly ? 'er-btn-undo er-btn-undo-icon' : 'er-btn-undo',
			text: useIconOnly ? undefined : `${lang.review.undoLast} ⌫`,
			attr: {
				type: 'button',
				'aria-label': lang.review.undoLastAria,
			},
		});
		if (useIconOnly) {
			mountUndoIcon(undoButton);
		}
		undoButton.disabled = true;
		undoButton.addEventListener('click', () => {
			options.onUndo?.();
		});
	}

	return {
		setHeader(state: ReviewHeaderState): void {
			titleEl.textContent = state.title;
			if (undoButton) {
				undoButton.disabled = !state.canUndo;
			}
		},
	};
}
