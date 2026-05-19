import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';

export interface Thought {
  id: number | string;
  content: string;
  createdAt: Date;
  source: 'voice' | 'text';
}

export interface DbClient {
  insertThought: (content: string, source: 'voice' | 'text') => Promise<void>;
  getThoughts: (limit?: number) => Promise<Thought[]>;
  initDb: () => Promise<void>;
}

let cachedDbClient: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (cachedDbClient) return cachedDbClient;

  const tursoUrl = process.env.TURSO_CONNECTION_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    // Turso Serverless SQLite (for Vercel production)
    const client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    cachedDbClient = {
      initDb: async () => {
        await client.execute(`
          CREATE TABLE IF NOT EXISTS thoughts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            source TEXT NOT NULL
          )
        `);
      },
      insertThought: async (content: string, source: 'voice' | 'text') => {
        await client.execute({
          sql: 'INSERT INTO thoughts (content, source) VALUES (?, ?)',
          args: [content, source]
        });
      },
      getThoughts: async (limit = 50) => {
        const result = await client.execute({
          sql: 'SELECT * FROM thoughts ORDER BY createdAt DESC LIMIT ?',
          args: [limit]
        });
        return result.rows.map(r => ({
          id: r.id as any,
          content: r.content as string,
          createdAt: new Date((r.createdAt as string) + (r.createdAt?.toString().endsWith('Z') ? '' : 'Z')),
          source: r.source as 'voice' | 'text',
        }));
      }
    };
  } else {
    // Local SQLite (for local development fallback)
    const db = new Database('local.db');
    db.pragma('journal_mode = WAL');

    cachedDbClient = {
      initDb: async () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS thoughts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            source TEXT NOT NULL
          )
        `);
      },
      insertThought: async (content: string, source: 'voice' | 'text') => {
        const stmt = db.prepare('INSERT INTO thoughts (content, source) VALUES (?, ?)');
        stmt.run(content, source);
      },
      getThoughts: async (limit = 50) => {
        const stmt = db.prepare('SELECT * FROM thoughts ORDER BY createdAt DESC LIMIT ?');
        const rows = stmt.all(limit) as any[];
        return rows.map(r => ({
          id: r.id,
          content: r.content,
          createdAt: new Date(r.createdAt + 'Z'),
          source: r.source,
        }));
      }
    };
  }

  // Ensure database schema is ready
  await cachedDbClient.initDb();
  
  return cachedDbClient;
}
