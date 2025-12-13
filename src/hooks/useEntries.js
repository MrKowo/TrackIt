import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export const useEntries = (trackerId) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !trackerId) {
        setEntries([]);
        setLoading(false);
        return;
    }

    const q = query(
      collection(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', trackerId, 'entries'), 
      orderBy('date', 'desc'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, trackerId]);

  return { entries, loading };
};