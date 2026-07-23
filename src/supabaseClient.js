// API Adapter for .NET Core Web API + SQL Server Backend
// This replaces the old Supabase implementation

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/Portal';

export const supabase = {
  // Client wrapper to emulate the Supabase users query syntax for login and permissions updates
  from: (tableName) => {
    if (tableName === 'users') {
      return {
        select: () => ({
          eq: (field, value) => ({
            single: async () => {
              try {
                // Fetch user data from .NET core login API
                const r = await fetch(`${API_BASE_URL}/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: value, passwordHash: '' })
                });
                if (!r.ok) {
                  return { data: null, error: { message: 'Unauthorized or User Not Found' } };
                }
                const userObj = await r.json();
                return { data: userObj, error: null };
              } catch (err) {
                return { data: null, error: { message: err.message } };
              }
            }
          })
        }),
        update: (payload) => ({
          eq: (field, value) => {
            return {
              then: async (resolve) => {
                try {
                  const res = await fetch(`${API_BASE_URL}/update-upload-time/${value}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload.permissions)
                  });
                  resolve({ error: res.ok ? null : { message: 'Update failed' } });
                } catch (err) {
                  resolve({ error: { message: err.message } });
                }
              }
            };
          }
        })
      };
    }
    
    // Fallback/No-op for other tables (the app queries them directly using get() / set() below)
    return {
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ then: (resolve) => resolve({ error: null }) }) }),
      insert: async () => ({ error: null })
    };
  }
};

// Natively hash password with username as salt using Web Crypto API (SHA-256)
export async function hashPassword(username, password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(username.toLowerCase().trim() + ":" + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fetch all rows from the .NET Core Database API
export async function get(key, customPrefix) {
  try {
    const res = await fetch(`${API_BASE_URL}/get-data/${key}`);
    if (!res.ok) {
      return key.endsWith('_meta') ? undefined : [];
    }
    const data = await res.json();
    
    // If it's a metadata object, parse JSON if returned as a string from DB
    if (key.endsWith('_meta') && typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (_) {
        return data;
      }
    }
    return data || (key.endsWith('_meta') ? undefined : []);
  } catch (err) {
    console.error(`Error fetching key ${key} from .NET API:`, err);
    return key.endsWith('_meta') ? undefined : [];
  }
}

// Push all rows to the .NET Core Database API
export async function set(key, val) {
  try {
    const payload = key.endsWith('_meta') ? val : val;
    const res = await fetch(`${API_BASE_URL}/set-data/${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Failed to save key ${key}: Status ${res.status}`);
    }
  } catch (err) {
    console.error(`Error saving key ${key} to .NET API:`, err);
    throw err;
  }
}

export async function clearIDB() {
  // Clear any local cached profiles
  localStorage.removeItem('snet_profile_photo');
}
