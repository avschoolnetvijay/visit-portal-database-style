import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Natively hash password with username as salt using Web Crypto API (SHA-256)
// This ensures plain-text passwords are never sent over the network or stored in the database.
export async function hashPassword(username, password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(username.toLowerCase().trim() + ":" + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to get current user's namespace prefix
function getPrefix() {
  const user = localStorage.getItem('snet_username') || 'default';
  return `${user}_`;
}

// Natively compress a JSON object into a GZIP blob using the browser's CompressionStream
async function compressToGzipBlob(data) {
  const jsonString = JSON.stringify(data);
  const stream = new Blob([jsonString], { type: 'application/json' }).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressedStream);
  return await response.blob();
}

// Natively decompress a GZIP blob back into a JSON object using the browser's DecompressionStream
async function decompressFromGzipBlob(blob) {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(stream);
  const jsonText = await response.text();
  return JSON.parse(jsonText);
}

// Helper database cache config
const DB_NAME = 'SnetCacheDB';
const STORE_NAME = 'fileCache';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getCachedItem(cacheKey) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(cacheKey);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB read error:", err);
    return null;
  }
}

async function setCachedItem(cacheKey, data, lastModified) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ cacheKey, data, lastModified });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB write error:", err);
  }
}

// --- Bandwidth Optimization: TTL-based metadata cache ---
// Supabase Free Tier allows only 5 GB egress/month.
// Without this cache, every page load calls storage.list() and re-downloads stale files.
// With this cache, metadata is checked only once every METADATA_TTL_MS (10 min).
// Within the TTL window, ALL data is served from local IndexedDB = ZERO Supabase egress.
const METADATA_CACHE_KEY = '__snet_metadata_map__';
const METADATA_TTL_MS = 10 * 60 * 1000; // 10 minutes — adjust if needed

let fileMetadataPromise = null;
function getFileMetadataMap() {
  if (!fileMetadataPromise) {
    fileMetadataPromise = (async () => {
      // 1. Check IndexedDB for a recently-cached metadata map (within TTL)
      try {
        const cached = await getCachedItem(METADATA_CACHE_KEY);
        if (cached && cached.data && cached.lastModified) {
          const ageMs = Date.now() - cached.lastModified;
          if (ageMs < METADATA_TTL_MS) {
            console.log(`Metadata cache HIT (age: ${Math.round(ageMs / 1000)}s, TTL: ${METADATA_TTL_MS / 1000}s)`);
            return cached.data;
          }
        }
      } catch (_) {
        // Ignore cache read errors, proceed to fetch from Supabase
      }

      // 2. TTL expired or no cache — fetch fresh metadata from Supabase Storage
      try {
        const { data, error } = await supabase.storage
          .from('app-data')
          .list();
        if (error) {
          console.warn("Error listing Supabase Storage metadata:", error);
          // Fallback to stale cache if any exists (e.g. rate-limited or offline)
          try {
            const stale = await getCachedItem(METADATA_CACHE_KEY);
            if (stale && stale.data) {
              console.log('Using stale metadata cache as fallback after list error');
              return stale.data;
            }
          } catch (_) {}
          return {};
        }
        const map = {};
        data.forEach(item => {
          map[item.name] = item.updated_at || item.created_at || '';
        });

        // 3. Persist metadata map to IndexedDB with current timestamp as TTL anchor
        try {
          await setCachedItem(METADATA_CACHE_KEY, map, Date.now());
        } catch (_) {}

        return map;
      } catch (err) {
        console.warn("Unexpected error listing Supabase Storage metadata:", err);
        // Fallback to stale cache
        try {
          const stale = await getCachedItem(METADATA_CACHE_KEY);
          if (stale && stale.data) {
            console.log('Using stale metadata cache as fallback after unexpected error');
            return stale.data;
          }
        } catch (_) {}
        return {};
      }
    })();
  }
  return fileMetadataPromise;
}

