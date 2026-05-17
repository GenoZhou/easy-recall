/**
 * 命令模块类型定义
 */

import { App, TFile } from 'obsidian';
import EasyRecallPlugin from '../main';

/**
 * 命令上下文
 * 包含插件实例和 App 引用
 */
export interface CommandContext {
	plugin: EasyRecallPlugin;
	app: App;
}

/**
 * 命令回调函数类型
 */
export type CommandCallback = () => void | Promise<void>;

/**
 * 检查回调函数类型
 */
export type CheckCallback = (checking: boolean) => boolean | void;

/**
 * 文件检查回调类型
 */
export type FileCheckCallback = (checking: boolean, file?: TFile) => boolean | void;
