/**
 * 日志工具
 * 遵循 Obsidian 最佳实践：避免生产环境输出不必要日志
 */

/**
 * 调试日志 - 不输出到 console
 */
export function debug(...args: unknown[]): void {
	// no-op
}

/**
 * 信息日志 - 不输出到 console
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
