import { Button, YStack } from '@my/ui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/navigation'
import { User, UserDetail } from '../../entities/user'
import { UserDetailPageProps } from './model'
import { UserDetailPageUI } from './ui'

export function UserDetailPage(props: UserDetailPageProps) {
  return <UserDetailPageUI {...props} />
}

// public API
export type { UserDetailPageProps }
