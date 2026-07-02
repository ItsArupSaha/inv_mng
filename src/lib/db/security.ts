'use server';

import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { SecurityDeposit } from '../types';

/**
 * Get all security deposits for a specific user
 */
export async function getSecurityDeposits(userId: string): Promise<SecurityDeposit[]> {
  if (!db || !userId) return [];
  try {
    const securityCollection = collection(db, 'users', userId, 'security_deposits');
    const snapshot = await getDocs(query(securityCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      let serializedDate = new Date().toISOString();
      if (data.date) {
        if (data.date instanceof Timestamp) {
          serializedDate = data.date.toDate().toISOString();
        } else if (data.date.seconds) {
          // Plain object Timestamp representation
          serializedDate = new Timestamp(data.date.seconds, data.date.nanoseconds).toDate().toISOString();
        } else {
          serializedDate = new Date(data.date).toISOString();
        }
      }

      let serializedRefundDate: string | undefined = undefined;
      if (data.refundDate) {
        if (data.refundDate instanceof Timestamp) {
          serializedRefundDate = data.refundDate.toDate().toISOString();
        } else if (data.refundDate.seconds) {
          serializedRefundDate = new Timestamp(data.refundDate.seconds, data.refundDate.nanoseconds).toDate().toISOString();
        } else {
          serializedRefundDate = new Date(data.refundDate).toISOString();
        }
      }
      
      return {
        id: doc.id,
        securityId: data.securityId || `SEC-${doc.id.slice(0, 4).toUpperCase()}`,
        amount: data.amount || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        status: data.status || 'Refundable',
        notes: data.notes || '',
        date: serializedDate,
        refundDate: serializedRefundDate,
        refundPaymentMethod: data.refundPaymentMethod,
      } as SecurityDeposit;
    });
  } catch (error) {
    console.error('Error fetching security deposits:', error);
    return [];
  }
}

/**
 * Add a new security deposit
 */
export async function addSecurityDeposit(
  userId: string,
  data: { amount: number; paymentMethod: 'Cash' | 'Bank'; notes?: string; date: Date }
): Promise<void> {
  if (!db || !userId) throw new Error('Database not connected.');
  try {
    const securityCollection = collection(db, 'users', userId, 'security_deposits');
    const snapshot = await getDocs(securityCollection);
    const newSeq = snapshot.size + 1;
    const securityId = `SEC-${String(newSeq).padStart(4, '0')}`;

    await addDoc(securityCollection, {
      securityId,
      amount: data.amount,
      date: Timestamp.fromDate(data.date),
      paymentMethod: data.paymentMethod,
      status: 'Refundable',
      notes: data.notes || '',
    });

    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
  } catch (error) {
    console.error('Error adding security deposit:', error);
    throw error;
  }
}

/**
 * Update an existing security deposit (including refund details)
 */
export async function updateSecurityDeposit(
  userId: string,
  id: string,
  data: { 
    amount: number; 
    paymentMethod: 'Cash' | 'Bank'; 
    notes?: string; 
    date: Date;
    status: 'Refundable' | 'Refunded';
    refundDate?: Date;
    refundPaymentMethod?: 'Cash' | 'Bank';
  }
): Promise<void> {
  if (!db || !userId) throw new Error('Database not connected.');
  try {
    const docRef = doc(db, 'users', userId, 'security_deposits', id);
    const updateData: any = {
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes || '',
      date: Timestamp.fromDate(data.date),
      status: data.status,
    };

    if (data.status === 'Refunded' && data.refundDate) {
      updateData.refundDate = Timestamp.fromDate(data.refundDate);
      updateData.refundPaymentMethod = data.refundPaymentMethod || data.paymentMethod;
    } else {
      updateData.refundDate = null;
      updateData.refundPaymentMethod = null;
    }

    await updateDoc(docRef, updateData);

    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
  } catch (error) {
    console.error('Error updating security deposit:', error);
    throw error;
  }
}

/**
 * Delete a security deposit
 */
export async function deleteSecurityDeposit(userId: string, id: string): Promise<void> {
  if (!db || !userId) throw new Error('Database not connected.');
  try {
    const docRef = doc(db, 'users', userId, 'security_deposits', id);
    await deleteDoc(docRef);

    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
  } catch (error) {
    console.error('Error deleting security deposit:', error);
    throw error;
  }
}
