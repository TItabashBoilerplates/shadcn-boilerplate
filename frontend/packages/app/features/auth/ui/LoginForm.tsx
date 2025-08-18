import { Button, Input, YStack } from '@my/ui'
import { useState } from 'react'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void
  isLoading?: boolean
}

export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = () => {
    onSubmit(email, password)
  }

  return (
    <YStack space="$4" width="100%">
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button onPress={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </Button>
    </YStack>
  )
}
