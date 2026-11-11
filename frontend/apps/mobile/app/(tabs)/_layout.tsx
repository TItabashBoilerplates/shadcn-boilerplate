import { IconSymbol } from '@workspace/native-ui/components'
import { Colors } from '@workspace/native-ui/constants'
import { useColorScheme } from '@workspace/native-ui/hooks'
import { Tabs } from 'expo-router'

import { useI18n } from '@/shared/hooks'
import { HapticTab } from '@/shared/ui'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const { t } = useI18n()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].icon,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ focused }) => (
            <IconSymbol
              size={28}
              name="house.fill"
              color={
                focused ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].icon
              }
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('navigation.explore'),
          tabBarIcon: ({ focused }) => (
            <IconSymbol
              size={28}
              name="paperplane.fill"
              color={
                focused ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].icon
              }
            />
          ),
        }}
      />
    </Tabs>
  )
}
