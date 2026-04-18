import { Card, CardType, Schedule } from './types';

// 挖空检测：==内容==
const CLOZE_REGEX = /==([^=]+)==/g;

// 标签检测：#ob-reviews/xxxx 格式（支持中文和Unicode字符）
const DECK_TAG_REGEX = /#ob-reviews\/([^\s#]+)/;

// SR 注释格式：<!--SR:interval,ease,due,reps-->
const SR_COMMENT_REGEX = /<!--SR:(\d+\.?\d*),(\d+),([^,]+),(\d+)-->/;

// Hint callout 检测：> [!hint]
const HINT_CALLOUT_REGEX = /^> \[!hint\]/i;

// 标题检测：# 标题 到 ###### 标题
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

/**
 * 从文本中提取调度信息
 * 包含数据验证，确保解析出的日期有效
 */
export function extractSchedule(text: string): Schedule | null {
	const match = text.match(SR_COMMENT_REGEX);
	if (!match) return null;

	const interval = parseFloat(match[1]);
	const ease = parseInt(match[2], 10);
	const due = new Date(match[3]);
	const reps = parseInt(match[4], 10);

	// 验证日期有效性（符合最佳实践：防御性编程）
	if (isNaN(due.getTime())) {
		console.warn('[ob-reviews] Invalid date in SR comment:', match[3]);
		return null;
	}

	// 验证数值范围
	if (isNaN(interval) || isNaN(ease) || isNaN(reps)) {
		console.warn('[ob-reviews] Invalid numeric values in SR comment');
		return null;
	}

	return { interval, ease, due, reps };
}

/**
 * 从文本中提取卡组标签（#ob-reviews/xxxx 中的 xxxx）
 * 返回 xxxx 部分，如果没有则返回 null
 */
export function extractDeckTag(text: string): string | null {
	const match = text.match(DECK_TAG_REGEX);
	return match ? match[1] : null; // 返回捕获组中的 xxxx
}

/**
 * 生成卡片唯一 ID
 */
function generateCardId(filePath: string, lineStart: number, type: CardType, index: number): string {
	return `${filePath}:${lineStart}:${type}:${index}`;
}

/**
 * 检查文本是否包含挖空
 */
export function hasCloze(text: string): boolean {
	CLOZE_REGEX.lastIndex = 0;
	return CLOZE_REGEX.test(text);
}

/**
 * 获取挖空内容（用于答案显示）
 */
export function extractClozeAnswers(text: string): string {
	const answers: string[] = [];
	let match;
	CLOZE_REGEX.lastIndex = 0;
	while ((match = CLOZE_REGEX.exec(text)) !== null) {
		answers.push(match[1].trim());
	}
	return answers.join(' / ');
}

/**
 * 从 YAML frontmatter 的 tags 中提取卡组标签
 * 格式: ---\ntags:\n  - ob-reviews/xxxx\n---
 */
function extractYamlDeckTag(content: string): string | null {
	// 匹配 YAML frontmatter
	const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
	if (!yamlMatch) return null;
	
	const yaml = yamlMatch[1];
	// 匹配 tags: 下的 ob-reviews/xxxx 格式
	const tagMatch = yaml.match(/tags:\s*\n([\s\S]*?)(?:\n\w|$)/);
	if (tagMatch) {
		const tagsSection = tagMatch[1];
		// 匹配每个标签项 - ob-reviews/xxxx（支持中文和Unicode字符）
		const obReviewMatch = tagsSection.match(/-\s*ob-reviews\/([^\s#]+)/);
		if (obReviewMatch) {
			return obReviewMatch[1]; // 返回 xxxx 部分
		}
	}
	return null;
}

function getFrontmatterEndLine(lines: string[]): number | null {
	if (lines.length < 2 || lines[0].trim() !== '---') {
		return null;
	}

	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === '---') {
			return i;
		}
	}

	return null;
}

/**
 * 从文件内容提取文件级别的卡组标签（#ob-reviews/xxxx 或 YAML frontmatter 中的 xxxx）
 */
export function extractFileDeckTag(content: string): string | null {
	// 先尝试从 YAML frontmatter 提取
	const yamlTag = extractYamlDeckTag(content);
	if (yamlTag) return yamlTag;
	
	// 再尝试从正文中的 #ob-reviews/xxxx 提取
	const lines = content.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		// 跳过空行、注释和 YAML 分隔符
		if (!line || line.startsWith('<!--') || line === '---') continue;
		
		// 遇到第二个 --- 说明 frontmatter 结束，开始正文搜索
		if (i > 0 && line === '---') {
			// 继续搜索正文中的标签
			for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
				const bodyLine = lines[j].trim();
				if (!bodyLine || bodyLine.startsWith('<!--')) continue;
				
				const tag = extractDeckTag(bodyLine);
				if (tag) return tag;
			}
			break;
		}
		
		const tag = extractDeckTag(line);
		if (tag) return tag;
	}
	return null;
}

