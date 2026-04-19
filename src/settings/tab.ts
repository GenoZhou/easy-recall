/**
 * 设置面板 UI
 * 遵循 Obsidian 最佳实践：使用 PluginSettingTab
 */

import { PluginSettingTab, Setting, App } from 'obsidian';
import OBReviewsPlugin from '../main';
import { t, setLanguage, Language } from '../i18n';
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
						setLanguage(newLang === 'auto' ? 'zh' : newLang);
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

		// 重置按钮
		new Setting(containerEl)
			.setName(lang.settings.reset.name)
			.setDesc(lang.settings.reset.desc)
			.addButton(button =>
				button
					.setButtonText(lang.settings.reset.button)
					.setWarning()
					.onClick(async () => {
						await this.plugin.settingsManager.reset();
						this.plugin.settings = this.plugin.settingsManager.get();
						// 刷新界面
						this.display();
					})
			);
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

			containerEl.createEl('h3', { text: lang.settings.stats.overview });
			this.renderStatList(containerEl, [
				[lang.settings.stats.total, stats.total],
				[lang.settings.stats.newCards, stats.newCards],
				[lang.settings.stats.relearningCards, stats.relearningCards],
				[lang.settings.stats.learningCards, stats.learningCards],
				[lang.settings.stats.matureCards, stats.matureCards],
				[lang.settings.stats.dueNow, stats.dueNow],
			]);

			containerEl.createEl('h3', { text: lang.settings.stats.upcoming });
			this.renderStatList(containerEl, [
				[lang.settings.stats.upcoming1d, stats.upcoming1d],
				[lang.settings.stats.upcoming3d, stats.upcoming3d],
				[lang.settings.stats.upcoming7d, stats.upcoming7d],
				[lang.settings.stats.upcoming30d, stats.upcoming30d],
				[lang.settings.stats.later, stats.later],
			]);
		} catch (err) {
			containerEl.empty();
			containerEl.createEl('p', { text: lang.settings.stats.loadFailed });
			error('Failed to render settings stats:', err);
		}
	}

	private renderStatList(containerEl: HTMLElement, rows: Array<[string, number]>): void {
		const listEl = containerEl.createEl('ul');
		rows.forEach(([label, value]) => {
			const itemEl = listEl.createEl('li');
			itemEl.createSpan({ text: `${label}: ` });
			itemEl.createEl('strong', { text: String(value) });
		});
	}
}
