/**
 * Tests for settings module
 */

import { SettingsManager, DEFAULT_SETTINGS, EasyRecallSettings, getActiveReviewSurface } from '../settings';

// Mock Obsidian's Plugin class
const mockLoadData = jest.fn();
const mockSaveData = jest.fn();

const createMockPlugin = () => ({
	loadData: mockLoadData,
	saveData: mockSaveData,
});

describe('SettingsManager', () => {
	let manager: SettingsManager;
	let mockPlugin: ReturnType<typeof createMockPlugin>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockPlugin = createMockPlugin();
		manager = new SettingsManager(mockPlugin as unknown as import('obsidian').Plugin);
	});

	describe('load', () => {
		it('should load default settings when no data exists', async () => {
			mockLoadData.mockResolvedValue(null);
			
			await manager.load();
			
			const settings = manager.get();
			expect(settings.language).toBe('auto');
			expect(settings.deckTagPrefix).toBe('easy-recall');
			expect(settings.debugMode).toBe(false);
			expect(settings.reviewBatchSize).toBe(20);
			expect(settings.desktopReviewSurface).toBe('modal');
			expect(settings.mobileReviewSurface).toBe('modal');
			expect(settings.clickToRevealCloze).toBe(false);
			expect(settings.clickToRevealHardThreshold).toBe(50);
			expect(settings.clickToRevealGoodThreshold).toBe(80);
		});

		it('should merge loaded settings with defaults', async () => {
			mockLoadData.mockResolvedValue({ language: 'en', debugMode: true });
			
			await manager.load();
			
			const settings = manager.get();
			expect(settings.language).toBe('en');
			expect(settings.deckTagPrefix).toBe('easy-recall');
			expect(settings.debugMode).toBe(true);
			expect(settings.reviewBatchSize).toBe(20);
			expect(settings.desktopReviewSurface).toBe('modal');
			expect(settings.mobileReviewSurface).toBe('modal');
			expect(settings.clickToRevealCloze).toBe(false);
			expect(settings.clickToRevealHardThreshold).toBe(50);
			expect(settings.clickToRevealGoodThreshold).toBe(80);
		});

		it('should load separate desktop and mobile review surfaces', async () => {
			mockLoadData.mockResolvedValue({
				language: 'en',
				debugMode: true,
				desktopReviewSurface: 'tab',
				mobileReviewSurface: 'modal',
			});

			await manager.load();

			const settings = manager.get();
			expect(settings.desktopReviewSurface).toBe('tab');
			expect(settings.mobileReviewSurface).toBe('modal');
		});

		it('should migrate legacy review surface to both platform settings', async () => {
			mockLoadData.mockResolvedValue({ language: 'en', debugMode: true, reviewSurface: 'tab' });

			await manager.load();

			const settings = manager.get();
			expect(settings.desktopReviewSurface).toBe('tab');
			expect(settings.mobileReviewSurface).toBe('tab');
		});

		it('should ignore removed legacy settings fields', async () => {
			mockLoadData.mockResolvedValue({
				language: 'zh',
				defaultEase: 300,
				debugMode: true,
				hideReviewPathHiddenWords: false,
			});

			await manager.load();

			const settings = manager.get();
			expect(settings).toEqual({
				language: 'zh',
				deckTagPrefix: 'easy-recall',
				debugMode: true,
				reviewBatchSize: 20,
				desktopReviewSurface: 'modal',
				mobileReviewSurface: 'modal',
				clickToRevealCloze: false,
				clickToRevealHardThreshold: 50,
				clickToRevealGoodThreshold: 80,
			});
			expect((settings as EasyRecallSettings & { defaultEase?: number; reviewSurface?: string; hideReviewPathHiddenWords?: boolean }).defaultEase).toBeUndefined();
			expect((settings as EasyRecallSettings & { reviewSurface?: string; hideReviewPathHiddenWords?: boolean }).reviewSurface).toBeUndefined();
			expect((settings as EasyRecallSettings & { hideReviewPathHiddenWords?: boolean }).hideReviewPathHiddenWords).toBeUndefined();
		});

		it('should handle empty object', async () => {
			mockLoadData.mockResolvedValue({});
			
			await manager.load();
			
			const settings = manager.get();
			expect(settings).toEqual(DEFAULT_SETTINGS);
		});
	});

	describe('save', () => {
		it('should save current settings', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			await manager.save();
			
			expect(mockSaveData).toHaveBeenCalledWith(DEFAULT_SETTINGS);
		});
	});

	describe('update', () => {
		it('should update specific settings', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			await manager.update({ language: 'zh' });
			
			const settings = manager.get();
			expect(settings.language).toBe('zh');
			expect(settings.deckTagPrefix).toBe('easy-recall');
			expect(settings.debugMode).toBe(false); // unchanged
			expect(settings.reviewBatchSize).toBe(20);
			expect(settings.desktopReviewSurface).toBe('modal');
			expect(settings.mobileReviewSurface).toBe('modal');
			expect(settings.clickToRevealCloze).toBe(false);
			expect(settings.clickToRevealHardThreshold).toBe(50);
			expect(settings.clickToRevealGoodThreshold).toBe(80);
		});

		it('should update review batch size', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();

			await manager.update({ reviewBatchSize: 12 });

			const settings = manager.get();
			expect(settings.reviewBatchSize).toBe(12);
		});

		it('should update and normalize deck tag prefix', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();

			await manager.update({ deckTagPrefix: ' #custom-recall/ ' });

			expect(manager.get().deckTagPrefix).toBe('custom-recall');
		});

		it('should normalize empty deck tag prefix to the default', async () => {
			mockLoadData.mockResolvedValue({ deckTagPrefix: '   ' });

			await manager.load();

			expect(manager.get().deckTagPrefix).toBe('easy-recall');
		});

		it('should normalize invalid review batch size', async () => {
			mockLoadData.mockResolvedValue({ reviewBatchSize: 0 });

			await manager.load();

			expect(manager.get().reviewBatchSize).toBe(20);
		});

		it('should update platform review surfaces', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();

			await manager.update({ desktopReviewSurface: 'tab', mobileReviewSurface: 'modal' });

			const settings = manager.get();
			expect(settings.desktopReviewSurface).toBe('tab');
			expect(settings.mobileReviewSurface).toBe('modal');
		});

		it('should update clickToRevealCloze', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();

			await manager.update({ clickToRevealCloze: true });

			expect(manager.get().clickToRevealCloze).toBe(true);
		});

		it('should update and normalize click-to-reveal thresholds', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();

			await manager.update({ clickToRevealHardThreshold: 64, clickToRevealGoodThreshold: 150 });

			expect(manager.get().clickToRevealHardThreshold).toBe(64);
			expect(manager.get().clickToRevealGoodThreshold).toBe(100);
		});

		it('should keep click-to-reveal hard threshold at or below good threshold', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();

			await manager.update({ clickToRevealHardThreshold: 90, clickToRevealGoodThreshold: 70 });

			expect(manager.get().clickToRevealHardThreshold).toBe(70);
			expect(manager.get().clickToRevealGoodThreshold).toBe(70);
		});

		it('should save after update', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			await manager.update({ debugMode: true });
			
			expect(mockSaveData).toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		it('should reset to default settings', async () => {
			mockLoadData.mockResolvedValue({ language: 'en', debugMode: true });
			await manager.load();
			
			await manager.reset();
			
			const settings = manager.get();
			expect(settings).toEqual(DEFAULT_SETTINGS);
		});

		it('should save after reset', async () => {
			mockLoadData.mockResolvedValue({ language: 'en' });
			await manager.load();
			
			await manager.reset();
			
			expect(mockSaveData).toHaveBeenCalledWith(DEFAULT_SETTINGS);
		});
	});

	describe('get', () => {
		it('should return a copy of settings', async () => {
			mockLoadData.mockResolvedValue(null);
			await manager.load();
			
			const settings1 = manager.get();
			const settings2 = manager.get();
			
			expect(settings1).toEqual(settings2);
			expect(settings1).not.toBe(settings2); // different reference
		});
	});
});

