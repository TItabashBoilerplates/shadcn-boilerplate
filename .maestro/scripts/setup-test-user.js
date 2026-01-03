/**
 * Maestro Test User Setup Script
 *
 * Creates a test user via Supabase Auth Admin API.
 * This script uses the same REST endpoints that supabase-js uses internally.
 *
 * Required environment variables:
 *   - SUPABASE_URL: Supabase project URL (e.g., http://localhost:54321)
 *   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
 *
 * Optional environment variables:
 *   - TEST_EMAIL: Specific email to use (default: auto-generated)
 *   - TEST_PASSWORD: Password for the user (default: TestPass123!)
 *
 * Output:
 *   - output.testEmail: Created user's email
 *   - output.testPassword: User's password
 *   - output.userId: User's UUID
 *   - output.accessToken: Access token for authenticated requests
 */

const SUPABASE_URL = SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY || '';

// Generate unique test email if not provided
const timestamp = new Date().getTime();
const testEmail = TEST_EMAIL || `e2e_test_${timestamp}@test.local`;
const testPassword = TEST_PASSWORD || 'TestPass123!';

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

/**
 * Create user via Supabase Auth Admin API
 * Equivalent to: supabase.auth.admin.createUser()
 *
 * @see https://supabase.com/docs/reference/javascript/auth-admin-createuser
 */
function createTestUser() {
  const response = http.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email for E2E testing
      user_metadata: {
        created_by: 'maestro_e2e',
        created_at: new Date().toISOString()
      }
    })
  });

  if (response.code !== 200 && response.code !== 201) {
    console.log('Create user response:', response.body);
    throw new Error(`Failed to create user: ${response.code} - ${response.body}`);
  }

  const userData = json(response.body);
  console.log('Test user created:', testEmail);

  return {
    id: userData.id,
    email: userData.email
  };
}

/**
 * Sign in as the created user to get access token
 * Equivalent to: supabase.auth.signInWithPassword()
 */
function signInUser() {
  const response = http.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  if (response.code !== 200) {
    console.log('Sign in response:', response.body);
    throw new Error(`Failed to sign in: ${response.code}`);
  }

  const session = json(response.body);
  return session.access_token;
}

// Execute setup
try {
  const user = createTestUser();
  const accessToken = signInUser();

  // Export to Maestro output
  output.testEmail = testEmail;
  output.testPassword = testPassword;
  output.userId = user.id;
  output.accessToken = accessToken;

  console.log('Setup complete. User ID:', user.id);
} catch (error) {
  console.log('Setup failed:', error.message);
  throw error;
}
