import { Toast, XStack, YStack, Text } from '@my/ui'
import { Toast as ToastModel } from '../model'

export interface ToastItemProps {
  toast: ToastModel
  onClose: (id: string) => void
}

export function ToastItem({ toast, onClose }: ToastItemProps) {
  // Typeとカラーのマッピング
  const getColorForType = (type?: 'success' | 'error' | 'info' | 'warning') => {
    switch (type) {
      case 'success':
        return '$green9'
      case 'error':
        return '$red9'
      case 'warning':
        return '$yellow9'
      case 'info':
      default:
        return '$blue9'
    }
  }

  return (
    <XStack>
      <Toast
        key={toast.id}
        duration={toast.duration || 3000}
        enterStyle={{ x: 0, y: -20, opacity: 0 }}
        exitStyle={{ x: 0, y: -20, opacity: 0 }}
        y={0}
        opacity={1}
        animation="quick"
        viewportName="viewport"
        backgroundColor={getColorForType(toast.type)}
        onClose={() => onClose(toast.id)}
      >
        <YStack>
          <Toast.Title color="white">{toast.title}</Toast.Title>
          {toast.message && <Toast.Description color="white">{toast.message}</Toast.Description>}
        </YStack>
      </Toast>
    </XStack>
  )
}
