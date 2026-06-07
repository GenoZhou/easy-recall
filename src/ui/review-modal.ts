import { App, Modal, Vault } from 'obsidian';
import { Card } from '../types';
import { t } from '../i18n';
import {
	ReviewCompletionState,
	ReviewOptions,
	ReviewSession,
	buildHeadingPathLabel,
	openCardSource,
} from './review-session';

export interface ReviewModalOptions extends ReviewOptions {}

export { buildHeadingPathLabel, openCardSource };

export class ReviewModal extends Modal {
	private cards: Card[];
	private vault: Vault;
	private maxCardsPerReview?: number;
	private reloadCards?: () => Promise<Card[]>;
	private onComplete?: () => void;
	private cardContentEl: HTMLElement | null = null;
	private buttonsContainerEl: HTMLElement | null = null;
	private session: ReviewSession | null = null;
	private shouldTriggerComplete: boolean = true;
	private completionState: ReviewCompletionState | null = null;
	private completionNotified: boolean = false;
	private clickToRevealCloze: boolean = false;
	private clickToRevealHardThreshold: number = 50;
	private clickToRevealGoodThreshold: number = 80;

	constructor(app: App, options: ReviewModalOptions) {
		super(app);
		this.cards = options.cards;
		this.vault = options.vault;
		this.maxCardsPerReview = options.maxCardsPerReview;
		this.reloadCards = options.reloadCards;
		this.onComplete = options.onComplete;
		this.clickToRevealCloze = options.clickToRevealCloze ?? false;
		this.clickToRevealHardThreshold = options.clickToRevealHardThreshold ?? 50;
		this.clickToRevealGoodThreshold = options.clickToRevealGoodThreshold ?? 80;
	}

	onOpen() {
		const lang = t();
		const { contentEl, titleEl } = this;

		contentEl.addClass('er-review-modal');
		titleEl.setText(lang.review.title);

		this.cardContentEl = contentEl.createDiv({ cls: 'er-card-content' });
		this.buttonsContainerEl = contentEl.createDiv({ cls: 'er-buttons' });

		this.startSession();
	}

	private startSession(): void {
		if (!this.cardContentEl || !this.buttonsContainerEl) {
			return;
		}

		this.completionState = null;
		this.session?.dispose();
		this.session = new ReviewSession(this.app, {
			cards: this.cards,
			vault: this.vault,
			maxCardsPerReview: this.maxCardsPerReview,
			reloadCards: this.reloadCards,
			onComplete: this.onComplete,
			clickToRevealCloze: this.clickToRevealCloze,
			clickToRevealHardThreshold: this.clickToRevealHardThreshold,
			clickToRevealGoodThreshold: this.clickToRevealGoodThreshold,
		}, {
			contentEl: this.cardContentEl,
			buttonsEl: this.buttonsContainerEl,
			setTitle: (title) => this.titleEl.setText(title),
			complete: (state) => this.renderComplete(state),
			openSource: async (card) => {
				const opened = await openCardSource(this.app, this.vault, card);
				if (opened) {
					this.shouldTriggerComplete = false;
					this.close();
				}
				return opened;
			},
			handleCompleteSpace: () => {
				if (this.completionState && this.completionState.remainingDueCount > 0) {
					void this.reloadAndStartSession();
				} else {
					this.notifyComplete();
					this.close();
				}
			},
		});
		// Modals own keyboard focus in Obsidian, so Scope is reliable here.
		this.session.registerShortcuts(this.scope);
		void this.session.render();
	}

	private renderComplete(state: ReviewCompletionState): void {
		const lang = t();
		this.completionState = state;
		this.cardContentEl?.empty();
		this.buttonsContainerEl?.empty();
		this.titleEl.setText(lang.review.complete.title);
		this.cardContentEl?.createEl('p', { text: lang.notifications.reviewComplete });

		if (state.remainingDueCount > 0) {
			this.cardContentEl?.createEl('p', {
				text: lang.review.complete.remaining(state.remainingDueCount),
				cls: 'er-review-complete-remaining',
			});
		}

		const buttonRow = this.buttonsContainerEl?.createDiv({ cls: 'er-buttons-row' });
		if (state.remainingDueCount > 0) {
			const continueButton = buttonRow?.createEl('button', {
				text: lang.review.complete.continueButton,
				cls: 'er-btn-show mod-cta',
			});
			continueButton?.addEventListener('click', () => {
				void this.reloadAndStartSession();
			});
		}

		const doneButton = buttonRow?.createEl('button', {
			text: lang.review.complete.button,
			cls: state.remainingDueCount > 0 ? 'er-btn-secondary' : 'er-btn-show mod-cta',
		});
		doneButton?.addEventListener('click', () => {
			this.notifyComplete();
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.session?.dispose();
		this.session = null;
		if (this.shouldTriggerComplete && this.completionState?.remainingDueCount === 0) {
			this.notifyComplete();
		}
	}

	private async reloadAndStartSession(): Promise<void> {
		const cards = this.reloadCards
			? await this.reloadCards()
			: this.cards;

		if (cards.length === 0) {
			this.notifyComplete();
			this.close();
			return;
		}

		this.cards = cards;
		this.startSession();
	}

	private notifyComplete(): void {
		if (!this.onComplete || this.completionNotified) {
			return;
		}

		this.completionNotified = true;
		this.onComplete();
	}
}
