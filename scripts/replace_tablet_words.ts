import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { collection, doc, getDocs, getFirestore, query, writeBatch, where } from 'firebase/firestore';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TARGET_EMAIL = 'ankitapharma2026@gmail.com';

async function main() {
  console.log(`Searching for user with email: ${TARGET_EMAIL}...`);
  const usersRef = collection(db, 'users');
  const qUser = query(usersRef, where('email', '==', TARGET_EMAIL));
  const userSnap = await getDocs(qUser);

  if (userSnap.empty) {
    console.error(`User with email "${TARGET_EMAIL}" not found!`);
    process.exit(1);
  }

  const userDoc = userSnap.docs[0];
  const userId = userDoc.id;
  console.log(`Found user ID: ${userId} (${TARGET_EMAIL})`);

  const itemsRef = collection(db, 'users', userId, 'items');
  const itemsSnap = await getDocs(itemsRef);

  console.log(`Total items in user inventory: ${itemsSnap.size}`);

  const matches: { id: string; oldTitle: string; newTitle: string }[] = [];

  itemsSnap.docs.forEach((itemDoc) => {
    const data = itemDoc.data();
    const oldTitle = data.title || '';
    if (/\btablets?\b/i.test(oldTitle)) {
      const newTitle = oldTitle
        .replace(/\bTablets\b/gi, 'Tabs')
        .replace(/\bTablet\b/gi, 'Tab');

      if (newTitle !== oldTitle) {
        matches.push({ id: itemDoc.id, oldTitle, newTitle });
      }
    }
  });

  console.log(`\nFound ${matches.length} items to update:`);
  matches.forEach((m, i) => {
    console.log(`${i + 1}. [${m.id}] "${m.oldTitle}" -> "${m.newTitle}"`);
  });

  const applyChanges = process.argv.includes('--apply');

  if (!applyChanges) {
    console.log('\n--- DRY RUN COMPLETE ---');
    console.log('Run with --apply flag to commit these changes to Firestore.');
  } else {
    console.log('\nApplying updates to Firestore in batches...');
    // Firestore writeBatch max 500 operations per batch
    const BATCH_SIZE = 400;
    let updatedCount = 0;

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const chunk = matches.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((m) => {
        const itemDocRef = doc(db, 'users', userId, 'items', m.id);
        batch.update(itemDocRef, { title: m.newTitle });
      });

      await batch.commit();
      updatedCount += chunk.length;
      console.log(`Committed batch: ${updatedCount} / ${matches.length} items updated.`);
    }

    console.log(`\nSuccessfully updated all ${updatedCount} items in Firestore!`);
  }
}

main().catch(console.error);

