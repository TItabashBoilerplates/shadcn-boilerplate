import { signUpWithPassword } from '@/features/auth'
import { SignUpScreen } from '@/views/auth'

export default function SignUpRoute() {
  return <SignUpScreen signUp={signUpWithPassword} />
}
