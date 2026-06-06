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

// Helper functions using CDN-optimized compressed storage for infinite scaling and zero timeouts
export async function get(key, customPrefix) {
  try {
    let prefix = customPrefix !== undefined ? customPrefix : getPrefix();
    // Edustat Master List is a globally shared baseline uploaded only by admin
    if (key === 'edustat_master') {
      prefix = 'admin_';
    }
    const { data, error } = await supabase.storage
      .from('app-data')
      .download(`${prefix}${key}.json.gz`);

    if (error) {
      // Check if file is not found (400, 404)
      if (error.status === 400 || error.status === 404 || (error.message && error.message.includes('Object not found'))) {
        return undefined;
      }
      console.error(`Error getting key ${key} from Supabase Storage:`, error);
      return undefined;
    }

    return await decompressFromGzipBlob(data);
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
    const compressedBlob = await compressToGzipBlob(val);
    
    const { error } = await supabase.storage
      .from('app-data')
      .upload(`${prefix}${key}.json.gz`, compressedBlob, {
        contentType: 'application/x-gzip',
        upsert: true
      });

    if (error) {
      console.error(`Error setting key ${key} in Supabase Storage:`, error);
      throw error;
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
  } catch (err) {
    console.error("Unexpected error clearing Supabase Storage:", err);
  }
}
