'use client'
import { createInput } from '@gluestack-ui/core/input/creator'
import {
  useStyleContext,
  type VariantProps,
  withStyleContext,
} from '@gluestack-ui/utils/nativewind-utils'
import type { InputSize } from '@workspace/tokens/contract'
import type * as React from 'react'
import { TextInput, View } from 'react-native'

import { inputFieldStyle, inputIconStyle, inputStyle } from './variants'

const SCOPE = 'INPUT'

type StyleContext = {
  size?: InputSize
}

const UIInputRoot = withStyleContext(View, SCOPE)

/**
 * `ref` を**明示的に受けて素の `TextInput` へ渡す**。
 *
 * React 19 では `ref` は通常の prop なので実行時はスプレッドでも届くが、
 * `createInput()` を通すと型が `Ref<Props>` に潰れてしまい、
 * `Ref<TextInput>` を渡す呼び出し側が型エラーになる。
 * **複数入力の Enter キー連鎖（`onSubmitEditing` → 次の欄へ `focus()`）**に必要なので、
 * ここで型を保つ（`.claude/rules/mobile-uiux.md` §3）。
 */
type UIInputFieldProps = React.ComponentProps<typeof TextInput> & {
  className?: string
  ref?: React.Ref<TextInput>
}

const UIInputField = ({ className, ref, ...props }: UIInputFieldProps) => {
  const { size } = useStyleContext(SCOPE) as StyleContext
  return <TextInput ref={ref} className={inputFieldStyle({ size, class: className })} {...props} />
}

const UIInputIcon = ({
  className,
  as: AsComp,
  ...props
}: { className?: string; as?: React.ElementType } & Record<string, unknown>) => {
  const { size } = useStyleContext(SCOPE) as StyleContext
  if (!AsComp) {
    return null
  }
  return <AsComp className={inputIconStyle({ size, class: className })} {...props} />
}

const UIInputSlot = ({
  className,
  ...props
}: React.ComponentProps<typeof View> & { className?: string }) => (
  <View className={className} {...props} />
)

const AccessibleInput = createInput({
  Root: UIInputRoot,
  Icon: UIInputIcon,
  Slot: UIInputSlot,
  Input: UIInputField,
})

type InputVariantProps = VariantProps<typeof inputStyle>

export type InputProps = React.ComponentProps<typeof AccessibleInput> &
  InputVariantProps & { className?: string }

/**
 * Mobile の入力欄。
 *
 * Web の `@workspace/ui` の `Input` と**同じ役割・同じサイズ名**を持つ
 * （名前は `@workspace/tokens/contract` が正本）。
 *
 * ```tsx
 * <Input size="default" isInvalid={hasError}>
 *   <InputSlot className="pr-2"><InputIcon as={MailIcon} /></InputSlot>
 *   <InputField placeholder="you@example.com" autoComplete="email" />
 * </Input>
 * ```
 *
 * **`InputField` のフォントサイズを 14px 以下に上書きしないこと**
 * （`variants.ts` のコメント参照）。
 */
export function Input({ className, size, isInvalid, isDisabled, ...props }: InputProps) {
  return (
    <AccessibleInput
      context={{ size }}
      className={inputStyle({ size, isInvalid, isDisabled, class: className })}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      {...props}
    />
  )
}

/**
 * `createInput()` は内部で ref を **`Ref<Props>`** として型付けしてしまう
 * （実体は `UIInputField` が素の `TextInput` へ渡すので、**実行時は正しく
 * `TextInput` のインスタンスが入る**）。この誤った型のままだと
 * `Ref<TextInput>` を渡す呼び出し側がコンパイルできず、
 * **複数入力の Enter キー連鎖（次の欄へ `focus()`）が書けない**。
 *
 * 上流の型だけを正すための限定的なキャスト。`any` は使わず、
 * 実体と一致する `UIInputFieldProps` へ寄せている。
 */
export const InputField = AccessibleInput.Input as unknown as React.FC<UIInputFieldProps>
export const InputIcon = AccessibleInput.Icon
export const InputSlot = AccessibleInput.Slot
