import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ctagsjgwouysglkrnkay.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f38BkYtrjQXouFWNC5UuVA_l3xnT2cd';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;

