/**
 * Maestro Test User Cleanup Script
 *
 * Deletes a test user via Supabase Auth Admin API.
 * This script uses the same REST endpoints that supabase-js uses internally.
 *
 * Required environment variables:
 *   - SUPABASE_URL: Supabase project URL (e.g., http://localhost:54321)
 *   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
 *   - USER_ID: UUID of the user to delete
 *
 * Optional environment variables:
 *   - SOFT_DELETE: If "true", soft-delete the user (default: false)
 *
 * @see https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
 */

const SUPABASE_URL = SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY || '';
const userId = USER_ID || '';
const softDelete = SOFT_DELETE === 'true';

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

if (!userId) {
  console.log('No USER_ID provided, skipping cleanup');
  output.cleaned = false;
} else {
  /**
   * Delete user via Supabase Auth Admin API
   * Equivalent to: supabase.auth.admin.deleteUser()
   *
   * REST endpoint: DELETE /auth/v1/admin/users/{user_id}
   */
  function deleteTestUser() {
    // Build URL with soft delete option if needed
    let url = `${SUPABASE_URL}/auth/v1/admin/users/${userId}`;

    const response = http.request(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: softDelete ? JSON.stringify({ should_soft_delete: true }) : undefined
    });

    if (response.code !== 200 && response.code !== 204) {
      console.log('Delete user response:', response.body);
      throw new Error(`Failed to delete user: ${response.code} - ${response.body}`);
    }

    console.log('Test user deleted:', userId);
    return true;
  }

  try {
    deleteTestUser();
    output.cleaned = true;
    output.deletedUserId = userId;
    console.log('Cleanup complete');
  } catch (error) {
    console.log('Cleanup failed:', error.message);
    output.cleaned = false;
    output.error = error.message;
    // Don't throw - cleanup failures shouldn't fail the test
  }
}
