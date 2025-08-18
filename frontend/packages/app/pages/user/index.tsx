import { UserPageProps } from './model'
import { UserPageUI } from './ui'

export function UserPage(props: UserPageProps) {
  return <UserPageUI {...props} />
}

// public API
export type { UserPageProps }
