// pages/api/adminToken.js
import { supabase } from '../../lib/initSupabase';

export default async function handler(req, res) {
  try {
    const { user, error } = await supabase.auth.session();

    if (error) {
      return res.status(500).json({ error: 'Error getting admin session' });
    }

    const { data, error: tokenError } = await supabase.auth.api.createSession({
      user_id: user.id,
    });

    if (tokenError) {
      return res.status(500).json({ error: 'Error generating admin token' });
    }

    res.status(200).json({ token: data.access_token });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
