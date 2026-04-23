import type { Translations } from './en';

/**
 * 中文翻译
 */
export const zh: Translations = {
	// 评分按钮
	rating: {
		again: '没记住',
		hard: '有点难',
		good: '记住了',
	},

	// 命令
	commands: {
		startReview: '开始复习',
		reviewCurrentNote: '复习当前笔记',
	},

	// 通知
	notifications: {
		reviewComplete: '复习完成！',
		noDueCards: '该卡组没有到期卡片',
		noDueCardsInNote: '当前笔记没有到期的卡片',
		failedToStart: '启动复习失败，请检查控制台',
		failedToSave: '❌ 保存失败，请重试',
		failedToOpenFile: '❌ 打开原文失败，请重试',
		fileChanged: (path: string) => `复习文件已变更: ${path}`,
	},

	// 卡组选择器
	deckSelector: {
		placeholder: '搜索卡组... (输入 @all 复习全部)',
		loading: '正在扫描卡片...',
		loadFailed: '加载失败，请重试',
		emptyState: '没有找到匹配的卡组',
		noDecks: '暂无卡组',
		stats: {
			decks: '个卡组',
			cards: '张卡片',
			due: '张到期',
			new: '张新卡',
			scheduled: '张已调度',
		},
		allDeck: {
			name: '@all',
			total: (count: number) => `共 ${count} 张`,
		},
		deckItem: {
			due: (count: number) => `${count} 到期`,
			new: (count: number) => `${count} 新`,
			total: (count: number) => `${count} 张`,
		},
		instructions: {
			navigate: '导航',
			select: '复习选中',
			close: '关闭',
		},
	},

	// 复习界面
	review: {
		title: '复习卡片',
		progress: (current: number, total: number) => `复习卡片 (${current}/${total})`,
		showAnswer: '显示答案',
		showHint: '显示提示',
		openSource: '打开原文',
		hint: '提示',
		complete: {
			title: '复习完成',
			button: '完成',
		},
	},

	settings: {
		title: 'ob-reviews 设置',
		language: {
			name: '界面语言',
			desc: '界面语言。自动模式会跟随 Obsidian 设置。',
			auto: '自动',
			en: 'English',
			zh: '中文',
		},
		debug: {
			name: '调试模式',
			desc: '在控制台显示调试日志（需重启生效）。',
		},
		reviewSurface: {
			name: '复习界面',
			desc: '选择复习卡片时使用模态窗口，还是复用一个 Obsidian 标签页。',
			modal: '模态窗口',
			tab: '标签页',
		},
		stats: {
			name: '复习统计',
			desc: '查看复习摘要和接下来几个复习窗口。',
			refresh: '刷新',
			loading: '正在加载复习统计...',
			loadFailed: '加载复习统计失败。',
			empty: '还没有找到复习卡片。',
			upcoming: '后续复习窗口',
			total: '总卡片数',
			totalDecks: '总卡组数',
			matureCards: '成熟卡',
			dueNow: '当前到期',
			upcoming1d: '1 天内',
			upcoming3d: '3 天内',
			upcoming7d: '7 天内',
			upcoming30d: '30 天内',
			later: '更晚',
			explanations: {
				matureCards: '复习多次后相对稳定的卡片。',
				dueNow: '现在就可以开始复习。',
				upcoming1d: '很快会再次出现的卡片。',
				upcoming3d: '短期巩固窗口内的复习量。',
				upcoming7d: '近期一周内的复习压力。',
				upcoming30d: '中期排期内的复习量。',
				later: '30 天以后才会进入队列。',
			},
		},
	},

	// 时间格式化
	time: {
		now: '现在',
		minutes: (n: number) => `${n} 分钟后`,
		hours: (n: number) => `${n} 小时后`,
		days: (n: number) => `${n} 天后`,
		weeks: (n: number) => `${n} 周后`,
		months: (n: number) => `${n} 个月后`,
		years: (n: number) => `${n} 年后`,
		tomorrow: '明天',
		today: '今天',
		yesterday: '昨天',
		immediate: '立即',
	},

	// 卡片类型
	cardTypes: {
		cloze: '挖空',
		qa: '问答',
	},
};
