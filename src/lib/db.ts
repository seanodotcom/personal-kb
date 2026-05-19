import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';

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

// Ensure the db instance is cached during hot-reloads in development
let cachedDbClient: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (cachedDbClient) return cachedDbClient;

  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl && dbUrl.startsWith('mysql://')) {
    // MySQL Implementation
    const pool = mysql.createPool(dbUrl);
    
    cachedDbClient = {
      initDb: async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS thoughts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            content TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            source VARCHAR(50) NOT NULL
          )
        `);
      },
      insertThought: async (content: string, source: 'voice' | 'text') => {
        await pool.query(
          'INSERT INTO thoughts (content, source, createdAt) VALUES (?, ?, NOW())',
          [content, source]
        );
      },
      getThoughts: async (limit = 50) => {
        const [rows] = await pool.query<any[]>(
          'SELECT * FROM thoughts ORDER BY createdAt DESC LIMIT ?',
          [limit]
        );
        return rows.map(r => ({
          id: r.id,
          content: r.content,
          createdAt: new Date(r.createdAt),
          source: r.source,
        }));
      }
    };
  } else {
    // SQLite Implementation (Local Development Fallback)
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
          createdAt: new Date(r.createdAt + 'Z'), // Ensure it parses as UTC
          source: r.source,
        }));
      }
    };
  }

  // Ensure table exists
  await cachedDbClient.initDb();
  
  return cachedDbClient;
}
