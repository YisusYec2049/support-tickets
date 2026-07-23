import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tvkzybjwdmkrxiajwtcd.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3p5Ymp3ZG1rcnhpYWp3dGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDAyMTEsImV4cCI6MjA5NTMxNjIxMX0.sWiXCXpv1WJUoQ9b1dmq5Qs4324f9Jxlhve4g3WA4Nk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'tickets' },
})
