import { Input, InputField, Pressable, Text, VStack } from '@workspace/native-ui/components'
import { type Ref, useState } from 'react'
import { Platform, type TextInput } from 'react-native'
import {
  type AuthFieldPlatform,
  type AuthFieldPurpose,
  resolveAuthFieldAttributes,
} from '../model/input-attributes'

/** `Platform.OS` は 'macos' / 'windows' も取りうるので、扱う 3 つへ寄せる */
function currentPlatform(): AuthFieldPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS
  }
  return 'web'
}

/**
 * ラベル付き入力欄（必要ならパスワード表示切替つき）
 *
 * ## 属性は `purpose` から導出する（画面側で個別指定しない）
 *
 * `autoComplete` は**クロスプラットフォームに見えて Android 側に hint が無い値**があり
 * （`one-time-code` / `new-password` / `current-password`）、素朴に書くと
 * **iOS では動くが Android のオートフィルだけが無言で死ぬ**。
 * 対応表は `../model/input-attributes.ts` に閉じ込め、単体テストで固定している。
 *
 * ## フォントサイズ
 *
 * `@workspace/native-ui` の `InputField` 側で 16px 以上に固定されている
 * （`packages/native-ui/components/input/variants.ts`）。ここで `text-sm` 等に
 * 上書きしないこと（`.claude/rules/form-controls.md`）。
 *
 * ## Enter キーの連鎖
 *
 * 次の欄があるなら `enterKeyHint="next"` + `onSubmitEditing` でフォーカスを移す。
 * `submitBehavior="submit"` は**フォーカスを保ったまま**イベントだけ発火させる指定で、
 * これが無いと一度ぼやけてから次へ飛ぶためキーボードが開閉して見える。
 * （`blurOnSubmit` は deprecated。使わない）
 *
 * @see .claude/rules/mobile-uiux.md §3
 */
export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  purpose,
  isDisabled,
  isInvalid,
  toggleLabels,
  inputRef,
  enterKeyHint = 'done',
  onSubmitEditing,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  /** 入力の意味。ここからキーボード種別とオートフィル属性が決まる */
  purpose: AuthFieldPurpose
  isDisabled?: boolean
  isInvalid?: boolean
  /** パスワード欄の表示切替ラベル（i18n 済みの文字列を渡す） */
  toggleLabels?: { show: string; hide: string }
  /** 次の欄へフォーカスを渡すための ref */
  inputRef?: Ref<TextInput>
  /** 次の欄があるなら 'next'、最後の欄は 'done' / 'go' */
  enterKeyHint?: 'next' | 'done' | 'go' | 'send'
  onSubmitEditing?: () => void
}) {
  const [visible, setVisible] = useState(false)
  const attributes = resolveAuthFieldAttributes(purpose, currentPlatform())
  const canToggle = attributes.secureTextEntry === true && toggleLabels !== undefined

  return (
    <VStack className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <Input isDisabled={isDisabled} isInvalid={isInvalid}>
        <InputField
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          {...attributes}
          secureTextEntry={attributes.secureTextEntry === true && !visible}
          enterKeyHint={enterKeyHint}
          // フォーカスを保ったままイベントだけ飛ばす（次の欄へ渡すため）
          submitBehavior={enterKeyHint === 'next' ? 'submit' : 'blurAndSubmit'}
          onSubmitEditing={onSubmitEditing}
          editable={!isDisabled}
        />
        {canToggle ? (
          <Pressable
            onPress={() => setVisible((previous) => !previous)}
            accessibilityRole="button"
            accessibilityLabel={visible ? toggleLabels.hide : toggleLabels.show}
            // アイコン相当の小さな標的なので、見た目を変えずにヒットエリアを 44pt 相当へ広げる
            // （WCAG 2.2 SC 2.5.8 の 24x24 は下限。主要操作は 44x44 を既定にする）
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
