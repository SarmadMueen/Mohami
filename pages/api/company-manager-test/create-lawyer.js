import { supabase } from '../../../lib/initSupabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, specialization, managerId } = req.body;

    if (!name || !email || !managerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the manager is authorized
    const { data: { user: currentUser } } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
    
    if (!currentUser || currentUser.email !== 'dr.abd256@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create Supabase auth user with temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          name,
          role: 'محامي',
          admin_user_id: managerId,
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create auth user' });
    }

    // Create user metadata entry
    const { error: metadataError } = await supabase
      .from('user_metadata')
      .insert({
        user_id: authData.user.id,
        email,
        name,
        role: 'محامي',
        admin_user_id: managerId,
        created_by_manager_id: managerId,
        phone: phone || null,
        specialization: specialization || null,
      });

    if (metadataError) {
      console.error('Error creating metadata:', metadataError);
      return res.status(400).json({ error: 'Failed to create user metadata' });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Lawyer account created successfully',
      tempPassword,
      userId: authData.user.id
    });

  } catch (error) {
    console.error('Error in create-lawyer API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
