import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { t } from '../i18n';
import { Rating } from '../types';
import { ReviewOptions, ReviewSession, openCardSource } from './review-session';

export const REVIEW_VIEW_TYPE = 'ob-reviews-review';

export class ReviewView extends ItemView {
	private cardContentEl: HTMLElement | null = null;
	private buttonsContainerEl: HTMLElement | null = null;
	private titleEl: HTMLElement | null = null;
	private session: ReviewSession | null = null;
	private onComplete?: () => void;
	private shortcutsRegistered: boolean = false;

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
		this.session = new ReviewSession(this.app, options, {
			contentEl: this.cardContentEl!,
			buttonsEl: this.buttonsContainerEl!,
			setTitle: (title) => this.setReviewTitle(title),
			complete: () => this.completeReview(),
			openSource: (card) => openCardSource(this.app, options.vault, card, true),
		});
		await this.session.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
		this.session = null;
	}

	private renderShell(): void {
		const lang = t();
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obr-review-view');

		this.titleEl = contentEl.createEl('h2', {
			text: lang.review.title,
			cls: 'obr-review-view-title'
		});
		this.cardContentEl = contentEl.createDiv({ cls: 'obr-card-content' });
		this.buttonsContainerEl = contentEl.createDiv({ cls: 'obr-buttons' });
		this.registerShortcuts();
	}

	private registerShortcuts(): void {
		if (this.shortcutsRegistered) return;
		const scope = this.scope;
		if (!scope) return;

		scope.register([], 'Enter', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.session?.showAnswerAction();
			return false;
		});

		const ratings: Rating[] = [1, 2, 3];
		ratings.forEach(rating => {
			scope.register([], String(rating), (evt: KeyboardEvent) => {
				evt.preventDefault();
				this.session?.rateAction(rating);
				return false;
			});
		});

		this.shortcutsRegistered = true;
	}

	private setReviewTitle(title: string): void {
		this.titleEl?.setText(title);
	}

	private completeReview(): void {
		const lang = t();
		this.cardContentEl?.empty();
		this.buttonsContainerEl?.empty();
		this.setReviewTitle(lang.review.complete.title);
		this.cardContentEl?.createEl('p', { text: lang.notifications.reviewComplete });
		if (this.onComplete) {
			this.onComplete();
		} else {
			new Notice(lang.notifications.reviewComplete, 2000);
		}
	}
}
