import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export interface Thought {
  id: number;
  content: string;
  createdAt: Date;
  source: 'voice' | 'text';
}

export interface DbClient {
  insertThought: (content: string, source: 'voice' | 'text') => Promise<void>;
  getThoughts: (limit?: number) => Promise<Thought[]>;
}

export async function getDb(): Promise<DbClient> {
  return {
    insertThought: async (content: string, source: 'voice' | 'text') => {
      await prisma.thought.create({
        data: {
          content,
          source,
        },
      });
    },
    getThoughts: async (limit = 50) => {
      const rows = await prisma.thought.findMany({
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
      return rows.map(r => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        source: r.source as 'voice' | 'text',
      }));
    }
  };
}
