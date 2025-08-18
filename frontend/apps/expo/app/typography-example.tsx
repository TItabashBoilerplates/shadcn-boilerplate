import { TypographyExamplePage } from 'app/pages/typography-example'
import { Stack } from 'expo-router'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Typography Example',
        }}
      />
      <TypographyExamplePage />
    </>
  )
}