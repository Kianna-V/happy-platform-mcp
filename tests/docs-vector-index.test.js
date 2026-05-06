import { describe, expect, test } from '@jest/globals';
import {
  createVectorIndex,
  createLocalEmbedding,
  serializeVector
} from '../src/docs/vector-index.js';

describe('vector index', () => {
  test('is disabled when vector config is false', async () => {
    const index = await createVectorIndex({ enableVector: false });
    expect(index.available).toBe(false);
    expect(await index.search()).toEqual([]);
  });

  test('reports missing embedding provider as unavailable', async () => {
    const index = await createVectorIndex({ enableVector: true, embeddingProvider: 'none' });
    expect(index.available).toBe(false);
    expect(index.reason).toMatch(/embedding provider/);
  });

  test('reports sqlite-vec integration as unavailable when vector config is ready', async () => {
    const index = await createVectorIndex({
      enableVector: true,
      embeddingProvider: 'local',
      db: {},
      loadSqliteVec: async () => null
    });
    expect(index.available).toBe(false);
    expect(index.reason).toMatch(/sqlite-vec integration is not available/);
  });

  test('creates deterministic local embeddings', () => {
    expect(createLocalEmbedding('Flow Designer action')).toEqual(createLocalEmbedding('Flow Designer action'));
    expect(createLocalEmbedding('Flow Designer action')).toHaveLength(128);
  });

  test('serializes vectors for sqlite-vec bindings', () => {
    expect(serializeVector([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  test('loads sqlite-vec and creates a vector index when configured', async () => {
    const db = {
      execCalls: [],
      loadExtensionCalls: [],
      exec(sql) {
        this.execCalls.push(sql);
      },
      loadExtension(path) {
        this.loadExtensionCalls.push(path);
      }
    };
    const sqliteVec = { load(database) { database.loadExtension('/tmp/vec0'); } };

    const index = await createVectorIndex({
      enableVector: true,
      embeddingProvider: 'local',
      db,
      loadSqliteVec: async () => sqliteVec
    });

    expect(index.available).toBe(true);
    expect(db.loadExtensionCalls).toEqual(['/tmp/vec0']);
    expect(db.execCalls.join('\n')).toContain('docs_chunk_vectors');
  });
});
