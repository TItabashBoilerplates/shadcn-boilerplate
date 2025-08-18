import { ThemeExamplePage } from 'app/pages/theme-example'
import { Stack } from 'expo-router'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Theme Example',
        }}
      />
      <ThemeExamplePage />
    </>
  )
}