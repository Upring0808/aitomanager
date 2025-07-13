import { useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { collection, query } from 'firebase/firestore';
import { db } from '../config/firebaseconfig';
import cacheService from '../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useCacheInvalidation = () => {
  useEffect(() => {
    let unsubscribeEvents;
    let unsubscribePeople;
    let unsubscribeFines;

    const setupCacheInvalidation = async () => {
      try {
        const orgId = await AsyncStorage.getItem('selectedOrgId');
        if (!orgId) return;

        // Listen for events changes and invalidate cache
        const eventsRef = collection(db, 'organizations', orgId, 'events');
        const eventsQuery = query(eventsRef);
        unsubscribeEvents = onSnapshot(eventsQuery, () => {
          console.log('[CacheInvalidation] Events changed, invalidating cache');
          cacheService.invalidateEventsCache(orgId);
        });

        // Listen for people changes and invalidate cache
        const peopleRef = collection(db, 'organizations', orgId, 'users');
        const peopleQuery = query(peopleRef);
        unsubscribePeople = onSnapshot(peopleQuery, () => {
          console.log('[CacheInvalidation] People changed, invalidating cache');
          cacheService.invalidatePeopleCache(orgId);
        });

        // Listen for fines changes and invalidate cache
        const finesRef = collection(db, 'organizations', orgId, 'fines');
        const finesQuery = query(finesRef);
        unsubscribeFines = onSnapshot(finesQuery, () => {
          console.log('[CacheInvalidation] Fines changed, invalidating cache');
          cacheService.invalidateFinesCache(orgId);
        });

      } catch (error) {
        console.error('[CacheInvalidation] Error setting up cache invalidation:', error);
      }
    };

    setupCacheInvalidation();

    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribePeople) unsubscribePeople();
      if (unsubscribeFines) unsubscribeFines();
    };
  }, []);

  return {
    invalidateAllCache: () => cacheService.clearAllCache(),
    invalidateOrgCache: (orgId) => cacheService.clearOrgCache(orgId),
  };
}; 