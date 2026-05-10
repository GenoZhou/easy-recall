/**
 * 设置面板 UI
 * 遵循 Obsidian 最佳实践：使用 PluginSettingTab
 */

import { PluginSettingTab, Setting, App } from 'obsidian';
import OBReviewsPlugin from '../main';
import { t, setLanguage, Language, resolveLanguage } from '../i18n';
import { normalizeReviewBatchSize, ReviewSurface } from './index';
import { scanVault } from '../deck';
import { calculateReviewStats } from './stats';
import type { DailyReviewCount } from './stats';
import { error } from '../utils/';

export class SettingsTab extends PluginSettingTab {
	plugin: OBReviewsPlugin;

	constructor(app: App, plugin: OBReviewsPlugin) {
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

		const statsContainer = containerEl.createDiv({ cls: 'obr-settings-stats' });
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
	}

	private async renderStats(containerEl: HTMLElement): Promise<void> {
		const lang = t();
		containerEl.empty();
		containerEl.createEl('p', { text: lang.settings.stats.loading });

		try {
			const cards = await scanVault(this.plugin.app.vault, this.plugin.app);
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
		const gridEl = containerEl.createDiv({ cls: 'obr-settings-stats-grid' });
		rows.forEach(([label, value, meta]) => {
			const cardEl = gridEl.createDiv({ cls: 'obr-settings-stat-card' });
			cardEl.createDiv({ cls: 'obr-settings-stat-label', text: label });
			cardEl.createDiv({ cls: 'obr-settings-stat-value', text: String(value) });
			if (meta) {
				cardEl.createDiv({ cls: 'obr-settings-stat-meta', text: meta });
			}
		});
	}

	private renderUpcomingChart(containerEl: HTMLElement, rows: DailyReviewCount[]): void {
		const lang = t();
		const maxCount = Math.max(0, ...rows.map(row => row.count));
		const chartEl = containerEl.createDiv({ cls: 'obr-settings-chart' });

		const yAxisEl = chartEl.createDiv({ cls: 'obr-settings-chart-y-axis' });
		yAxisEl.createDiv({ cls: 'obr-settings-chart-axis-title', text: lang.settings.stats.countAxis });
		yAxisEl.createDiv({ cls: 'obr-settings-chart-y-max', text: String(maxCount) });
		yAxisEl.createDiv({ cls: 'obr-settings-chart-y-zero', text: '0' });

		const plotEl = chartEl.createDiv({ cls: 'obr-settings-chart-plot' });
		rows.forEach(row => {
			const barGroupEl = plotEl.createDiv({ cls: 'obr-settings-chart-bar-group' });
			const barEl = barGroupEl.createDiv({ cls: 'obr-settings-chart-bar' });
			const heightPercent = maxCount > 0 ? Math.max(4, Math.round((row.count / maxCount) * 100)) : 0;
			barEl.style.height = `${heightPercent}%`;
			barEl.setAttribute('aria-label', lang.settings.stats.dayCount(row.day, row.count));
			barEl.setAttribute('title', lang.settings.stats.dayCount(row.day, row.count));

			const label = row.day === 1 || row.day % 5 === 0
				? lang.settings.stats.dayShort(row.day)
				: '';
			barGroupEl.createDiv({ cls: 'obr-settings-chart-x-label', text: label });
		});

		containerEl.createDiv({ cls: 'obr-settings-chart-x-axis-title', text: lang.settings.stats.dayAxis });
		if (maxCount === 0) {
			containerEl.createDiv({ cls: 'obr-settings-chart-empty', text: lang.settings.stats.noUpcoming });
		}
	}

	private renderCompactStatList(containerEl: HTMLElement, total: number, rows: Array<[string, string, number]>): void {
		const listEl = containerEl.createDiv({ cls: 'obr-settings-compact-list' });
		rows.forEach(([label, desc, value]) => {
			const rowEl = listEl.createDiv({ cls: 'obr-settings-compact-row' });
			const textEl = rowEl.createDiv({ cls: 'obr-settings-compact-text' });
			textEl.createDiv({ cls: 'obr-settings-compact-label', text: label });
			textEl.createDiv({ cls: 'obr-settings-compact-desc', text: desc });

			const valueEl = rowEl.createDiv({ cls: 'obr-settings-compact-value' });
			valueEl.createEl('strong', { text: String(value) });
			valueEl.createSpan({ text: this.formatPercent(value, total) });
		});
	}

	private getPercent(value: number, total: number): number {
		if (total <= 0) return 0;
		return Math.round((value / total) * 100);
	}

	private formatPercent(value: number, total: number): string {
		return `${this.getPercent(value, total)}%`;
	}
}
