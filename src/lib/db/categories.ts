'use server';

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    updateDoc
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

import { db } from '../firebase';
import type { Category } from '../types';

// --- Categories Actions ---
export async function getCategories(userId: string): Promise<Category[]> {
  if (!db || !userId) return [];
  const categoriesCollection = collection(db, 'users', userId, 'categories');
  const snapshot = await getDocs(query(categoriesCollection, orderBy('name')));
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt?.toDate?.() || new Date()
    } as Category;
  });
}

export async function addCategory(userId: string, data: Omit<Category, 'id' | 'createdAt'>) {
  if (!db || !userId) return;
  const categoriesCollection = collection(db, 'users', userId, 'categories');
  const newDocRef = await addDoc(categoriesCollection, {
    ...data,
    createdAt: new Date()
  });
  revalidatePath('/items');
  return { id: newDocRef.id, ...data, createdAt: new Date() };
}

export async function updateCategory(userId: string, id: string, data: Partial<Omit<Category, 'id' | 'createdAt'>>) {
  if (!db || !userId) return;
  const categoryRef = doc(db, 'users', userId, 'categories', id);
  await updateDoc(categoryRef, data);
  revalidatePath('/items');
}

export async function deleteCategory(userId: string, id: string) {
  if (!db || !userId) return;
  const categoryRef = doc(db, 'users', userId, 'categories', id);
  await deleteDoc(categoryRef);
  revalidatePath('/items');
}

// Initialize default categories for new users based on store type
export async function initializeDefaultCategories(userId: string, storeType: 'general' | 'pharmacy' | 'bookstore' = 'general') {
  if (!db || !userId) return;
  
  const categoriesCollection = collection(db, 'users', userId, 'categories');
  const snapshot = await getDocs(categoriesCollection);
  
  // Only add default categories if none exist
  if (snapshot.empty) {
    if (storeType === 'pharmacy') {
      await addDoc(categoriesCollection, {
        name: 'Medicines',
        description: 'Prescription and OTC drugs',
        createdAt: new Date()
      });
      await addDoc(categoriesCollection, {
        name: 'Surgicals',
        description: 'Surgical tools and instruments',
        createdAt: new Date()
      });
      await addDoc(categoriesCollection, {
        name: 'General Products',
        description: 'Toiletries, baby care, etc.',
        createdAt: new Date()
      });
    } else if (storeType === 'bookstore') {
      await addDoc(categoriesCollection, {
        name: 'Books',
        description: 'Standard books for sale',
        createdAt: new Date()
      });
      await addDoc(categoriesCollection, {
        name: 'Stationery',
        description: 'Pens, pencils, notebooks, etc.',
        createdAt: new Date()
      });
    } else {
      // General shop
      await addDoc(categoriesCollection, {
        name: 'General Products',
        description: 'Standard inventory items',
        createdAt: new Date()
      });
      await addDoc(categoriesCollection, {
        name: 'Services',
        description: 'Service items or bills',
        createdAt: new Date()
      });
    }
  }
}
