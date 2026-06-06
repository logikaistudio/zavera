import { supabase } from './supabaseClient';

/**
 * Login user — query ke tabel app_users di Supabase
 * Returns user object if success, null if failed
 */
export const loginUser = async (username, password) => {
    if (!supabase) {
        // Fallback hardcoded if Supabase not configured
        if ((username === 'superadmin' || username === 'superuser') && password === 'password123') {
            return { id: 'local', username, full_name: 'Super Administrator', role: 'superadmin', branch_id: null, is_active: true };
        }
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('username', username.trim())
            .eq('password_plain', password)
            .eq('is_active', true)
            .single();

        if (error || !data) return null;
        return data;
    } catch (err) {
        console.error('Login error:', err);
        return null;
    }
};

/**
 * Get all users from Supabase
 */
export const getAllUsers = async () => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('app_users')
            .select('id, username, full_name, role, branch_id, is_active, created_at')
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching users:', err);
        return [];
    }
};

/**
 * Add a new user
 */
export const addUser = async ({ username, password_plain, full_name, role, branch_id }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
        const { error } = await supabase
            .from('app_users')
            .insert({ username: username.trim(), password_plain, full_name, role, branch_id: branch_id || null, is_active: true });
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Error adding user:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Update an existing user
 */
export const updateUser = async (id, updates) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    try {
        const payload = { ...updates, updated_at: new Date().toISOString() };
        // Don't update password if not provided
        if (!payload.password_plain) delete payload.password_plain;
        const { error } = await supabase
            .from('app_users')
            .update(payload)
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Error updating user:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Toggle user active status
 */
export const toggleUserActive = async (id, is_active) => {
    if (!supabase) return { success: false };
    try {
        const { error } = await supabase
            .from('app_users')
            .update({ is_active, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

/**
 * Delete a user
 */
export const deleteUser = async (id) => {
    if (!supabase) return { success: false };
    try {
        const { error } = await supabase
            .from('app_users')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('Error deleting user:', err);
        return { success: false, error: err.message };
    }
};

// Role definitions
export const ROLES = {
    superadmin: { label: 'Super Admin', color: '#f59e0b', description: 'Akses penuh semua fitur' },
    admin:      { label: 'Admin',       color: '#6366f1', description: 'Semua fitur kecuali manajemen user' },
    kasir:      { label: 'Kasir',       color: '#10b981', description: 'Pembukuan & rekap harian' },
    terapis:    { label: 'Terapis',     color: '#3b82f6', description: 'Jadwal & layanan (read-only)' },
};
