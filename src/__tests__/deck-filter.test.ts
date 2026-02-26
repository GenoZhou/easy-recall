/**
 * Tests for MetadataCache filtering optimization
 * Tests getReviewFiles function which uses Obsidian's MetadataCache
 */

import { getReviewFiles } from '../deck';
import { App, TFile, CachedMetadata } from 'obsidian';

// Mock Obsidian's App and metadataCache
function createMockApp(files: Array<{ path: string; cache: CachedMetadata | null }>): App {
  const fileMap = new Map(files.map(f => [f.path, f]));
  
  return {
    vault: {
      getMarkdownFiles: () => files.map(f => ({ path: f.path, extension: 'md' } as TFile)),
    },
    metadataCache: {
      getFileCache: (file: TFile) => {
        const entry = fileMap.get(file.path);
        return entry?.cache || null;
      },
    },
  } as unknown as App;
}

describe('getReviewFiles - MetadataCache optimization', () => {
  it('should filter files with ob-reviews/ tag in frontmatter', () => {
    const mockApp = createMockApp([
      {
        path: 'math.md',
        cache: {
          frontmatter: { tags: ['ob-reviews/math'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'history.md',
        cache: {
          frontmatter: { tags: ['ob-reviews/history'] },
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

  it('should filter files with ob-reviews/ inline tag', () => {
    const mockApp = createMockApp([
      {
        path: 'note1.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#ob-reviews/science' }],
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

  it('should include files with ob-reviews/ in either frontmatter or inline tags', () => {
    const mockApp = createMockApp([
      {
        path: 'frontmatter-only.md',
        cache: {
          frontmatter: { tags: ['ob-reviews/test'] },
          tags: [],
        } as CachedMetadata,
      },
      {
        path: 'inline-only.md',
        cache: {
          frontmatter: {},
          tags: [{ tag: '#ob-reviews/test' }],
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
          frontmatter: { tags: ['ob-reviews/test'] },
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
          frontmatter: { tags: ['daily', 'ob-reviews/language'] },
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
          frontmatter: { tags: 'ob-reviews/test' },
          tags: [],
        } as CachedMetadata,
      },
    ]);

    const result = getReviewFiles(mockApp);
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('single-tag.md');
  });

  it('should return empty array when no files have ob-reviews tag', () => {
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
});
