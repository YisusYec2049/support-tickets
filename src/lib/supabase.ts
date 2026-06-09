import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://adspqarennwimwlhqsps.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkc3BxYXJlbm53aW13bGhxc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTE5OTAsImV4cCI6MjA5NjUyNzk5MH0.-WCDa9sWRqQifbmlRcm8QQMD09e1s8-yqfUn4My3cDk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
