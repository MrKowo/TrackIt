import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { calculateStreakData } from '../lib/utils';

export const useTrackers = () => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setTrackers([]);
        setLoading(false);
        return;
    }

    const q = query(
      collection(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers'), 
      orderBy('order', 'asc'), 
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // 1. Get raw tracker data
      const newTrackers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // These defaults are placeholders, but we won't render them anymore
        streak: 0, 
        lastDate: null, 
      }));

      // REMOVED: setTrackers(newTrackers); <--- THIS WAS CAUSING THE FLASH
      // REMOVED: setLoading(false);

      // 2. Enrichment Logic
      const enrichedTrackers = await Promise.all(newTrackers.map(async (tracker) => {
        // Optimization: If the tracker already has valid synchronous streak data 
        // (e.g. from the optimistic update or a previous run), use it? 
        // For now, we stick to the robust fetch to ensure data consistency.
        
        const entriesCollection = collection(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', tracker.id, 'entries');
        const entriesQ = query(entriesCollection, orderBy('date', 'desc'));
        const entriesSnapshot = await getDocs(entriesQ);
        
        const dates = entriesSnapshot.docs.map(doc => doc.data().date);
        const streakData = calculateStreakData(dates, tracker.enableStreak);
        
        return {
          ...tracker,
          streak: streakData.streak,
          lastDate: streakData.lastDate,
        };
      }));

      // 3. Update state ONLY when data is ready
      setTrackers(enrichedTrackers.sort((a, b) => a.order - b.order));
      setLoading(false); // Set loading to false only after we have full data
    });

    return () => unsubscribe();
  }, [user]);

  const reorderTrackers = async (sourceIndex, destinationIndex) => {
      const result = Array.from(trackers);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);

      const optimisticResult = result.map((item, index) => ({
          ...item,
          order: index
      }));

      setTrackers(optimisticResult);

      try {
          const batch = writeBatch(db);
          optimisticResult.forEach((tracker) => {
              const ref = doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', tracker.id);
              batch.update(ref, { order: tracker.order });
          });
          await batch.commit();
      } catch (error) {
          console.error("Failed to reorder:", error);
      }
  };

  return { trackers, loading, reorderTrackers };
};