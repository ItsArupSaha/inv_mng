'use server';

import { addDoc, collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Capital } from '../types';

/**
 * Get all capital transactions history for a specific user
 */
export async function getCapitalHistory(userId: string): Promise<Capital[]> {
  if (!db || !userId) return [];
  try {
    const capitalCollection = collection(db, 'users', userId, 'capital');
    const snapshot = await getDocs(query(capitalCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      let serializedDate = new Date().toISOString();
      if (data.date) {
        if (data.date instanceof Timestamp) {
          serializedDate = data.date.toDate().toISOString();
        } else if (data.date.seconds) {
          // If it's a plain object representation of a Timestamp (can happen in Next.js serialization boundaries)
          serializedDate = new Timestamp(data.date.seconds, data.date.nanoseconds).toDate().toISOString();
        } else {
          serializedDate = new Date(data.date).toISOString();
        }
      }
      
      return {
        id: doc.id,
        source: data.source || 'Capital Adjustment',
        amount: data.amount || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        notes: data.notes || '',
        date: serializedDate,
      } as Capital;
    });
  } catch (error) {
    console.error('Error fetching capital history:', error);
    return [];
  }
}

/**
 * Record a manual capital addition (adjustment) for a user
 */
export async function addCapitalAdjustment(
  userId: string,
  data: { amount: number; paymentMethod: 'Cash' | 'Bank'; notes?: string; date?: Date }
): Promise<void> {
  if (!db || !userId) throw new Error('Database not connected.');
  try {
    const capitalCollection = collection(db, 'users', userId, 'capital');
    const now = new Date();
    
    await addDoc(capitalCollection, {
      source: 'Capital Adjustment',
      amount: data.amount,
      date: Timestamp.fromDate(data.date || now),
      paymentMethod: data.paymentMethod,
      notes: data.notes || 'Additional capital added.',
    });

    // Revalidate paths to refresh cache
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
  } catch (error) {
    console.error('Error recording capital adjustment:', error);
    throw error;
  }
}
