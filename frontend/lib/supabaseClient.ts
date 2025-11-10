import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing environment variables for Supabase configuration.')
  console.error('Please check your .env.local file and ensure you have:')
  console.error('NEXT_PUBLIC_SUPABASE_URL')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

let supabase: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return supabase
}
