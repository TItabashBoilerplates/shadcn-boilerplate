import { Button, ButtonText, Pressable, Text, VStack } from '@workspace/native-ui/components'
import { useState } from 'react'
import { useI18n } from '@/shared/hooks'

/**
 * 推奨 / 強制で共通の中身（見出し・説明・リリースノート・更新ボタン）。
 *
 * 2 つの画面に同じ文言とクラス文字列をコピペしないための共有部品
 * （`.claude/rules/clean-code.md`。Tailwind のクラス文字列も重複コード）。
 *
 * 副作用は `onUpdate` で受け取る。`../lib/runtime` は `expo-application` /
 * `Linking` に依存していて Storybook（react-native-web）では意味を持たないため、
 * UI 側からは触らない。
 */
export function UpdatePrompt({
  tone,
  latestVersion,
  releaseNote,
  onUpdate,
  onDismiss,
}: {
  tone: 'required' | 'available'
  latestVersion: string | null
  releaseNote?: string | null
  onUpdate: () => Promise<boolean>
  /** 渡したときだけ「後で」を出す。**強制では渡さない** */
  onDismiss?: () => void
}) {
  const { t } = useI18n()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleUpdate = async () => {
    setPending(true)
    setFailed(false)
    const opened = await onUpdate()
    setPending(false)
    // ストアを開けたら OS がアプリを離れるので、この状態は普通は見えない。
    // 見えるのは「ストアアプリが無効化されている端末」等の例外時だけ。
    if (!opened) setFailed(true)
  }

  return (
    <VStack className="gap-4">
      <Text size="2xl" bold className="text-foreground">
        {t(tone === 'required' ? 'appUpdate.requiredTitle' : 'appUpdate.availableTitle')}
      </Text>

      <Text className="text-muted-foreground">
        {t(
          tone === 'required' ? 'appUpdate.requiredDescription' : 'appUpdate.availableDescription'
        )}
      </Text>

      {latestVersion ? (
        <Text size="sm" className="text-muted-foreground">
          {t('appUpdate.latestVersion', { version: latestVersion })}
        </Text>
      ) : null}

      {releaseNote ? (
        <VStack className="gap-1 rounded-md border border-border bg-muted/30 p-3">
          <Text size="sm" bold className="text-foreground">
            {t('appUpdate.whatsNew')}
          </Text>
          <Text size="sm" className="text-muted-foreground">
            {releaseNote}
          </Text>
        </VStack>
      ) : null}

      {failed ? (
        // 握りつぶさず、次にどうすればよいかを出す（.claude/rules/error-handling.md）
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="text-destructive"
        >
          {t('appUpdate.openStoreFailed')}
        </Text>
      ) : null}

      {/* 主要操作なのでタップ標的は 44px 以上（.claude/rules/mobile-uiux.md §5） */}
      <Button
        testID="app-update-open-store"
        size="lg"
        onPress={handleUpdate}
        isDisabled={pending}
        className="min-h-[44px]"
      >
        <ButtonText>{t(pending ? 'appUpdate.opening' : 'appUpdate.openStore')}</ButtonText>
      </Button>

      {onDismiss ? (
        <Pressable
          testID="app-update-dismiss"
          onPress={onDismiss}
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center"
        >
          <Text className="text-muted-foreground">{t('appUpdate.later')}</Text>
        </Pressable>
      ) : null}
    </VStack>
  )
}
