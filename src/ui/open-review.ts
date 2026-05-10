import { App, Vault } from 'obsidian';
import { Card } from '../types';
import { ReviewSurface } from '../settings';
import { ReviewModal } from './review-modal';
import { REVIEW_VIEW_TYPE, ReviewView } from './review-view';

export interface OpenReviewOptions {
	cards: Card[];
	vault: Vault;
	maxCardsPerReview?: number;
	onComplete?: () => void;
	hideReviewPathHiddenWords?: boolean;
}

export async function openReview(
	app: App,
	options: OpenReviewOptions,
	surface: ReviewSurface
): Promise<void> {
	if (surface === 'tab') {
		await openReviewTab(app, options);
		return;
	}

	new ReviewModal(app, options).open();
}

export async function openReviewTab(app: App, options: OpenReviewOptions): Promise<void> {
	let leaf = app.workspace.getLeavesOfType(REVIEW_VIEW_TYPE)[0];

	if (!leaf) {
		leaf = app.workspace.getLeaf('tab');
		await leaf.setViewState({
			type: REVIEW_VIEW_TYPE,
			active: true,
		});
	}

	await app.workspace.revealLeaf(leaf);

	const view = leaf.view;
	if (view instanceof ReviewView) {
		await view.setReview(options);
	}
}
