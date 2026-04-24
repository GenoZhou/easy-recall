import { groupByDecks, getDueCards } from '../deck';
import { Card, Deck } from '../types';

describe('deck', () => {
  describe('groupByDecks', () => {
    it('should group cards by their first tag', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'Card 1',
          tags: ['math'],
          filePath: 'math.md',
          lineStart: 0,
          lineEnd: 0,
        },
        {
          id: '2',
          type: 'cloze',
          content: 'Card 2',
          tags: ['math'],
          filePath: 'math.md',
          lineStart: 1,
          lineEnd: 1,
        },
        {
          id: '3',
          type: 'qa',
          content: 'Card 3',
          question: 'Q3',
          answer: 'A3',
          tags: ['history'],
          filePath: 'history.md',
          lineStart: 0,
          lineEnd: 2,
        },
      ];

      const decks = groupByDecks(cards);

      expect(decks).toHaveLength(2);
      
      const mathDeck = decks.find(d => d.tag === 'math');
      const historyDeck = decks.find(d => d.tag === 'history');
      
      expect(mathDeck).toBeDefined();
      expect(mathDeck!.cards).toHaveLength(2);
      
      expect(historyDeck).toBeDefined();
      expect(historyDeck!.cards).toHaveLength(1);
    });

    it('should group cards without tags to default deck', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'Card 1',
          tags: [], // no tags
          filePath: 'test.md',
          lineStart: 0,
          lineEnd: 0,
        },
      ];

      const decks = groupByDecks(cards);

      expect(decks).toHaveLength(1);
      expect(decks[0].tag).toBe('default');
      expect(decks[0].cards).toHaveLength(1);
    });

    it('should sort decks alphabetically by tag', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'Card 1',
          tags: ['zebra'],
          filePath: 'z.md',
          lineStart: 0,
          lineEnd: 0,
        },
        {
          id: '2',
          type: 'cloze',
          content: 'Card 2',
          tags: ['alpha'],
          filePath: 'a.md',
          lineStart: 0,
          lineEnd: 0,
        },
        {
          id: '3',
          type: 'cloze',
          content: 'Card 3',
          tags: ['beta'],
          filePath: 'b.md',
          lineStart: 0,
          lineEnd: 0,
        },
      ];

      const decks = groupByDecks(cards);

      expect(decks.map(d => d.tag)).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should handle empty card array', () => {
      const decks = groupByDecks([]);
      expect(decks).toHaveLength(0);
    });
  });

  describe('getDueCards', () => {
    const mockNow = new Date('2026-02-18T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should include cards without schedule (new cards)', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'New card',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 0,
          lineEnd: 0,
          // no schedule
        },
      ];

      const dueCards = getDueCards(cards);
      expect(dueCards).toHaveLength(1);
    });

    it('should include cards with past due date', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'Due card',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 0,
          lineEnd: 0,
          schedule: {
            interval: 1,
            ease: 250,
            due: new Date('2026-02-17T12:00:00Z'), // yesterday
            reps: 1,
          },
        },
      ];

      const dueCards = getDueCards(cards);
      expect(dueCards).toHaveLength(1);
    });

    it('should include cards with due date now', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'Due now',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 0,
          lineEnd: 0,
          schedule: {
            interval: 1,
            ease: 250,
            due: mockNow,
            reps: 1,
          },
        },
      ];

      const dueCards = getDueCards(cards);
      expect(dueCards).toHaveLength(1);
    });

    it('should exclude cards with future due date', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'Not due yet',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 0,
          lineEnd: 0,
          schedule: {
            interval: 1,
            ease: 250,
            due: new Date('2026-02-20T12:00:00Z'), // future
            reps: 1,
          },
        },
      ];

      const dueCards = getDueCards(cards);
      expect(dueCards).toHaveLength(0);
    });

    it('should filter mixed due and non-due cards', () => {
      const cards: Card[] = [
        {
          id: '1',
          type: 'cloze',
          content: 'Due yesterday',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 0,
          lineEnd: 0,
          schedule: {
            interval: 1,
            ease: 250,
            due: new Date('2026-02-17T12:00:00Z'), // yesterday
            reps: 1,
          },
        },
        {
          id: '2',
          type: 'cloze',
          content: 'Due tomorrow',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 1,
          lineEnd: 1,
          schedule: {
            interval: 1,
            ease: 250,
            due: new Date('2026-02-19T12:00:00Z'), // tomorrow
            reps: 1,
          },
        },
        {
          id: '3',
          type: 'cloze',
          content: 'New card',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 2,
          lineEnd: 2,
          // no schedule - due
        },
      ];

      const dueCards = getDueCards(cards);
      expect(dueCards).toHaveLength(2);
      expect(dueCards.map(c => c.id)).toContain('1');
      expect(dueCards.map(c => c.id)).toContain('3');
      expect(dueCards.map(c => c.id)).not.toContain('2');
    });

    it('should prioritize due mistake cards', () => {
      const cards: Card[] = [
        {
          id: 'ordinary',
          type: 'cloze',
          content: 'Due yesterday',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 0,
          lineEnd: 0,
          schedule: {
            interval: 1,
            ease: 250,
            due: new Date('2026-02-17T12:00:00Z'),
            reps: 2,
          },
        },
        {
          id: 'mistake',
          type: 'cloze',
          content: 'Due now',
          tags: ['test'],
          filePath: 'test.md',
          lineStart: 1,
          lineEnd: 1,
          schedule: {
            interval: 1,
            ease: 250,
            due: mockNow,
            reps: 2,
            history: {
              total: 4,
              again: 2,
              hard: 0,
              good: 2,
              recent: [3, 3, 1, 1],
            },
          },
        },
      ];

      const dueCards = getDueCards(cards);

      expect(dueCards.map(card => card.id)).toEqual(['mistake', 'ordinary']);
    });
  });
});
