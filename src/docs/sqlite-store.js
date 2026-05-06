import { createVectorIndex } from './vector-index.js';

let databaseModulePromise;

async function loadBetterSqlite3() {
  if (!databaseModulePromise) {
    databaseModulePromise = import('better-sqlite3');
  }

  try {
    const module = await databaseModulePromise;
    return module.default || module;
  } catch (error) {
    throw new Error(
      `Local ServiceNow docs search requires optional dependency better-sqlite3. ` +
      `Install optional dependencies or run npm install better-sqlite3 to enable SN-Docs-Sync and SN-Docs-Search. Original error: ${error.message}`
    );
  }
}

export async function getSqliteAvailability() {
  try {
    await loadBetterSqlite3();
    return { available: true };
  } catch (error) {
    return { available: false, reason: error.message };
  }
}

export async function createDocsStore(dbPath, { Database = null, vectorConfig = null } = {}) {
  const DatabaseCtor = Database || await loadBetterSqlite3();
  const db = new DatabaseCtor(dbPath);
  const vectorIndex = await createVectorIndex({
    ...(vectorConfig || {}),
    db
  });

  return {
    initialize() {
      db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS families (
          name TEXT PRIMARY KEY,
          branch TEXT NOT NULL,
          synced_at TEXT
        );
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          family TEXT NOT NULL,
          path TEXT NOT NULL,
          sha TEXT,
          title TEXT,
          markdown TEXT NOT NULL,
          UNIQUE(family, path)
        );
        CREATE TABLE IF NOT EXISTS chunks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          family TEXT NOT NULL,
          path TEXT NOT NULL,
          title TEXT,
          heading TEXT,
          start_line INTEGER,
          end_line INTEGER,
          body TEXT NOT NULL,
          FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
          title,
          heading,
          body,
          content='chunks',
          content_rowid='id'
        );
      `);
    },

    upsertFamily({ name, branch, syncedAt }) {
      db.prepare(`
        INSERT INTO families (name, branch, synced_at)
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET branch=excluded.branch, synced_at=excluded.synced_at
      `).run(name, branch, syncedAt);
    },

    replaceDocument(document, chunks) {
      const tx = db.transaction(() => {
        const existing = db.prepare('SELECT id FROM documents WHERE family = ? AND path = ?').get(document.family, document.path);
        if (existing) {
          db.prepare('DELETE FROM chunks_fts WHERE rowid IN (SELECT id FROM chunks WHERE document_id = ?)').run(existing.id);
          db.prepare('DELETE FROM chunks WHERE document_id = ?').run(existing.id);
          db.prepare('UPDATE documents SET sha = ?, title = ?, markdown = ? WHERE id = ?')
            .run(document.sha, document.title, document.markdown, existing.id);
        } else {
          db.prepare('INSERT INTO documents (family, path, sha, title, markdown) VALUES (?, ?, ?, ?, ?)')
            .run(document.family, document.path, document.sha, document.title, document.markdown);
        }

        const row = db.prepare('SELECT id FROM documents WHERE family = ? AND path = ?').get(document.family, document.path);
        const insertChunk = db.prepare(`
          INSERT INTO chunks (document_id, family, path, title, heading, start_line, end_line, body)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertFts = db.prepare('INSERT INTO chunks_fts (rowid, title, heading, body) VALUES (?, ?, ?, ?)');

        const indexedChunks = [];
        for (const chunk of chunks) {
          const result = insertChunk.run(
            row.id,
            chunk.family,
            chunk.path,
            chunk.title,
            chunk.heading,
            chunk.startLine,
            chunk.endLine,
            chunk.body
          );
          const indexedChunk = {
            ...chunk,
            id: Number(result.lastInsertRowid)
          };
          indexedChunks.push(indexedChunk);
          insertFts.run(indexedChunk.id, chunk.title, chunk.heading, chunk.body);
        }
        vectorIndex.indexChunks(indexedChunks);
      });

      tx();
    },

    search({ query, family, limit = 10 }) {
      const ftsResults = () => db.prepare(`
        SELECT c.id, c.family, c.path, c.title, c.heading, c.start_line AS startLine,
               c.end_line AS endLine, snippet(chunks_fts, 2, '<mark>', '</mark>', '...', 20) AS snippet
        FROM chunks_fts
        JOIN chunks c ON c.id = chunks_fts.rowid
        WHERE chunks_fts MATCH ?
          AND (? IS NULL OR c.family = ?)
        ORDER BY rank
        LIMIT ?
      `).all(query, family || null, family || null, limit);

      if (!vectorIndex.available) {
        return ftsResults();
      }

      const vectorResults = vectorIndex.search({ query, family, limit });
      const seen = new Set(vectorResults.map((result) => result.id));
      const merged = [...vectorResults];
      for (const result of ftsResults()) {
        if (!seen.has(result.id)) {
          merged.push(result);
        }
      }
      return merged.slice(0, limit);
    },

    getDocument({ family, path }) {
      return db.prepare('SELECT family, path, title, markdown FROM documents WHERE family = ? AND path = ?').get(family, path);
    },

    status() {
      const families = db.prepare('SELECT name, branch, synced_at AS syncedAt FROM families ORDER BY name').all();
      return {
        dbPath,
        ftsAvailable: true,
        vectorAvailable: vectorIndex.available,
        vectorReason: vectorIndex.reason,
        families
      };
    },

    close() {
      db.close();
    }
  };
}
