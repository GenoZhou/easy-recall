import {
	getClickRevealAvailableRatings,
	getClozeRevealStats,
	getNextClozeRevealState,
	type ClozeRevealState,
} from '../cloze-reveal';

describe('cloze-reveal helpers', () => {
	describe('getNextClozeRevealState', () => {
		it('cycles hidden → shown → deleted → hidden', () => {
			expect(getNextClozeRevealState('hidden')).toBe('shown');
			expect(getNextClozeRevealState('shown')).toBe('deleted');
			expect(getNextClozeRevealState('deleted')).toBe('hidden');
		});
	});

	describe('getClozeRevealStats', () => {
		it('counts each cloze reveal state', () => {
			const states: ClozeRevealState[] = ['hidden', 'shown', 'deleted', 'shown'];
			expect(getClozeRevealStats(states)).toEqual({
				total: 4,
				hidden: 1,
				shown: 2,
				deleted: 1,
			});
		});
	});

	describe('getClickRevealAvailableRatings', () => {
		it('returns null while any cloze item is still hidden and none are crossed out', () => {
			expect(getClickRevealAvailableRatings(['hidden', 'shown'])).toBeNull();
			expect(getClickRevealAvailableRatings(['hidden', 'hidden'])).toBeNull();
		});

		it('returns only Again when any cloze item is crossed out', () => {
			expect(getClickRevealAvailableRatings(['shown', 'deleted'])).toEqual([1]);
			expect(getClickRevealAvailableRatings(['hidden', 'deleted'])).toEqual([1]);
			expect(getClickRevealAvailableRatings(['deleted', 'deleted'])).toEqual([1]);
		});

		it('returns Hard and Good when every cloze item is shown', () => {
			expect(getClickRevealAvailableRatings(['shown', 'shown'])).toEqual([2, 3]);
		});

		it('returns null for an empty state list', () => {
			expect(getClickRevealAvailableRatings([])).toBeNull();
		});
	});
});
