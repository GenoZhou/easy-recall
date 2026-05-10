import { App, Modal, Vault } from 'obsidian';
import { Card } from '../types';
import { t } from '../i18n';
import {
	ReviewOptions,
	ReviewSession,
	buildHeadingPathLabel,
	buildVisibleHeadingPathLabel,
	openCardSource,
} from './review-session';

export interface ReviewModalOptions extends ReviewOptions {}

export { buildHeadingPathLabel, buildVisibleHeadingPathLabel, openCardSource };

export class ReviewModal extends Modal {
	private cards: Card[];
	private vault: Vault;
	private maxCardsPerReview?: number;
	private onComplete?: () => void;
	private hideReviewPathHiddenWords?: boolean;
	private cardContentEl: HTMLElement | null = null;
	private buttonsContainerEl: HTMLElement | null = null;
	private session: ReviewSession | null = null;
	private shouldTriggerComplete: boolean = true;

	constructor(app: App, options: ReviewModalOptions) {
		super(app);
		this.cards = options.cards;
		this.vault = options.vault;
		this.maxCardsPerReview = options.maxCardsPerReview;
		this.onComplete = options.onComplete;
		this.hideReviewPathHiddenWords = options.hideReviewPathHiddenWords;
	}

	onOpen() {
		const lang = t();
		const { contentEl, titleEl } = this;

		contentEl.addClass('obr-review-modal');
		titleEl.setText(lang.review.title);

		this.cardContentEl = contentEl.createDiv({ cls: 'obr-card-content' });
		this.buttonsContainerEl = contentEl.createDiv({ cls: 'obr-buttons' });

		this.session = new ReviewSession(this.app, {
			cards: this.cards,
			vault: this.vault,
			maxCardsPerReview: this.maxCardsPerReview,
			onComplete: this.onComplete,
			hideReviewPathHiddenWords: this.hideReviewPathHiddenWords,
		}, {
			contentEl: this.cardContentEl,
			buttonsEl: this.buttonsContainerEl,
			setTitle: (title) => this.titleEl.setText(title),
			complete: () => this.close(),
			openSource: async (card) => {
				const opened = await openCardSource(this.app, this.vault, card);
				if (opened) {
					this.shouldTriggerComplete = false;
					this.close();
				}
				return opened;
			},
		});
		// Modals own keyboard focus in Obsidian, so Scope is reliable here.
		this.session.registerShortcuts(this.scope);
		void this.session.render();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.session?.dispose();
		this.session = null;
		if (this.onComplete && this.shouldTriggerComplete) {
			this.onComplete();
		}
	}
}
