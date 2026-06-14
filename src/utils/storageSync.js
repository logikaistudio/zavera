import { supabase, isSupabaseEnabled } from './supabaseClient';

// Mapping of localStorage keys to data_key in Supabase
const STORAGE_KEYS = {
    branches: 'spacity_branches',
    selectedBranch: 'spacity_selected_branch',
    services: 'spacity_services',
    therapists: 'spacity_therapists',
    bookings: 'spacity_bookings',
    inventory: 'spacity_inventory',
    therapistStatuses: 'spacity_therapist_statuses',
    slotStatuses: 'spacity_slot_statuses',
    selectedSlots: 'spacity_selected_slots',
    manualCompletedMinutes: 'spacity_manual_completed_minutes',
    rekaps: 'spacity_rekaps',
    pembukuan: 'spacity_pembukuan',
    expenses: 'spacity_expenses',
    systemSettings: 'spacity_system_settings',
    approvals: 'spacity_approvals',
    logo: 'zavera_logo',
    customers: 'spacity_customers'
};

/**
 * Migrate all localStorage data to Supabase
 */
export const migrateLocalStorageToSupabase = async (userId = 'master') => {
    if (!isSupabaseEnabled()) {
        console.warn('Supabase not enabled, skipping migration');
        return { success: false, error: 'Supabase not configured' };
    }

    const results = {
        success: true,
        migrated: [],
        failed: []
    };

    try {
        // For each key, read from localStorage and write to Supabase
        for (const [key, localStorageKey] of Object.entries(STORAGE_KEYS)) {
            try {
                const localData = localStorage.getItem(localStorageKey);
                const parsedData = localData ? JSON.parse(localData) : null;

                // Insert/update in Supabase
                const { error } = await supabase
                    .from('zavera_data')
                    .upsert({
                        user_id: userId,
                        data_key: key,
                        data: parsedData,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,data_key'
                    });

                if (error) {
                    results.failed.push({ key, error: error.message });
                } else {
                    results.migrated.push(key);
                    console.log(`✓ Migrated ${key} from localStorage to Supabase`);
                }
            } catch (error) {
                results.failed.push({ key, error: error.message });
                console.error(`✗ Failed to migrate ${key}:`, error);
            }
        }

        if (results.failed.length > 0) {
            results.success = false;
        }

        return results;
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error: error.message, migrated: results.migrated };
    }
};

/**
 * Read data from Supabase, fallback to localStorage
 */
export const readData = async (key, userId = 'master') => {
    if (isSupabaseEnabled()) {
        try {
            const { data, error } = await supabase
                .from('zavera_data')
                .select('data')
                .eq('user_id', userId)
                .eq('data_key', key)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.warn(`Error reading ${key} from Supabase, falling back to localStorage:`, error);
            } else if (data) {
                return data.data;
            }
        } catch (error) {
            console.warn(`Error reading ${key} from Supabase:`, error);
        }
    }

    // Fallback to localStorage
    const localStorageKey = STORAGE_KEYS[key];
    if (localStorageKey) {
        const stored = localStorage.getItem(localStorageKey);
        return stored ? JSON.parse(stored) : null;
    }

    return null;
};

/**
 * Write data to localStorage AND Supabase
 */
export const writeData = async (key, value, userId = 'master') => {
    // Always write to localStorage for offline support
    const localStorageKey = STORAGE_KEYS[key];
    if (localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify(value));
    }

    // Also write to Supabase if enabled
    if (isSupabaseEnabled()) {
        try {
            const { error } = await supabase
                .from('zavera_data')
                .upsert({
                    user_id: userId,
                    data_key: key,
                    data: value,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,data_key'
                });

            if (error) {
                console.error(`Error writing ${key} to Supabase:`, error);
                // But don't fail - localStorage write succeeded
            }
        } catch (error) {
            console.error(`Error syncing ${key} to Supabase:`, error);
            // But don't fail - localStorage write succeeded
        }
    }
};
