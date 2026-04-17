import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ttobjkbhjrcxuoewttav.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MY9rucV7OtTgwTjVGsSNDQ_oe8ySOLH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
