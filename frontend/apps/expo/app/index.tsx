import { HomePage } from 'app/pages/home'
import { Stack } from 'expo-router'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Home',
        }}
      />
      <HomePage />
    </>
  )
}
