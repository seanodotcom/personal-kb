'use server';

import { revalidatePath } from 'next/cache';
import { getDb, Thought } from './db';

export async function addThought(content: string, source: 'voice' | 'text') {
  if (!content || content.trim() === '') {
    return { success: false, error: 'Content is required' };
  }

  try {
    const db = await getDb();
    await db.insertThought(content.trim(), source);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to insert thought:', error);
    return { success: false, error: 'Failed to save thought' };
  }
}

export async function getThoughts(limit: number = 50): Promise<Thought[]> {
  try {
    const db = await getDb();
    return await db.getThoughts(limit);
  } catch (error) {
    console.error('Failed to get thoughts:', error);
    return [];
  }
}
