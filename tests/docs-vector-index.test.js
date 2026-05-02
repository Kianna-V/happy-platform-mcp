import { describe, expect, test } from '@jest/globals';
import { createVectorIndex } from '../src/docs/vector-index.js';

describe('vector index', () => {
  test('is disabled when vector config is false', async () => {
    const index = createVectorIndex({ enableVector: false });
    expect(index.available).toBe(false);
    expect(await index.search()).toEqual([]);
  });

  test('reports missing embedding provider as unavailable', () => {
    const index = createVectorIndex({ enableVector: true, embeddingProvider: 'none' });
    expect(index.available).toBe(false);
    expect(index.reason).toMatch(/embedding provider/);
  });
});