/**
 * 从 block 末尾提取 hint callout
 * @returns hint 文本和有效内容结束索引（不包含 hint）
 */
function extractHintFromBlock(blockLines: string[], searchStart: number): { hint: string | null; contentEndIndex: number } {
	for (let i = searchStart; i < blockLines.length; i++) {
		if (HINT_CALLOUT_REGEX.test(blockLines[i])) {
			// 验证从 i 开始到 block 结束的所有行都是 callout 行
			let valid = true;
			for (let j = i; j < blockLines.length; j++) {
				const trimmed = blockLines[j].trimStart();
				if (!(trimmed.startsWith('> ') || trimmed === '>')) {
					valid = false;
					break;
				}
			}
			if (valid) {
				return {
					hint: blockLines.slice(i).join('\n'),
					contentEndIndex: i - 1
				};
			}
		}
	}
	return { hint: null, contentEndIndex: blockLines.length - 1 };
}

/**
 * 尝试将 block 解析为 QA 卡片
 */
function tryParseQABlock(
	blockLines: string[],
	startLine: number,
	filePath: string,
	cardIndex: number,
	fileTags: string[],
	headingPath: string[]
): Card | null {
	if (blockLines.length < 2) return null;

	const firstLine = blockLines[0].trim();

	// 情况 1：? 在行尾
	if ((firstLine.endsWith('?') || firstLine.endsWith('？')) && firstLine.length > 1) {
		const question = firstLine.slice(0, -1).trim();
		const { hint, contentEndIndex } = extractHintFromBlock(blockLines, 1);
		const answerLines = blockLines.slice(1, contentEndIndex + 1);
		const answer = answerLines.join('\n').trim();
		const contentLines = blockLines.slice(0, contentEndIndex + 1);
		const content = contentLines.map(l => l.trim()).join('\n');

		return {
			id: generateCardId(filePath, startLine, 'qa', cardIndex),
			type: 'qa',
			content,
			question,
			answer,
			hint: hint || undefined,
			tags: [...fileTags],
			filePath,
			lineStart: startLine,
			lineEnd: startLine + blockLines.length - 1,
			headingPath: headingPath.length > 0 ? [...headingPath] : undefined,
		};
	}

	// 情况 2：? 单独一行
	if (blockLines.length >= 2) {
		const secondLine = blockLines[1].trim();
		if (secondLine === '?' || secondLine === '？') {
			if (blockLines.length < 3) return null;
			const question = firstLine;
			const { hint, contentEndIndex } = extractHintFromBlock(blockLines, 2);
			const answerLines = blockLines.slice(2, contentEndIndex + 1);
			const answer = answerLines.join('\n').trim();
			const contentLines = blockLines.slice(0, contentEndIndex + 1);
			const content = contentLines.map(l => l.trim()).join('\n');

			return {
				id: generateCardId(filePath, startLine, 'qa', cardIndex),
				type: 'qa',
				content,
				question,
				answer,
				hint: hint || undefined,
				tags: [...fileTags],
				filePath,
				lineStart: startLine,
				lineEnd: startLine + blockLines.length - 1,
				headingPath: headingPath.length > 0 ? [...headingPath] : undefined,
			};
		}
	}

	return null;
}

/**
 * 尝试将 block 解析为 Cloze 卡片
 */
function tryParseClozeBlock(
	blockLines: string[],
	startLine: number,
	filePath: string,
	cardIndex: number,
	fileTags: string[],
	headingPath: string[]
): Card | null {
	const hasAnyCloze = blockLines.some(line => hasCloze(line));
	if (!hasAnyCloze) return null;

	const { hint, contentEndIndex } = extractHintFromBlock(blockLines, 0);
	const contentLines = blockLines.slice(0, contentEndIndex + 1);
	const content = contentLines.map(l => l.trim()).join('\n');

	return {
		id: generateCardId(filePath, startLine, 'cloze', cardIndex),
		type: 'cloze',
		content,
		answer: extractClozeAnswers(content),
		hint: hint || undefined,
		tags: [...fileTags],
		filePath,
		lineStart: startLine,
		lineEnd: startLine + blockLines.length - 1,
		headingPath: headingPath.length > 0 ? [...headingPath] : undefined,
	};
}

