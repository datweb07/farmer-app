// ============================================
// Supabase Client Configuration
// ============================================
// Initializes and exports the Supabase client
// Used throughout the app for auth and database operations
// ============================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);
console.log(
  "SUPABASE KEY:",
  import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10),
);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file.\n" +
      "Required variables:\n" +
      "  - VITE_SUPABASE_URL\n" +
      "  - VITE_SUPABASE_ANON_KEY\n\n" +
      "See .env.example for more information.",
  );
}

// Create and export the Supabase client with type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Export types for convenience
export type { Database };