describe('DEFAULT_SETTINGS', () => {
	it('should have correct default values', () => {
		expect(DEFAULT_SETTINGS.language).toBe('auto');
		expect(DEFAULT_SETTINGS.deckTagPrefix).toBe('easy-recall');
		expect(DEFAULT_SETTINGS.debugMode).toBe(false);
		expect(DEFAULT_SETTINGS.reviewBatchSize).toBe(20);
		expect(DEFAULT_SETTINGS.desktopReviewSurface).toBe('modal');
		expect(DEFAULT_SETTINGS.mobileReviewSurface).toBe('modal');
		expect(DEFAULT_SETTINGS.clickToRevealCloze).toBe(false);
		expect(DEFAULT_SETTINGS.clickToRevealHardThreshold).toBe(50);
		expect(DEFAULT_SETTINGS.clickToRevealGoodThreshold).toBe(80);
	});
});

describe('getActiveReviewSurface', () => {
	it('should return desktop surface for desktop platform', () => {
		const settings: EasyRecallSettings = {
			...DEFAULT_SETTINGS,
			desktopReviewSurface: 'tab',
			mobileReviewSurface: 'modal',
		};

		expect(getActiveReviewSurface(settings, false)).toBe('tab');
	});

	it('should return mobile surface for mobile platform', () => {
		const settings: EasyRecallSettings = {
			...DEFAULT_SETTINGS,
			desktopReviewSurface: 'tab',
			mobileReviewSurface: 'modal',
		};

		expect(getActiveReviewSurface(settings, true)).toBe('modal');
	});
});
