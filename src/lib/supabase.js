import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gylekyesvfqwbzyqmswh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0jNEOPBInxlG4D-4ZWMPMg_lBkj-mOC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
