/**
 * FSRS 算法测试
 */

import { createFSRSScheduler, DEFAULT_FSRS_PARAMS } from '../../scheduler/fsrs';
import { Rating } from '../../types';

describe('FSRS Algorithm', () => {
  const mockNow = new Date('2026-02-18T12:00:00Z');
  const scheduler = createFSRSScheduler(DEFAULT_FSRS_PARAMS);
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createInitialSchedule', () => {
    it('should create initial schedule with correct defaults', () => {
      const schedule = scheduler.createInitialSchedule();
      
      expect(schedule.interval).toBe(0);
      expect(schedule.reps).toBe(0);
      expect(schedule.difficulty).toBe(5);
      expect(schedule.stability).toBe(0);
      expect(schedule.lapses).toBe(0);
      expect(schedule.state).toBe('new');
      expect(schedule.algorithm).toBe('fsrs');
      expect(schedule.due).toEqual(mockNow);
    });
  });

  describe('calcSchedule - new cards (reps=0)', () => {
    it('should set immediate review with Again (rating=1)', () => {
      const newSchedule = scheduler.calcSchedule(null, 1);
      
      expect(newSchedule.interval).toBe(0);
      expect(newSchedule.reps).toBe(1);
      expect(newSchedule.state).toBe('learning');
      expect(newSchedule.stability).toBe(DEFAULT_FSRS_PARAMS.w[0]);
    });

    it('should schedule 6 hours later with Hard (rating=2)', () => {
      const newSchedule = scheduler.calcSchedule(null, 2);
      
      expect(newSchedule.interval).toBe(0.25);
      expect(newSchedule.reps).toBe(1);
      expect(newSchedule.state).toBe('review');
      expect(newSchedule.stability).toBe(DEFAULT_FSRS_PARAMS.w[1]);
    });

    it('should schedule 1 day later with Good (rating=3)', () => {
      const newSchedule = scheduler.calcSchedule(null, 3);
      
      expect(newSchedule.reps).toBe(1);
      expect(newSchedule.state).toBe('review');
      expect(newSchedule.stability).toBe(DEFAULT_FSRS_PARAMS.w[2]);
      
      const expectedDue = new Date(mockNow);
      expectedDue.setDate(expectedDue.getDate() + Math.round(newSchedule.interval));
      expect(newSchedule.due.getDate()).toBe(expectedDue.getDate());
    });

    it('should schedule 3+ days later with Easy (rating=4)', () => {
      const newSchedule = scheduler.calcSchedule(null, 4);
      
      expect(newSchedule.reps).toBe(1);
      expect(newSchedule.state).toBe('review');
      expect(newSchedule.stability).toBe(DEFAULT_FSRS_PARAMS.w[3]);
      expect(newSchedule.interval).toBeGreaterThanOrEqual(3);
    });
  });
});
