/**
 * 设置面板 UI
 * 遵循 Obsidian 最佳实践：使用 PluginSettingTab
 */

import { PluginSettingTab, Setting, App } from 'obsidian';
import EasyRecallPlugin from '../main';
import { t, setLanguage, Language, resolveLanguage } from '../i18n';
import { normalizeClickToRevealThreshold, normalizeReviewBatchSize, ReviewSurface } from './index';
import { normalizeDeckTagPrefix } from '../tag-prefix';
import { scanVault } from '../deck';
import { calculateReviewStats } from './stats';
import type { DailyReviewCount } from './stats';
import { error } from '../utils/';

export class SettingsTab extends PluginSettingTab {
	plugin: EasyRecallPlugin;

	constructor(app: App, plugin: EasyRecallPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const lang = t();

		containerEl.empty();

		// 标题
		containerEl.createEl('h2', { text: lang.settings.title });

		// 语言设置
		new Setting(containerEl)
			.setName(lang.settings.language.name)
			.setDesc(lang.settings.language.desc)
			.addDropdown(dropdown =>
				dropdown
					.addOption('auto', lang.settings.language.auto)
					.addOption('en', lang.settings.language.en)
					.addOption('zh', lang.settings.language.zh)
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						const newLang = value as Language;
						await this.plugin.settingsManager.update({ language: newLang });
						this.plugin.settings = this.plugin.settingsManager.get();
						// 立即应用语言变更
						setLanguage(resolveLanguage(newLang));
						// 刷新界面显示
						this.display();
					})
			);

		// 调试模式
		new Setting(containerEl)
			.setName(lang.settings.debug.name)
			.setDesc(lang.settings.debug.desc)
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.debugMode)
					.onChange(async (value) => {
						await this.plugin.settingsManager.update({ debugMode: value });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		new Setting(containerEl)
			.setName(lang.settings.deckTagPrefix.name)
			.setDesc(lang.settings.deckTagPrefix.desc)
			.addText(text =>
				text
					.setPlaceholder(normalizeDeckTagPrefix(undefined))
					.setValue(this.plugin.settings.deckTagPrefix)
					.onChange(async (value) => {
						await this.plugin.settingsManager.update({ deckTagPrefix: value });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		new Setting(containerEl)
			.setName(lang.settings.reviewBatchSize.name)
			.setDesc(lang.settings.reviewBatchSize.desc)
			.addText(text =>
				text
					.setPlaceholder(String(normalizeReviewBatchSize(undefined)))
					.setValue(String(this.plugin.settings.reviewBatchSize))
					.onChange(async (value) => {
						const parsedValue = Number.parseInt(value, 10);
						if (!Number.isFinite(parsedValue) || parsedValue < 1) {
							return;
						}

						await this.plugin.settingsManager.update({ reviewBatchSize: parsedValue });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		new Setting(containerEl)
			.setName(lang.settings.reviewSurface.desktopName)
			.setDesc(lang.settings.reviewSurface.desktopDesc)
			.addDropdown(dropdown =>
				dropdown
					.addOption('modal', lang.settings.reviewSurface.modal)
					.addOption('tab', lang.settings.reviewSurface.tab)
					.setValue(this.plugin.settings.desktopReviewSurface)
					.onChange(async (value) => {
						await this.plugin.settingsManager.update({ desktopReviewSurface: value as ReviewSurface });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		new Setting(containerEl)
			.setName(lang.settings.reviewSurface.mobileName)
			.setDesc(lang.settings.reviewSurface.mobileDesc)
			.addDropdown(dropdown =>
				dropdown
					.addOption('modal', lang.settings.reviewSurface.modal)
					.addOption('tab', lang.settings.reviewSurface.tab)
					.setValue(this.plugin.settings.mobileReviewSurface)
					.onChange(async (value) => {
						await this.plugin.settingsManager.update({ mobileReviewSurface: value as ReviewSurface });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		const statsContainer = containerEl.createDiv({ cls: 'er-settings-stats' });
		new Setting(containerEl)
			.setName(lang.settings.stats.name)
			.setDesc(lang.settings.stats.desc)
			.addButton(button =>
				button
					.setButtonText(lang.settings.stats.refresh)
					.onClick(async () => {
						await this.renderStats(statsContainer);
					})
			);

		void this.renderStats(statsContainer);

		this.renderClickToRevealSettings(containerEl);
	}

	private renderClickToRevealSettings(containerEl: HTMLElement): void {
		const lang = t();
		const clickToRevealContainer = containerEl.createDiv({ cls: 'er-settings-click-reveal' });
		const titleEl = clickToRevealContainer.createDiv({ cls: 'er-settings-click-reveal-title' });
		titleEl.createEl('h3', { text: lang.settings.clickToRevealCloze.title });
		titleEl.createSpan({ text: 'New', cls: 'er-settings-beta-badge' });
		clickToRevealContainer.createEl('p', {
			text: lang.settings.clickToRevealCloze.help,
			cls: 'er-settings-help'
		});

		new Setting(clickToRevealContainer)
			.setName(lang.settings.clickToRevealCloze.name)
			.setDesc(lang.settings.clickToRevealCloze.desc)
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.clickToRevealCloze)
					.onChange(async (value) => {
						await this.plugin.settingsManager.update({ clickToRevealCloze: value });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		new Setting(clickToRevealContainer)
			.setName(lang.settings.clickToRevealCloze.hardThresholdName)
			.setDesc(lang.settings.clickToRevealCloze.hardThresholdDesc)
			.addText(text =>
				text
					.setPlaceholder(String(normalizeClickToRevealThreshold(undefined, 50)))
					.setValue(String(this.plugin.settings.clickToRevealHardThreshold))
					.onChange(async (value) => {
						const parsedValue = Number.parseInt(value, 10);
						if (!Number.isFinite(parsedValue)) {
							return;
						}

						await this.plugin.settingsManager.update({ clickToRevealHardThreshold: parsedValue });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		new Setting(clickToRevealContainer)
			.setName(lang.settings.clickToRevealCloze.goodThresholdName)
			.setDesc(lang.settings.clickToRevealCloze.goodThresholdDesc)
			.addText(text =>
				text
					.setPlaceholder(String(normalizeClickToRevealThreshold(undefined, 80)))
					.setValue(String(this.plugin.settings.clickToRevealGoodThreshold))
					.onChange(async (value) => {
						const parsedValue = Number.parseInt(value, 10);
						if (!Number.isFinite(parsedValue)) {
							return;
						}

						await this.plugin.settingsManager.update({ clickToRevealGoodThreshold: parsedValue });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);
	}

	private async renderStats(containerEl: HTMLElement): Promise<void> {
		const lang = t();
		containerEl.empty();
		containerEl.createEl('p', { text: lang.settings.stats.loading });

		try {
			const cards = await scanVault(this.plugin.app.vault, this.plugin.app, this.plugin.settings.deckTagPrefix);
			const stats = calculateReviewStats(cards);

			containerEl.empty();
			if (stats.total === 0) {
				containerEl.createEl('p', { text: lang.settings.stats.empty });
				return;
			}

			this.renderHighlights(containerEl, [
				[lang.settings.stats.total, stats.total, `${lang.settings.stats.totalDecks} ${stats.totalDecks}`],
				[lang.settings.stats.dueNow, stats.dueNow, this.formatPercent(stats.dueNow, stats.total)],
				[lang.settings.stats.matureCards, stats.matureCards, this.formatPercent(stats.matureCards, stats.total)],
			]);

			containerEl.createEl('h3', { text: lang.settings.stats.upcoming });
			this.renderUpcomingChart(containerEl, stats.upcomingDaily);
		} catch (err) {
			containerEl.empty();
			containerEl.createEl('p', { text: lang.settings.stats.loadFailed });
			error('Failed to render settings stats:', err);
		}
	}

	private renderHighlights(containerEl: HTMLElement, rows: Array<[string, number, string | undefined]>): void {
		const gridEl = containerEl.createDiv({ cls: 'er-settings-stats-grid' });
		rows.forEach(([label, value, meta]) => {
			const cardEl = gridEl.createDiv({ cls: 'er-settings-stat-card' });
			cardEl.createDiv({ cls: 'er-settings-stat-label', text: label });
			cardEl.createDiv({ cls: 'er-settings-stat-value', text: String(value) });
			if (meta) {
				cardEl.createDiv({ cls: 'er-settings-stat-meta', text: meta });
			}
		});
	}

	private renderUpcomingChart(containerEl: HTMLElement, rows: DailyReviewCount[]): void {
		const lang = t();
		const maxCount = Math.max(0, ...rows.map(row => row.count));
		const chartEl = containerEl.createDiv({ cls: 'er-settings-chart' });

		const headerEl = chartEl.createDiv({ cls: 'er-settings-chart-header' });
		headerEl.createDiv({ cls: 'er-settings-chart-axis-title', text: lang.settings.stats.countAxis });
		headerEl.createDiv({ cls: 'er-settings-chart-range', text: lang.settings.stats.onlyDueDates });

		if (rows.length === 0) {
			chartEl.createDiv({ cls: 'er-settings-chart-empty', text: lang.settings.stats.noUpcoming });
			return;
		}

		const bodyEl = chartEl.createDiv({ cls: 'er-settings-chart-body' });
		const yAxisEl = bodyEl.createDiv({ cls: 'er-settings-chart-y-axis' });
		yAxisEl.createDiv({ cls: 'er-settings-chart-y-max', text: String(maxCount) });
		yAxisEl.createDiv({ cls: 'er-settings-chart-y-zero', text: '0' });

		const plotEl = bodyEl.createDiv({ cls: 'er-settings-chart-plot' });
		plotEl.style.gridTemplateColumns = `repeat(${rows.length}, minmax(38px, 1fr))`;
		rows.forEach(row => {
			const barGroupEl = plotEl.createDiv({ cls: 'er-settings-chart-bar-group' });
			const barEl = barGroupEl.createDiv({ cls: 'er-settings-chart-bar' });
			const heightPercent = maxCount > 0 ? Math.max(4, Math.round((row.count / maxCount) * 100)) : 0;
			barEl.style.height = `${heightPercent}%`;
			barEl.setAttribute('aria-label', lang.settings.stats.dateCount(this.formatChartDate(row.date), row.count));

			barGroupEl.createDiv({ cls: 'er-settings-chart-x-label', text: this.formatChartDate(row.date) });
		});

		chartEl.createDiv({ cls: 'er-settings-chart-x-axis-title', text: lang.settings.stats.dayAxis });
	}

	private formatChartDate(dateKey: string): string {
		const [, month, day] = dateKey.split('-');
		return `${Number(month)}/${Number(day)}`;
	}

	private getPercent(value: number, total: number): number {
		if (total <= 0) return 0;
		return Math.round((value / total) * 100);
	}

	private formatPercent(value: number, total: number): string {
		return `${this.getPercent(value, total)}%`;
	}
}
