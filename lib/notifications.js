import { supabase } from './initSupabase';
import { getApiUrl } from './api';

/**
 * Helper to call the notifications API route (uses service role key server-side)
 */
async function callNotificationsAPI(notifications) {
  const session = supabase.auth.session();
  const token = session?.access_token;
  if (!token) {
    console.error('No auth token available for notification creation');
    return [];
  }

  const response = await fetch(getApiUrl('/api/notifications/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ notifications }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error('Notification API error:', response.status, errBody);
    return [];
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create a notification for a user
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.user_id - User ID to receive the notification
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {string} notificationData.notification_type - Type: case, session, reminder, task
 * @param {string} notificationData.icon_type - Icon type: bell, clock, video, person
 * @param {string} notificationData.related_entity_type - Related entity type
 * @param {string} notificationData.related_entity_id - Related entity ID
 * @param {string} notificationData.case_number - Case number (if related to a case)
 * @param {string} notificationData.created_by_user_id - User ID who created the notification
 * @param {Object} notificationData.metadata - Additional metadata (optional)
 */
export const createNotification = async (notificationData) => {
  try {
    const notifications = [{
      user_id: notificationData.user_id,
      title: notificationData.title,
      message: notificationData.message,
      notification_type: notificationData.notification_type,
      icon_type: notificationData.icon_type || 'bell',
      related_entity_type: notificationData.related_entity_type,
      related_entity_id: notificationData.related_entity_id,
      case_number: notificationData.case_number,
      created_by_user_id: notificationData.created_by_user_id,
      metadata: notificationData.metadata || null
    }];

    const data = await callNotificationsAPI(notifications);
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Create notifications for multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data (same as createNotification)
 */
export const createNotificationsForUsers = async (userIds, notificationData) => {
  if (!userIds || userIds.length === 0) return [];

  const notifications = userIds.map(userId => ({
    user_id: userId,
    title: notificationData.title,
    message: notificationData.message,
    notification_type: notificationData.notification_type,
    icon_type: notificationData.icon_type || 'bell',
    related_entity_type: notificationData.related_entity_type,
    related_entity_id: notificationData.related_entity_id,
    case_number: notificationData.case_number,
    created_by_user_id: notificationData.created_by_user_id,
    metadata: notificationData.metadata || null
  }));

  try {
    return await callNotificationsAPI(notifications);
  } catch (error) {
    console.error('Error creating notifications:', error);
    return [];
  }
};







