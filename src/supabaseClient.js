import { createClient } from '@supabase/supabase-js'

// --- Pega aquí tus datos reales de Supabase ---
const supabaseUrl = 'https://bwgtgexayiqtkcyuhgsa.supabase.co'
const supabaseKey = 'sb_publishable_D-hetjxOk6Z__BoLWQgeRA_ZFKNKDkw'
// ----------------------------------------------

export const supabase = createClient(supabaseUrl, supabaseKey)