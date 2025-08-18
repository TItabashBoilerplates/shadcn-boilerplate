import { Button, YStack } from '@my/ui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/navigation'
import { User, UserDetail } from '../../../entities/user'
import { UserDetailPageProps } from '../model'
import { useTranslation } from '../../../shared/lib/i18n'

export function UserDetailPageUI({ id }: UserDetailPageProps) {
  const router = useRouter()
  const { t } = useTranslation()

  if (!id) {
    return null
  }

  // 実際のアプリでは、idからユーザー情報を取得する処理が入ります
  const user: User = {
    id,
    name: `User ${id}`,
  }

  return (
    <YStack flex={1} justify="center" items="center" gap="$4" bg="$background">
      <UserDetail user={user} />
      <Button icon={ChevronLeft} onPress={() => router.back()}>
        {t('common.back')}
      </Button>
    </YStack>
  )
}
