import { Paragraph, YStack } from '@my/ui'
import { User } from '../model'
import { useTranslation } from '../../../shared/lib/i18n'

export interface UserDetailProps {
  user: User
}

export function UserDetail({ user }: UserDetailProps) {
  const { t } = useTranslation()
  
  return (
    <YStack space="$2">
      <Paragraph text="center" fontWeight="700" color="$blue10">
        {`${t('user.profile')}: ${user.id}`}
      </Paragraph>
      {user.name && (
        <Paragraph text="center" color="$color11">
          {`${t('user.name')}: ${user.name}`}
        </Paragraph>
      )}
    </YStack>
  )
}
