import { Schedule } from './types';

export type ScheduleMutationType = 'insert' | 'replace';

export interface ScheduleMutation {
	type: ScheduleMutationType;
	line: number;
	previousLine?: string;
	nextLine: string;
}

export interface InjectScheduleResult {
	text: string;
	mutation: ScheduleMutation;
}

/**
 * 格式化调度信息为 SR 注释
 * <!--SR:interval,ease,due,reps-->
 */
export function formatSchedule(schedule: Schedule): string {
	const dueISO = schedule.due.toISOString();
	return `<!--SR:${schedule.interval},${schedule.ease},${dueISO},${schedule.reps}-->`;
}

/**
 * 在文本中查找并替换 SR 注释
 * SR 注释放在题目前（lineStart - 1）
 * @param lineStart 卡片起始行号
 * @param scheduleLine SR 注释所在的行号（如果有），用于精确定位
 */
export function injectScheduleWithResult(text: string, schedule: Schedule, lineStart: number, scheduleLine?: number): InjectScheduleResult {
	const lines = text.split('\n');
	const scheduleComment = formatSchedule(schedule);
	
	// 如果有明确的 scheduleLine，直接替换那一行
	if (scheduleLine !== undefined && scheduleLine < lines.length) {
		const line = lines[scheduleLine];
		if (line && line.trim().startsWith('<!--SR:')) {
			lines[scheduleLine] = scheduleComment;
			return {
				text: lines.join('\n'),
				mutation: {
					type: 'replace',
					line: scheduleLine,
					previousLine: line,
					nextLine: scheduleComment,
				},
			};
		}
	}
	
	// 检查 lineStart 前是否已有 SR 注释
	const checkLine = lineStart - 1;
	if (checkLine >= 0) {
		const line = lines[checkLine];
		if (line && line.trim().startsWith('<!--SR:')) {
			// 替换现有注释
			lines[checkLine] = scheduleComment;
			return {
				text: lines.join('\n'),
				mutation: {
					type: 'replace',
					line: checkLine,
					previousLine: line,
					nextLine: scheduleComment,
				},
			};
		}
	}

	// 在 lineStart 前插入新注释
	lines.splice(lineStart, 0, scheduleComment);
	return {
		text: lines.join('\n'),
		mutation: {
			type: 'insert',
			line: lineStart,
			nextLine: scheduleComment,
		},
	};
}

export function injectSchedule(text: string, schedule: Schedule, lineStart: number, scheduleLine?: number): string {
	return injectScheduleWithResult(text, schedule, lineStart, scheduleLine).text;
}

export function revertScheduleMutation(text: string, mutation: ScheduleMutation): { text: string; reverted: boolean } {
	const lines = text.split('\n');
	if (lines[mutation.line] !== mutation.nextLine) {
		return { text, reverted: false };
	}

	if (mutation.type === 'insert') {
		lines.splice(mutation.line, 1);
		return { text: lines.join('\n'), reverted: true };
	}

	if (mutation.previousLine === undefined) {
		return { text, reverted: false };
	}

	lines[mutation.line] = mutation.previousLine;
	return { text: lines.join('\n'), reverted: true };
}

/**
 * 从文本中移除 SR 注释（用于重置卡片）
 */
export function removeSchedule(text: string): string {
	const SR_COMMENT_REGEX = /<!--SR:[\d\.]+,\d+,[^,]+,\d+-->\n?/g;
	return text.replace(SR_COMMENT_REGEX, '');
}
