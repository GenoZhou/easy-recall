import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { t } from '../i18n';
import { ReviewCompletionState, ReviewOptions, ReviewSession, openCardSource } from './review-session';

export const REVIEW_VIEW_TYPE = 'easy-recall-review';

export class ReviewView extends ItemView {
	private cardContentEl: HTMLElement | null = null;
	private buttonsContainerEl: HTMLElement | null = null;
	private titleEl: HTMLElement | null = null;
	private session: ReviewSession | null = null;
	private reviewOptions: ReviewOptions | null = null;
	private onComplete?: () => void;
	private domShortcutsRegistered: boolean = false;
	private shortcutsActive: boolean = false;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return REVIEW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t().review.title;
	}

	async onOpen(): Promise<void> {
		this.renderShell();
	}

	async setReview(options: ReviewOptions): Promise<void> {
		if (!this.cardContentEl || !this.buttonsContainerEl) {
			this.renderShell();
		}

		this.onComplete = options.onComplete;
		this.reviewOptions = options;
		this.session?.dispose();
		this.session = new ReviewSession(this.app, {
			...options,
			clickToRevealCloze: options.clickToRevealCloze,
			clickToRevealHardThreshold: options.clickToRevealHardThreshold,
			clickToRevealGoodThreshold: options.clickToRevealGoodThreshold,
		}, {
			contentEl: this.cardContentEl!,
			buttonsEl: this.buttonsContainerEl!,
			setTitle: (title) => this.setReviewTitle(title),
			complete: (state) => this.completeReview(state),
			openSource: (card) => openCardSource(this.app, options.vault, card, true),
			areShortcutsActive: () => this.shortcutsActive,
		});
		await this.session.render();
		this.contentEl.focus();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
		this.session?.dispose();
		this.session = null;
		this.reviewOptions = null;
	}

	private renderShell(): void {
		const lang = t();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('er-review-view');
		contentEl.tabIndex = -1;
		if (!this.domShortcutsRegistered) {
			// ItemView Scope can miss keys when focus is not owned by the view.
			// Keep tab shortcuts local to the focused review container instead of binding globally.
			this.registerDomEvent(contentEl, 'keydown', (evt: KeyboardEvent) => {
				this.session?.handleShortcutEvent(evt);
			});
			this.registerDomEvent(contentEl, 'click', () => {
				contentEl.focus();
			});
			this.registerDomEvent(contentEl, 'focusin', () => {
				this.setShortcutsActive(true);
			});
			this.registerDomEvent(contentEl, 'focusout', (evt: FocusEvent) => {
				const nextTarget = evt.relatedTarget;
				if (nextTarget instanceof Node && contentEl.contains(nextTarget)) {
					return;
				}
				this.setShortcutsActive(false);
			});
			this.domShortcutsRegistered = true;
		}

		this.titleEl = contentEl.createEl('h2', {
			text: lang.review.title,
			cls: 'er-review-view-title'
		});
		this.cardContentEl = contentEl.createDiv({ cls: 'er-card-content' });
		this.buttonsContainerEl = contentEl.createDiv({ cls: 'er-buttons' });
	}

	private setReviewTitle(title: string): void {
		this.titleEl?.setText(title);
	}

	private setShortcutsActive(active: boolean): void {
		if (this.shortcutsActive === active) {
			return;
		}

		this.shortcutsActive = active;
		void this.session?.render();
	}

	private completeReview(state: ReviewCompletionState): void {
		const lang = t();
		this.cardContentEl?.empty();
		this.buttonsContainerEl?.empty();
		this.setReviewTitle(lang.review.complete.title);
		this.cardContentEl?.createEl('p', { text: lang.notifications.reviewComplete });

		if (state.remainingDueCount > 0) {
			this.cardContentEl?.createEl('p', {
				text: lang.review.complete.remaining(state.remainingDueCount),
				cls: 'er-review-complete-remaining',
			});

			const buttonRow = this.buttonsContainerEl?.createDiv({ cls: 'er-buttons-row' });
			const continueButton = buttonRow?.createEl('button', {
				text: lang.review.complete.continueButton,
				cls: 'er-btn-show mod-cta',
			});
			continueButton?.addEventListener('click', () => this.continueReview());

			const doneButton = buttonRow?.createEl('button', {
				text: lang.review.complete.button,
				cls: 'er-btn-secondary',
			});
			doneButton?.addEventListener('click', () => this.finishReview());
			return;
		}

		this.finishReview();
	}

	private continueReview(): void {
		if (!this.reviewOptions) {
			return;
		}

		void this.reloadAndSetReview();
	}

	private async reloadAndSetReview(): Promise<void> {
		if (!this.reviewOptions) {
			return;
		}

		const cards = this.reviewOptions.reloadCards
			? await this.reviewOptions.reloadCards()
			: this.reviewOptions.cards;

		if (cards.length === 0) {
			this.finishReview();
			return;
		}

		await this.setReview({
			...this.reviewOptions,
			cards,
		});
	}

	private finishReview(): void {
		if (this.onComplete) {
			this.onComplete();
		} else {
			new Notice(t().notifications.reviewComplete, 2000);
		}
	}
}
