import { ThemeExample } from '@my/config'
import { YStack } from '@my/ui'
import { ThemeExamplePageProps } from '../model'

export function ThemeExamplePageUI(props: ThemeExamplePageProps) {
  return (
    <YStack flex={1} bg="$background">
      <ThemeExample />
    </YStack>
  )
}