/**
 * Integration tests for key user flows
 * These tests simulate complete user workflows
 */

import { parseNote } from '../parser';
import { createSM2Scheduler, DEFAULT_SM2_PARAMS } from '../scheduler/index';
import { injectSchedule } from '../store';
import { groupByDecks, getDueCards } from '../deck';
import { Schedule, Rating } from '../types';

// 使用 SM-2 调度器进行测试
const sm2Scheduler = createSM2Scheduler(DEFAULT_SM2_PARAMS);
const calcSchedule = (current: Schedule | null, rating: Rating) => sm2Scheduler.calcSchedule(current, rating);
const isDue = (schedule: Schedule | undefined) => sm2Scheduler.isDue(schedule);

describe('Integration - Complete Review Flow', () => {
  const mockNow = new Date('2026-02-18T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Flow 1: Review a QA card with different ratings', () => {
    it('should complete full review cycle with Good (3)', () => {
      let noteContent = `---
tags:
  - ob-reviews/test
---

《黄帝内经》的成书时期
?
成书于战国至秦汉时期`;

      let cards = parseNote(noteContent, 'test.md');
      expect(cards).toHaveLength(1);
      expect(cards[0].schedule).toBeUndefined();

      // First review with Good
      let newSchedule = calcSchedule(cards[0].schedule ?? null, 3);
      expect(newSchedule.interval).toBe(1);
      expect(newSchedule.reps).toBe(1);

      noteContent = injectSchedule(
        noteContent,
        newSchedule,
        cards[0].lineStart,
        cards[0].scheduleLine
      );

      cards = parseNote(noteContent, 'test.md');
      expect(cards[0].schedule!.interval).toBe(1);
      expect(isDue(cards[0].schedule)).toBe(false);
    });

    it('should handle Again rating correctly', () => {
      let noteContent = `---
tags:
  - ob-reviews/test
---

《黄帝内经》的成书时期
?
成书于战国至秦汉时期`;

      let cards = parseNote(noteContent, 'test.md');
      
      // Review with Again (没记住)
      let newSchedule = calcSchedule(cards[0].schedule ?? null, 1);
      expect(newSchedule.interval).toBe(0); // 立即重新复习
      expect(newSchedule.reps).toBe(0); // Not counted as successful

      noteContent = injectSchedule(
        noteContent,
        newSchedule,
        cards[0].lineStart,
        cards[0].scheduleLine
      );

      cards = parseNote(noteContent, 'test.md');
      
      // Card is set for immediate review
      expect(cards[0].schedule!.interval).toBe(0);
      expect(cards[0].schedule!.reps).toBe(0);
    });
  });

  describe('Flow 2: Review a card with Again after learning phase', () => {
    it('should reset schedule and keep card due for same day', () => {
      let noteContent = `---
tags:
  - ob-reviews/test
---

<!--SR:5,250,2026-02-18T12:00:00Z,3-->
问题
?
答案`;

      let cards = parseNote(noteContent, 'test.md');
      expect(cards[0].schedule!.interval).toBe(5);

      // Mark as Again (没记住)
      const newSchedule = calcSchedule(cards[0].schedule!, 1);
      expect(newSchedule.interval).toBe(0); // 立即重新复习
      expect(newSchedule.reps).toBe(0);
      expect(newSchedule.ease).toBe(230); // 250 - 20

      noteContent = injectSchedule(
        noteContent,
        newSchedule,
        cards[0].lineStart,
        cards[0].scheduleLine
      );

      cards = parseNote(noteContent, 'test.md');

      // Card is set for immediate review with reset reps
      expect(cards[0].schedule!.interval).toBe(0);
      expect(cards[0].schedule!.reps).toBe(0);
    });
  });

  describe('Flow 3: Compare different ratings on same card', () => {
    it('should produce different intervals for each rating', () => {
      const baseSchedule: Schedule = {
        interval: 10,
        ease: 250,
        due: mockNow,
        reps: 5,
      };

      const againSchedule = calcSchedule(baseSchedule, 1);
      const hardSchedule = calcSchedule(baseSchedule, 2);
      const goodSchedule = calcSchedule(baseSchedule, 3);

      // 没记住: reset to 0 (immediate review)
      expect(againSchedule.interval).toBe(0);
      expect(againSchedule.reps).toBe(0);

      // 有点难: 10 * 1.2 = 12
      expect(hardSchedule.interval).toBe(12);
      expect(hardSchedule.reps).toBe(6);

      // 记住了: 10 * 250 / 100 = 25
      expect(goodSchedule.interval).toBe(25);
      expect(goodSchedule.reps).toBe(6);


    });

    it('should affect ease differently', () => {
      const baseSchedule: Schedule = {
        interval: 10,
        ease: 250,
        due: mockNow,
        reps: 5,
      };

      expect(calcSchedule(baseSchedule, 1).ease).toBe(230); // -20
      expect(calcSchedule(baseSchedule, 2).ease).toBe(235); // -15
      expect(calcSchedule(baseSchedule, 3).ease).toBe(250); // 0
    });
  });

  describe('Flow 4: New card learning phase', () => {
    it('should progress through learning with different ratings', () => {
      // First review
      let schedule = calcSchedule(null, 3); // Good
      expect(schedule.interval).toBe(1);
      expect(schedule.reps).toBe(1);

      // Second review with Good
      schedule = calcSchedule(schedule, 3);
      expect(schedule.interval).toBe(2.5); // 1 * 250 / 100
      expect(schedule.reps).toBe(2);

      // Third review with Good
      schedule = calcSchedule(schedule, 3);
      expect(schedule.interval).toBe(6.25); // 2.5 * 250 / 100
      expect(schedule.reps).toBe(3);
      expect(schedule.ease).toBe(250); // unchanged
    });

    it('should handle Again during learning', () => {
      // First review Good
      let schedule = calcSchedule(null, 3);
      expect(schedule.interval).toBe(1);
      expect(schedule.reps).toBe(1);

      // Second review Again
      schedule = calcSchedule(schedule, 1);
      expect(schedule.interval).toBe(0); // 立即重新复习
      expect(schedule.reps).toBe(0);
      expect(schedule.ease).toBe(230);

      // Back to learning - Good again
      schedule = calcSchedule(schedule, 3);
      expect(schedule.interval).toBe(1);
      expect(schedule.reps).toBe(1);
    });
  });

  describe('Flow 5: Ease boundaries', () => {
    it('should not decrease ease below 130', () => {
      let schedule: Schedule = {
        interval: 5,
        ease: 140,
        due: mockNow,
        reps: 3,
      };

      // Multiple Again ratings
      for (let i = 0; i < 10; i++) {
        schedule = calcSchedule(schedule, 1);
      }

      expect(schedule.ease).toBe(130);
    });

    it('should keep high ease unchanged with Good', () => {
      let schedule: Schedule = {
        interval: 5,
        ease: 340,
        due: mockNow,
        reps: 3,
      };

      // Multiple Good ratings - ease unchanged
      for (let i = 0; i < 10; i++) {
        schedule = calcSchedule(schedule, 3);
      }

      expect(schedule.ease).toBe(340);
    });
  });

  describe('Flow 6: Card with Again stays in queue', () => {
    it('should schedule card for ~30 minutes later with Again', () => {
      const noteContent = `---
tags:
  - ob-reviews/test
---

卡片内容
==挖空==`;

      const cards = parseNote(noteContent, 'test.md');
      const card = cards[0];

      // First review with Again
      const schedule = calcSchedule(null, 1);
      
      // Card is set for immediate review (due = now)
      expect(schedule.interval).toBe(0);
      expect(schedule.reps).toBe(0);
    });
  });
});
