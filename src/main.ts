import {
	Plugin,
	TFile,
	addIcon,
} from 'obsidian';
import { debug } from './utils/';
import { initLanguage, t } from './i18n';
import { SettingsManager, createSettingsManager, OBReviewsSettings } from './settings';
import { SettingsTab } from './settings/tab';
import { registerCommands } from './commands';
import { executeStartReview } from './commands/start-review';
import type { CommandContext } from './commands/types';

// 插件图标（使用简单的复习卡片图标 SVG）
const REVIEW_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
  <line x1="9" y1="9" x2="15" y2="9"></line>
  <line x1="9" y1="15" x2="15" y2="15"></line>
  <polyline points="12 6 12 3 8 7"></polyline>
</svg>
`;

/**
 * ob-reviews 插件主类
 * 
 * 性能优化说明（符合 Obsidian 最佳实践）：
 * 1. 使用 MetadataCache.on('changed') 监听文件变化，而非轮询
 * 2. 使用 Vault.process() 进行原子性文件操作
 * 3. 延迟加载：不在 onload 时扫描 Vault，首次使用时才扫描
 * 
 * 架构说明：
 * - main.ts 保持最小化，仅负责生命周期管理
 * - 命令逻辑移至 commands/ 目录
 * - 设置管理移至 settings/ 目录
 */
export default class OBReviewsPlugin extends Plugin {
	settingsManager!: SettingsManager;
	settings!: OBReviewsSettings;

	async onload() {
		// 初始化设置
		this.settingsManager = createSettingsManager(this);
		await this.settingsManager.load();
		this.settings = this.settingsManager.get();

		// 初始化语言
		initLanguage(this.settings.language);

		const lang = t();

		// 注册图标
		addIcon('ob-reviews', REVIEW_ICON);

		// 注册所有命令
		registerCommands(this);

		// 注册设置面板
		this.addSettingTab(new SettingsTab(this.app, this));

		// 添加左侧栏图标
		const context: CommandContext = { plugin: this, app: this.app };
		this.addRibbonIcon('ob-reviews', lang.commands.startReview, () => {
			executeStartReview(context);
		});
		
		// 注册文件事件监听（符合 Obsidian 最佳实践）
		this.registerFileEventHandlers();
		
		// 注意：不在启动时扫描 Vault，延迟到第一次使用复习功能时
		// 这是 Obsidian 推荐的做法，避免阻塞插件加载
	}

	onunload() {
		// registerEvent 会自动清理事件监听，无需手动处理
	}

	/**
	 * 注册文件事件处理器
	 */
	private registerFileEventHandlers(): void {
		const lang = t();

		// 使用 MetadataCache.on('changed') 比 Vault.on('modify') 更精准
		// 因为此时 frontmatter 和 tags 已解析完成
		this.registerEvent(
			this.app.metadataCache.on('changed', (file, data, cache) => {
				if (!(file instanceof TFile) || file.extension !== 'md') return;
				
				// 检查是否是复习相关的文件
				const frontmatterTags = cache.frontmatter?.tags || [];
				const inlineTags = (cache.tags || []).map((t: { tag: string }) => t.tag);
				const hasReviewTag = [...frontmatterTags, ...inlineTags].some(
					(tag: string) => typeof tag === 'string' && tag.includes('ob-reviews/')
				);
				
				if (hasReviewTag) {
					debug(lang.notifications.fileChanged(file.path));
				}
			})
		);
		
		// 监听文件删除（清理可能的缓存）
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					debug(`File deleted: ${file.path}`);
				}
			})
		);
		
		// 监听文件重命名（MetadataCache 'changed' 不会触发重命名事件）
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (file instanceof TFile && file.extension === 'md') {
					debug(`File renamed: ${oldPath} -> ${file.path}`);
				}
			})
		);
	}
}
