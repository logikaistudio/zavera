import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Using localStorage as fallback.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Helper to check if Supabase is available
export const isSupabaseEnabled = () => supabase !== null;

// Sync functions
export const syncToSupabase = async (tableName, data, userId = 'default-user') => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    
    try {
        const { error } = await supabase
            .from(tableName)
            .upsert({
                user_id: userId,
                data: data,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'user_id'
            });
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error(`Error syncing ${tableName}:`, error);
        return { success: false, error };
    }
};

export const fetchFromSupabase = async (tableName, userId = 'default-user') => {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('data')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data?.data || null;
    } catch (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return null;
    }
};
