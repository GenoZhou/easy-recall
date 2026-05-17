/**
 * Tests for MetadataCache filtering optimization
 * Tests getReviewFiles function which uses Obsidian's MetadataCache
 */

import { getReviewFiles } from '../deck';
import { App, TFile, CachedMetadata } from 'obsidian';

// Mock Obsidian's App and metadataCache
function createMockApp(files: Array<{ path: string; cache: CachedMetadata | null }>): App {
  const fileMap = new Map(files.map(f => [f.path, f]));
  const tfileMap = new Map(files.map(f => {
    const file = new TFile();
    file.path = f.path;
    file.extension = 'md';
    return [f.path, file];
  }));
  
  return {
    vault: {
      getAbstractFileByPath: (path: string) => tfileMap.get(path) || null,
    },
    metadataCache: {
      fileCache: Object.fromEntries(files.filter(f => f.cache).map(f => [f.path, f.cache])),
      getFileCache: (file: TFile) => {
        const entry = fileMap.get(file.path);
        return entry?.cache || null;
      },
    },
  } as unknown as App;
}

describe('getReviewFiles - MetadataCache optimization', () => {
  it('should filter files with easy-recall/ tag in frontmatter', () => {
    const mockApp = createMockApp([
      {
        path: 'math.md',
        cache: {
          frontmatter: { tags: ['easy-recall/math'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'history.md',
        cache: {
          frontmatter: { tags: ['easy-recall/history'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'random.md',
        cache: {
          frontmatter: { tags: ['other-tag'] },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(2);
    expect(result.map(f => f.path)).toContain('math.md');
    expect(result.map(f => f.path)).toContain('history.md');
    expect(result.map(f => f.path)).not.toContain('random.md');
  });

  it('should filter files with easy-recall/ inline tag', () => {
    const mockApp = createMockApp([
      {
        path: 'note1.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#easy-recall/science' }],
        } as unknown as CachedMetadata,
      },
      {
        path: 'note2.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#other-tag' }],
        } as unknown as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('note1.md');
  });

  it('should include files with easy-recall/ in either frontmatter or inline tags', () => {
    const mockApp = createMockApp([
      {
        path: 'frontmatter-only.md',
        cache: {
          frontmatter: { tags: ['easy-recall/test'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'inline-only.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#easy-recall/test' }],
        } as unknown as CachedMetadata,
      },
      {
        path: 'no-tag.md',
        cache: {
          frontmatter: {},
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(2);
    expect(result.map(f => f.path)).toContain('frontmatter-only.md');
    expect(result.map(f => f.path)).toContain('inline-only.md');
    expect(result.map(f => f.path)).not.toContain('no-tag.md');
  });

  it('should handle files without cache (return null)', () => {
    const mockApp = createMockApp([
      {
        path: 'cached.md',
        cache: {
          frontmatter: { tags: ['easy-recall/test'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'uncached.md',
        cache: null,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('cached.md');
  });

  it('should handle array frontmatter tags', () => {
    const mockApp = createMockApp([
      {
        path: 'multi-tag.md',
        cache: {
          frontmatter: { tags: ['daily', 'easy-recall/language'] },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('multi-tag.md');
  });

  it('should handle string frontmatter tags (single tag)', () => {
    const mockApp = createMockApp([
      {
        path: 'single-tag.md',
        cache: {
          frontmatter: { tags: 'easy-recall/test' },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('single-tag.md');
  });

  it('should return empty array when no files have easy-recall tag', () => {
    const mockApp = createMockApp([
      {
        path: 'note1.md',
        cache: {
          frontmatter: { tags: ['other'] },
          tags: [{ tag: '#another' }],
        } as unknown as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(0);
  });

  it('should filter files with a custom deck tag prefix', () => {
    const mockApp = createMockApp([
      {
        path: 'custom.md',
        cache: {
          frontmatter: { tags: ['custom-recall/math'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'default.md',
        cache: {
          frontmatter: { tags: ['easy-recall/math'] },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp, 'custom-recall');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('custom.md');
  });
});
