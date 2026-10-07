import { Platform } from 'obsidian';
import { t } from '../i18n';
import type { ReviewHeaderState } from './review-session';

export interface ReviewHeaderOptions {
	enableUndo?: boolean;
	onUndo?: () => void;
}

export interface ReviewHeaderControls {
	setHeader(state: ReviewHeaderState): void;
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
		const undoLabel = Platform.isMobile
			? lang.review.undoLast
			: `${lang.review.undoLast} ⌫`;
		undoButton = containerEl.createEl('button', {
			cls: 'er-btn-undo',
			text: undoLabel,
			attr: {
				type: 'button',
				'aria-label': lang.review.undoLastAria,
			},
		});
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
