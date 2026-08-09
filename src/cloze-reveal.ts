import type { Rating } from './types';

export type ClozeRevealState = 'hidden' | 'shown' | 'deleted';

export interface ClozeRevealStats {
	total: number;
	hidden: number;
	shown: number;
	deleted: number;
}

export function getNextClozeRevealState(state: ClozeRevealState): ClozeRevealState {
	if (state === 'hidden') return 'shown';
	if (state === 'shown') return 'deleted';
	return 'hidden';
}

export function applyClozeRevealState(el: HTMLElement, state: ClozeRevealState): void {
	el.classList.remove('er-cloze-hidden');
	el.classList.remove('er-cloze-show');
	el.classList.remove('er-cloze-deleted');
	el.classList.add(state === 'shown' ? 'er-cloze-show' : `er-cloze-${state}`);
	el.setAttribute('data-cloze-state', state);
}

export function getClozeRevealStats(states: readonly ClozeRevealState[]): ClozeRevealStats {
	return states.reduce<ClozeRevealStats>((stats, state) => {
		stats.total += 1;
		stats[state] += 1;
		return stats;
	}, { total: 0, hidden: 0, shown: 0, deleted: 0 });
}

/**
 * 根据挖空逐项状态返回可用评分；仍有隐藏项时返回 null。
 */
export function getClickRevealAvailableRatings(states: readonly ClozeRevealState[]): Rating[] | null {
	if (states.length === 0) {
		return null;
	}

	const stats = getClozeRevealStats(states);
	if (stats.deleted > 0) {
		return [1];
	}
	if (stats.hidden > 0) {
		return null;
	}
	return [2, 3];
}
