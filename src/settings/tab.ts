/**
 * 设置面板 UI
 * 遵循 Obsidian 最佳实践：使用 PluginSettingTab
 */

import { PluginSettingTab, Setting, App } from 'obsidian';
import OBReviewsPlugin from '../main';
import { t, setLanguage, Language, resolveLanguage } from '../i18n';
import { scanVault } from '../deck';
import { calculateReviewStats } from './stats';
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
			this.renderCompactStatList(containerEl, stats.total, [
				[lang.settings.stats.upcoming1d, lang.settings.stats.explanations.upcoming1d, stats.upcoming1d],
				[lang.settings.stats.upcoming3d, lang.settings.stats.explanations.upcoming3d, stats.upcoming3d],
				[lang.settings.stats.upcoming7d, lang.settings.stats.explanations.upcoming7d, stats.upcoming7d],
				[lang.settings.stats.upcoming30d, lang.settings.stats.explanations.upcoming30d, stats.upcoming30d],
				[lang.settings.stats.later, lang.settings.stats.explanations.later, stats.later],
			]);
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
