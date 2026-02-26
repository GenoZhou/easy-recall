/**
 * 命令注册中心
 * 统一注册所有插件命令
 */

import { Plugin } from 'obsidian';
import OBReviewsPlugin from '../main';
import { getStartReviewCommand } from './start-review';
import { getReviewCurrentNoteCommand } from './review-current-note';
import type { CommandContext } from './types';

/**
 * 注册所有命令
 */
export function registerCommands(plugin: OBReviewsPlugin): void {
	const context: CommandContext = {
		plugin,
		app: plugin.app,
	};
	
	// 注册：开始全局复习
	const startReviewCmd = getStartReviewCommand(context);
	plugin.addCommand({
		id: startReviewCmd.id,
		name: startReviewCmd.name,
		callback: startReviewCmd.callback,
		icon: 'ob-reviews',
	});
	
	// 注册：复习当前笔记
	const reviewCurrentCmd = getReviewCurrentNoteCommand(context);
	plugin.addCommand({
		id: reviewCurrentCmd.id,
		name: reviewCurrentCmd.name,
		checkCallback: reviewCurrentCmd.checkCallback,
	});
}
