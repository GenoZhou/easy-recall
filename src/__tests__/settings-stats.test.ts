import { calculateReviewStats } from '../settings/stats';
import { Card } from '../types';

describe('calculateReviewStats', () => {
  const now = new Date('2026-04-19T12:00:00Z');

  it('should categorize cards by learning stage and upcoming windows', () => {
    const cards: Card[] = [
      {
        id: 'new',
        type: 'cloze',
        content: '==答案==',
        tags: ['test'],
        filePath: 'new.md',
        lineStart: 0,
        lineEnd: 0,
      },
      {
        id: 'relearning',
        type: 'cloze',
        content: '==答案==',
        tags: ['test'],
        filePath: 'relearning.md',
        lineStart: 0,
        lineEnd: 0,
        schedule: {
          interval: 0,
          ease: 230,
          due: new Date('2026-04-19T12:00:00Z'),
          reps: 0,
        },
      },
      {
        id: 'learning',
        type: 'qa',
        content: '问题?\n答案',
        question: '问题?',
        answer: '答案',
        tags: ['test'],
        filePath: 'learning.md',
        lineStart: 0,
        lineEnd: 1,
        schedule: {
          interval: 1,
          ease: 255,
          due: new Date('2026-04-20T08:00:00Z'),
          reps: 1,
        },
      },
      {
        id: 'mature-3d',
        type: 'cloze',
        content: '==答案==',
        tags: ['test'],
        filePath: 'mature-3d.md',
        lineStart: 0,
        lineEnd: 0,
        schedule: {
          interval: 3,
          ease: 260,
          due: new Date('2026-04-21T12:00:00Z'),
          reps: 4,
        },
      },
      {
        id: 'mature-7d',
        type: 'cloze',
        content: '==答案==',
        tags: ['test'],
        filePath: 'mature-7d.md',
        lineStart: 0,
        lineEnd: 0,
        schedule: {
          interval: 7,
          ease: 265,
          due: new Date('2026-04-25T12:00:00Z'),
          reps: 5,
        },
      },
      {
        id: 'mature-30d',
        type: 'cloze',
        content: '==答案==',
        tags: ['test'],
        filePath: 'mature-30d.md',
        lineStart: 0,
        lineEnd: 0,
        schedule: {
          interval: 30,
          ease: 270,
          due: new Date('2026-05-10T12:00:00Z'),
          reps: 6,
        },
      },
      {
        id: 'later',
        type: 'cloze',
        content: '==答案==',
        tags: ['test'],
        filePath: 'later.md',
        lineStart: 0,
        lineEnd: 0,
        schedule: {
          interval: 45,
          ease: 275,
          due: new Date('2026-06-20T12:00:00Z'),
          reps: 8,
        },
      },
    ];

    const stats = calculateReviewStats(cards, now);

    expect(stats.total).toBe(7);
    expect(stats.newCards).toBe(1);
    expect(stats.relearningCards).toBe(1);
    expect(stats.learningCards).toBe(1);
    expect(stats.matureCards).toBe(4);
    expect(stats.dueNow).toBe(2);
    expect(stats.upcoming1d).toBe(1);
    expect(stats.upcoming3d).toBe(1);
    expect(stats.upcoming7d).toBe(1);
    expect(stats.upcoming30d).toBe(1);
    expect(stats.later).toBe(1);
  });
});
