import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Service role key is only available on server
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// For client-side use (limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side use (Admin/API)
// We only initialize this when on the server to prevent runtime errors in the browser
export function getSupabaseClient() {
  if (!supabaseServiceKey) {
    // If we're on the client, we should probably use the anon key client if needed, 
    // but usually server-only functions should not be called on the client.
    return supabase;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Re-export db for backward compatibility in server routes
export const db = typeof window === 'undefined' ? getSupabaseClient() : supabase;

// Storage configuration
export const bucketName = 'generated-images';
export const UPLOAD_FOLDER = 'elam ai gen';
export const FINAL_FOLDER = 'elam ai final';

// For backward compatibility
export const storageFolder = UPLOAD_FOLDER;
