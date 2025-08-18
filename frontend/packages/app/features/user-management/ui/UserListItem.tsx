import { Button, Text, XStack, YStack } from '@my/ui'
import { UserListItem as UserListItemType } from '../model'

interface UserListItemProps {
  user: UserListItemType
  onViewDetails: (userId: string) => void
}

function UserListItem({ user, onViewDetails }: UserListItemProps) {
  return (
    <XStack p="$4" space="$3" borderWidth={1} borderColor="$borderColor" bg="$background">
      <YStack flex={1}>
        <Text fontWeight="bold">{user.name}</Text>
        <Text color="$color10">{user.email}</Text>
        <Text color="$color9" fontSize="$2">
          {user.role}
        </Text>
      </YStack>

      <Button size="$3" onPress={() => onViewDetails(user.id)}>
        View Details
      </Button>
    </XStack>
  )
}
