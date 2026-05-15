import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/initSupabase';
import { useRouter } from 'next/router';
import withAuth from '../../lib/withAuth';

async function createPermissionProfilesTable() {
  try {
    const { data, error } = await supabase.from('permission_profiles').upsert([
      {
        profile_name: 'الفئة 1',
        can_edit_cases: true,
        can_edit_template: true,
        can_add_template: true,
        can_view_setting: true,
        can_add_lawyers: true,
        can_add_cases: true,
        can_delete_cases: true,
        can_view_clients: true,
        can_add_sessions: true,
        can_create_action: true,
        can_add_updates: true,
        can_add_notes: true,
        can_add_case_updates: true,
      },
      {
        profile_name: 'الفئة 2',
        can_edit_cases: true,
        can_edit_template: false,
        can_add_template: false,
        can_view_setting: false,
        can_add_lawyers: false,
        can_add_cases: true,
        can_delete_cases: false,
        can_view_clients: true,
        can_add_sessions: true,
        can_create_action: true,
        can_add_updates: true,
        can_add_notes: true,
        can_add_case_updates: true,
      },
      // Add more categories as needed
    ]);

    if (error) {
      console.error('Error creating permission profiles:', error);
    } else {
      console.log('Permission profiles created successfully.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createPermissionProfilesTable();