// Helper functions using CDN-optimized compressed storage for infinite scaling and zero timeouts
export async function get(key, customPrefix) {
  try {
    let prefix = customPrefix !== undefined ? customPrefix : getPrefix();
    // Edustat Master List is a globally shared baseline uploaded only by admin
    if (key === 'edustat_master') {
      prefix = 'admin_';
    }
    const fileName = `${prefix}${key}.json.gz`;

    // 1. Get remote lastModified timestamp from list cache
    const metadataMap = await getFileMetadataMap();
    const remoteLastModified = metadataMap[fileName];

    // Check local IndexedDB cache
    const cached = await getCachedItem(fileName);

    if (remoteLastModified === undefined) {
      // If we got an empty metadata map (e.g. offline or list error), fallback to cached data if it exists
      if (Object.keys(metadataMap).length === 0 && cached) {
        console.log(`Offline/list-fail fallback: Cache HIT for ${fileName}`);
        return cached.data;
      }
      return undefined;
    }

    if (cached && cached.lastModified === remoteLastModified) {
      console.log(`Cache HIT for ${fileName} (lastModified: ${cached.lastModified})`);
      return cached.data;
    }

    console.log(`Cache MISS or STALE for ${fileName}. Downloading from storage...`);

    const { data, error } = await supabase.storage
      .from('app-data')
      .download(fileName);

    if (error) {
      // Check if file is not found (400, 404)
      if (error.status === 400 || error.status === 404 || (error.message && error.message.includes('Object not found'))) {
        return undefined;
      }
      console.error(`Error getting key ${key} from Supabase Storage:`, error);
      return undefined;
    }

    const parsedData = await decompressFromGzipBlob(data);

    // Save back to IndexedDB with remote timestamp
    await setCachedItem(fileName, parsedData, remoteLastModified);

    return parsedData;
  } catch (err) {
    console.error(`Unexpected error getting key ${key}:`, err);
    return undefined;
  }
}

export async function set(key, val) {
  try {
    let prefix = getPrefix();
    // Edustat Master List is a globally shared baseline uploaded only by admin
    if (key === 'edustat_master') {
      prefix = 'admin_';
    }
    const fileName = `${prefix}${key}.json.gz`;
    const compressedBlob = await compressToGzipBlob(val);
    
    const { error } = await supabase.storage
      .from('app-data')
      .upload(fileName, compressedBlob, {
        contentType: 'application/x-gzip',
        upsert: true
      });

    if (error) {
      console.error(`Error setting key ${key} in Supabase Storage:`, error);
      throw error;
    }

    // Invalidate list cache promise (in-memory)
    fileMetadataPromise = null;

    // Clear local cached item AND metadata cache to force fresh fetch on next read
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(fileName);           // Clear stale file cache
      store.delete(METADATA_CACHE_KEY); // Invalidate metadata TTL so next get() re-checks
    } catch (e) {
      console.warn("Failed to clear local cache item on set:", e);
    }

  } catch (err) {
    console.error(`Unexpected error setting key ${key}:`, err);
    throw err;
  }
}

export async function clearIDB() {
  try {
    const prefix = getPrefix();
    const { data, error } = await supabase.storage
      .from('app-data')
      .list();
    if (error) throw error;

    if (data && data.length > 0) {
      // Only delete files belonging to the current user
      const filesToRemove = data
        .filter(x => x.name.startsWith(prefix))
        .map(x => `${x.name}`);
      
      if (filesToRemove.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('app-data')
          .remove(filesToRemove);
        if (deleteError) throw deleteError;
      }
    }

    // Also delete files from IndexedDB cache
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      console.log("Local IndexedDB cache cleared successfully.");
    } catch (dbErr) {
      console.error("Error clearing IndexedDB cache:", dbErr);
    }

    fileMetadataPromise = null;
  } catch (err) {
    console.error("Unexpected error clearing Supabase Storage:", err);
  }
}
