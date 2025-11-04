/**
 * Booking.com Session Manager
 * Stores and reuses session cookies to avoid re-login
 */

const { supabase } = require('../_middleware');

/**
 * Save session cookies to database
 */
async function saveSessionCookies(cookies) {
  try {
    const { error } = await supabase
      .from('booking_sessions')
      .upsert({
        id: 1, // Single row for session
        cookies: cookies,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log('Session cookies saved successfully');
  } catch (error) {
    console.error('Failed to save session cookies:', error);
  }
}

/**
 * Load session cookies from database
 */
async function loadSessionCookies() {
  try {
    const { data, error } = await supabase
      .from('booking_sessions')
      .select('cookies, updated_at')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No session found
        return null;
      }
      throw error;
    }

    // Check if session is not too old (less than 7 days)
    const sessionAge = Date.now() - new Date(data.updated_at).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (sessionAge > maxAge) {
      console.log('Session too old, need fresh login');
      return null;
    }

    console.log('Loaded session cookies from database');
    return data.cookies;
  } catch (error) {
    console.error('Failed to load session cookies:', error);
    return null;
  }
}

/**
 * Clear session cookies
 */
async function clearSessionCookies() {
  try {
    await supabase
      .from('booking_sessions')
      .delete()
      .eq('id', 1);

    console.log('Session cookies cleared');
  } catch (error) {
    console.error('Failed to clear session cookies:', error);
  }
}

module.exports = {
  saveSessionCookies,
  loadSessionCookies,
  clearSessionCookies
};
