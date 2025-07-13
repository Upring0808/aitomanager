import cacheService from '../services/CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility function to get cached data with fallback
export const getCachedData = async (type, orgId, additionalParams = '') => {
  try {
    const cached = await cacheService.getCache(cacheService.generateKey(type, orgId, additionalParams));
    return cached;
  } catch (error) {
    console.error(`[CacheUtils] Error getting cached ${type}:`, error);
    return null;
  }
};

// Utility function to set cached data
export const setCachedData = async (type, orgId, data, additionalParams = '') => {
  try {
    await cacheService.setCache(cacheService.generateKey(type, orgId, additionalParams), data);
    return true;
  } catch (error) {
    console.error(`[CacheUtils] Error setting cached ${type}:`, error);
    return false;
  }
};

// Utility function to invalidate specific cache
export const invalidateCache = async (type, orgId) => {
  try {
    await cacheService.invalidateCache(type, orgId);
    return true;
  } catch (error) {
    console.error(`[CacheUtils] Error invalidating ${type} cache:`, error);
    return false;
  }
};

// Utility function to get current organization ID
export const getCurrentOrgId = async () => {
  try {
    return await AsyncStorage.getItem('selectedOrgId');
  } catch (error) {
    console.error('[CacheUtils] Error getting org ID:', error);
    return null;
  }
};

// Utility function to clear all cache for current organization
export const clearCurrentOrgCache = async () => {
  try {
    const orgId = await getCurrentOrgId();
    if (orgId) {
      await cacheService.clearOrgCache(orgId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[CacheUtils] Error clearing org cache:', error);
    return false;
  }
};

// Utility function to get cache info for debugging
export const getCacheInfo = async () => {
  try {
    return await cacheService.getCacheInfo();
  } catch (error) {
    console.error('[CacheUtils] Error getting cache info:', error);
    return [];
  }
}; 