import { supabase } from './supabase';

// Get current user display name from localStorage (set by AuthProvider)
function getCurrentUser() {
  try {
    const profile = localStorage.getItem('bdl_user_profile');
    if (profile) {
      const p = JSON.parse(profile);
      return p.display_name || p.username || 'admin';
    }
    return 'admin';
  } catch {
    return 'admin';
  }
}

export async function logActivity(action, entity_type, entity_name) {
  try {
    const userLabel = getCurrentUser();
    const { error } = await supabase.from('activity_logs').insert([{
      user_email: userLabel,
      action,
      entity_type,
      entity_name,
    }]);
    if (error) console.error('Log insert error:', error.message);
  } catch (err) {
    console.error('Failed to log activity', err);
  }
}
