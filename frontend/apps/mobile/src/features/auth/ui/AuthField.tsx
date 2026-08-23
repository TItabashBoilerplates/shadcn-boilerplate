import { Input, InputField, Pressable, Text, VStack } from '@workspace/native-ui/components'
import { useState } from 'react'

/**
 * ラベル付き入力欄（必要ならパスワード表示切替つき）
 *
 * **フォントサイズは `@workspace/native-ui` の `InputField` 側で 16px 以上に
 * 固定**されている（`packages/native-ui/components/input/variants.ts`）。
 * ここで `text-sm` 等に上書きしないこと。
 *
 * ## `testID` は E2E の生命線
 *
 * `testID` は RN が Android の `resource-id` / iOS の `accessibilityIdentifier`
 * に落とすので、Maestro の `tapOn: { id: ... }` がこれに一致する。
 * 無いとラベルの**表示テキスト**を頼るしかなく、(a) ラベルの Text 要素をタップして
 * しまい入力欄にフォーカスが入らない (b) 文言や翻訳を変えた瞬間に E2E が落ちる、
 * の 2 つが起きる。**新しい入力欄を足すときは testID も必ず付けること。**
 */
export function AuthField({
  testID,
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType = 'default',
  autoComplete,
  textContentType,
  isDisabled,
  isInvalid,
  toggleLabels,
}: {
  /** Maestro / RTL から参照する安定した識別子（`tapOn: { id: ... }`） */
  testID?: string
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  secure?: boolean
  keyboardType?: 'default' | 'email-address' | 'number-pad'
  autoComplete?: 'email' | 'password' | 'new-password' | 'one-time-code'
  textContentType?: 'emailAddress' | 'password' | 'newPassword' | 'oneTimeCode'
  isDisabled?: boolean
  isInvalid?: boolean
  /** パスワード欄の表示切替ラベル（i18n 済みの文字列を渡す） */
  toggleLabels?: { show: string; hide: string }
}) {
  const [visible, setVisible] = useState(false)
  const isSecure = secure && !visible

  return (
    <VStack className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <Input isDisabled={isDisabled} isInvalid={isInvalid}>
        <InputField
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          editable={!isDisabled}
        />
        {secure && toggleLabels ? (
          <Pressable
            onPress={() => setVisible((previous) => !previous)}
            testID={testID ? `${testID}-visibility-toggle` : undefined}
            accessibilityRole="button"
            accessibilityLabel={visible ? toggleLabels.hide : toggleLabels.show}
            className="pl-2"
          >
            <Text className="text-sm text-muted-foreground">
              {visible ? toggleLabels.hide : toggleLabels.show}
            </Text>
          </Pressable>
        ) : null}
      </Input>
    </VStack>
  )
}
