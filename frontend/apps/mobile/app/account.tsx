import {
  changeEmail,
  changePassword,
  DELETE_ACCOUNT_CONFIRMATION,
  deleteAccount,
  signOut,
} from '@/features/auth'
import { supabase } from '@/shared/lib/supabase'
import { AccountScreen } from '@/views/account'

/**
 * 認可判断は `getUser()` で行う（`getSession()` は cookie/ストレージ由来の値を
 * そのまま返すため真正性が保証されない）。
 */
async function loadEmail(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }
  return data.user?.email ?? ''
}

export default function AccountRoute() {
  return (
    <AccountScreen
      loadEmail={loadEmail}
      changeEmail={changeEmail}
      changePassword={changePassword}
      deleteAccount={deleteAccount}
      deleteConfirmationWord={DELETE_ACCOUNT_CONFIRMATION}
      signOut={signOut}
    />
  )
}
