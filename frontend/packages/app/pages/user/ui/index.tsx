import { Button, Paragraph, YStack } from '@my/ui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/navigation'
import { UserPageProps } from '../model'

export function UserPageUI({ id }: UserPageProps) {
  const router = useRouter()

  if (!id) {
    return null
  }

  return (
    <YStack flex={1} justify="center" items="center" gap="$4" bg="$background">
      <Paragraph text="center" fontWeight="700" color="$blue10">{`User ID: ${id}`}</Paragraph>
      <Button icon={ChevronLeft} onPress={() => router.back()}>
        Go Home
      </Button>
    </YStack>
  )
}
