/**
 * 日志工具
 * 遵循 Obsidian 最佳实践：提供可控的日志记录
 */

// 调试模式开关（生产环境应设为 false）
let DEBUG = false;

/**
 * 设置调试模式
 */
export function setDebugMode(enabled: boolean): void {
	DEBUG = enabled;
}

/**
 * 调试日志 - 不输出到 console，避免生产环境不必要的日志
 */
export function debug(...args: unknown[]): void {
	// no-op
}

/**
 * 信息日志 - 不输出到 console，避免生产环境不必要的日志
 */
export function info(...args: unknown[]): void {
	// no-op
}

/**
 * 警告日志 - 始终输出
 */
export function warn(...args: unknown[]): void {
	console.warn('[easy-recall]', ...args);
}

/**
 * 错误日志 - 始终输出
 */
export function error(...args: unknown[]): void {
	console.error('[easy-recall]', ...args);
}