/**
 * 解析一个 block 为卡片
 */
function parseBlock(
	blockLines: string[],
	startLine: number,
	filePath: string,
	cardIndex: number,
	fileTags: string[],
	headingPath: string[]
): Card | null {
	const qaCard = tryParseQABlock(blockLines, startLine, filePath, cardIndex, fileTags, headingPath);
	if (qaCard) return qaCard;

	const clozeCard = tryParseClozeBlock(blockLines, startLine, filePath, cardIndex, fileTags, headingPath);
	if (clozeCard) return clozeCard;

	return null;
}

/**
 * 解析单条笔记内容，提取所有卡片
 * 所有卡片共享文件级别的标签（#ob-reviews/xxxx 中的 xxxx）
 * 如果没有找到 ob-reviews/xxx 标签，返回空数组（不解析该文件）
 * 
 * 解析规则：卡片之间必须有空行分隔。一个卡片 = 一个非空文本块（block）。
 */
export function parseNote(content: string, filePath: string): Card[] {
	const cards: Card[] = [];
	const lines = content.split('\n');

	// 提取文件级别的标签（所有卡片共享）
	const deckTag = extractFileDeckTag(content);
	if (!deckTag) {
		return [];
	}
	const fileTags = [deckTag];

	const frontmatterEndLine = getFrontmatterEndLine(lines);
	let lineIndex = frontmatterEndLine !== null ? frontmatterEndLine + 1 : 0;
	let cardIndex = 0;
	const currentHeadingPath: string[] = [];
	let pendingSchedule: Schedule | null = null;
	let pendingScheduleLine: number | undefined = undefined;

	/**
	 * 收集一个 block：从 startIndex 开始，直到遇到空行、注释行、标题或文件结束
	 */
	function collectBlock(startIndex: number): { blockLines: string[]; endIndex: number } {
		let i = startIndex;
		while (i < lines.length) {
			const line = lines[i];
			const trimmed = line.trim();
			if (trimmed === '' || trimmed.startsWith('<!--') || HEADING_REGEX.test(line)) {
				break;
			}
			i++;
		}
		return { blockLines: lines.slice(startIndex, i), endIndex: i - 1 };
	}

	while (lineIndex < lines.length) {
		const line = lines[lineIndex];
		const trimmedLine = line.trim();

		// 检测标题并更新路径
		const headingMatch = line.match(HEADING_REGEX);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const title = headingMatch[2].trim();
			currentHeadingPath.length = level - 1;
			currentHeadingPath[level - 1] = title;
			lineIndex++;
			pendingSchedule = null;
			continue;
		}

		// 跳过空行和非 SR 注释
		if (!trimmedLine || (trimmedLine.startsWith('<!--') && !trimmedLine.startsWith('<!--SR:'))) {
			lineIndex++;
			pendingSchedule = null;
			continue;
		}

		// 记录 SR 注释（仅当它紧接在下一个卡片 block 之前时才生效）
		if (trimmedLine.startsWith('<!--SR:')) {
			pendingSchedule = extractSchedule(line);
			pendingScheduleLine = lineIndex;
			lineIndex++;
			continue;
		}

		// 收集当前 block
		const { blockLines, endIndex } = collectBlock(lineIndex);
		if (blockLines.length === 0) {
			lineIndex++;
			pendingSchedule = null;
			continue;
		}

		// 解析 block
		const card = parseBlock(blockLines, lineIndex, filePath, cardIndex, fileTags, currentHeadingPath);
		if (card) {
			if (pendingSchedule !== null) {
				card.schedule = pendingSchedule;
				card.scheduleLine = pendingScheduleLine;
			}
			cards.push(card);
			cardIndex++;
		}

		lineIndex = endIndex + 1;
		pendingSchedule = null;
	}

	return cards;
}

/**
 * 渲染 Cloze 卡片内容（将 ==文本== 替换为可隐藏的 span）
 * @param showAnswer 是否显示答案
 */
export function renderClozeContent(content: string, showAnswer: boolean): string {
	if (showAnswer) {
		return content.replace(CLOZE_REGEX, '<span class="obr-cloze-show">$1</span>');
	} else {
		return content.replace(CLOZE_REGEX, '<span class="obr-cloze-hidden">$1</span>');
	}
}

/**
 * 渲染 QA 卡片内容
 */
export function renderQAContent(question: string, answer: string, showAnswer: boolean): string {
	if (showAnswer) {
		return `**${question}**\n\n${answer}`;
	} else {
		return `**${question}**`;
	}
}
