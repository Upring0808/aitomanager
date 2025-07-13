import AsyncStorage from "@react-native-async-storage/async-storage";

class CacheService {
  constructor() {
    this.cachePrefix = "dashboard_cache_";
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  // Generate cache key for different data types
  generateKey(type, orgId, additionalParams = "") {
    return `${this.cachePrefix}${type}_${orgId}_${additionalParams}`;
  }

  // Set cache with TTL
  async setCache(key, data, ttl = this.defaultTTL) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
        expiresAt: Date.now() + ttl,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`[CacheService] Cached data for key: ${key}`);
      return true;
    } catch (error) {
      console.error("[CacheService] Error setting cache:", error);
      return false;
    }
  }

  // Check if cache exists and is valid
  async hasCache(key) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        return false;
      }

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now > cacheData.expiresAt) {
        console.log(`[CacheService] Cache expired for key: ${key}`);
        await this.removeCache(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[CacheService] Error checking cache:", error);
      return false;
    }
  }

  // Get cache data
  async getCache(key) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        return null;
      }

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now > cacheData.expiresAt) {
        console.log(`[CacheService] Cache expired for key: ${key}`);
        await this.removeCache(key);
        return null;
      }

      console.log(`[CacheService] Cache hit for key: ${key}`);
      return cacheData.data;
    } catch (error) {
      console.error("[CacheService] Error getting cache:", error);
      return null;
    }
  }

  // Remove specific cache
  async removeCache(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`[CacheService] Removed cache for key: ${key}`);
      return true;
    } catch (error) {
      console.error("[CacheService] Error removing cache:", error);
      return false;
    }
  }

  // Clear all dashboard cache
  async clearAllCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log("[CacheService] Cleared all dashboard cache");
      return true;
    } catch (error) {
      console.error("[CacheService] Error clearing cache:", error);
      return false;
    }
  }

  // Clear cache for specific organization
  async clearOrgCache(orgId) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const orgCacheKeys = keys.filter(key => 
        key.startsWith(this.cachePrefix) && key.includes(`_${orgId}_`)
      );
      await AsyncStorage.multiRemove(orgCacheKeys);
      console.log(`[CacheService] Cleared cache for org: ${orgId}`);
      return true;
    } catch (error) {
      console.error("[CacheService] Error clearing org cache:", error);
      return false;
    }
  }

  // Invalidate specific cache type
  async invalidateCache(type, orgId) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const typeCacheKeys = keys.filter(key => 
        key.startsWith(this.cachePrefix) && 
        key.includes(`${type}_${orgId}_`)
      );
      await AsyncStorage.multiRemove(typeCacheKeys);
      console.log(`[CacheService] Invalidated ${type} cache for org: ${orgId}`);
      return true;
    } catch (error) {
      console.error("[CacheService] Error invalidating cache:", error);
      return false;
    }
  }

  // Get cache info (for debugging)
  async getCacheInfo() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      const cacheInfo = [];

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheData = JSON.parse(cached);
          cacheInfo.push({
            key,
            timestamp: cacheData.timestamp,
            expiresAt: cacheData.expiresAt,
            isExpired: Date.now() > cacheData.expiresAt,
            dataSize: JSON.stringify(cacheData.data).length,
          });
        }
      }

      return cacheInfo;
    } catch (error) {
      console.error("[CacheService] Error getting cache info:", error);
      return [];
    }
  }

  // Cache specific data types
  async cachePeople(orgId, data) {
    const key = this.generateKey("people", orgId);
    return await this.setCache(key, data, 15 * 60 * 1000); // 15 minutes for people
  }

  async getCachedPeople(orgId) {
    const key = this.generateKey("people", orgId);
    return await this.getCache(key);
  }

  async cacheEvents(orgId, data) {
    const key = this.generateKey("events", orgId);
    return await this.setCache(key, data, 5 * 60 * 1000); // 5 minutes for events
  }

  async getCachedEvents(orgId) {
    const key = this.generateKey("events", orgId);
    return await this.getCache(key);
  }

  async cacheFines(orgId, userId, data) {
    const key = this.generateKey("fines", orgId, userId);
    return await this.setCache(key, data, 8 * 60 * 1000); // 8 minutes for fines
  }

  async getCachedFines(orgId, userId) {
    const key = this.generateKey("fines", orgId, userId);
    return await this.getCache(key);
  }

  async cacheUser(orgId, userId, data) {
    const key = this.generateKey("user", orgId, userId);
    return await this.setCache(key, data, 30 * 60 * 1000); // 30 minutes for user data
  }

  async getCachedUser(orgId, userId) {
    const key = this.generateKey("user", orgId, userId);
    return await this.getCache(key);
  }

  async cacheHomeData(orgId, data) {
    const key = this.generateKey("home", orgId);
    return await this.setCache(key, data, 3 * 60 * 1000); // 3 minutes for home
  }

  async getCachedHomeData(orgId) {
    const key = this.generateKey("home", orgId);
    return await this.getCache(key);
  }

  // Invalidate specific data types
  async invalidatePeopleCache(orgId) {
    return await this.invalidateCache("people", orgId);
  }

  async invalidateEventsCache(orgId) {
    return await this.invalidateCache("events", orgId);
  }

  async invalidateFinesCache(orgId) {
    return await this.invalidateCache("fines", orgId);
  }

  async invalidateHomeCache(orgId) {
    return await this.invalidateCache("home", orgId);
  }
}

export default new CacheService(); 