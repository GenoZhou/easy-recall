/**
 * 设置面板 UI
 * 遵循 Obsidian 最佳实践：使用 PluginSettingTab
 */

import { PluginSettingTab, Setting, App } from 'obsidian';
import OBReviewsPlugin from '../main';
import { t, setLanguage, Language } from '../i18n';

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
		containerEl.createEl('h2', { text: 'ob-reviews Settings' });

		// 语言设置
		new Setting(containerEl)
			.setName('Language')
			.setDesc('Interface language. Auto will follow Obsidian settings.')
			.addDropdown(dropdown =>
				dropdown
					.addOption('auto', 'Auto')
					.addOption('en', 'English')
					.addOption('zh', '中文')
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

		// 默认难度设置
		new Setting(containerEl)
			.setName('Default Ease')
			.setDesc('Initial ease factor for new cards (130-350). Higher = longer intervals.')
			.addSlider(slider =>
				slider
					.setLimits(130, 350, 5)
					.setValue(this.plugin.settings.defaultEase)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await this.plugin.settingsManager.update({ defaultEase: value });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		// 调试模式
		new Setting(containerEl)
			.setName('Debug Mode')
			.setDesc('Show debug logs in console (requires restart).')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.debugMode)
					.onChange(async (value) => {
						await this.plugin.settingsManager.update({ debugMode: value });
						this.plugin.settings = this.plugin.settingsManager.get();
					})
			);

		// 重置按钮
		new Setting(containerEl)
			.setName('Reset Settings')
			.setDesc('Reset all settings to default values.')
			.addButton(button =>
				button
					.setButtonText('Reset')
					.setWarning()
					.onClick(async () => {
						await this.plugin.settingsManager.reset();
						this.plugin.settings = this.plugin.settingsManager.get();
						// 刷新界面
						this.display();
					})
			);
	}
}
