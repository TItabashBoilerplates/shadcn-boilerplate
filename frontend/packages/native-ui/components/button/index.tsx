'use client'
import { createButton } from '@gluestack-ui/core/button/creator'
import type { VariantProps } from '@gluestack-ui/nativewind-utils'
import { tva } from '@gluestack-ui/nativewind-utils/tva'
import { useStyleContext, withStyleContext } from '@gluestack-ui/nativewind-utils/withStyleContext'
import { buttonRecipe, pickSlot } from '@workspace/tokens/variants'
import type * as React from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

const SCOPE = 'BUTTON'

/**
 * バリアント名・サイズ名・セマンティックトークンは `@workspace/tokens/variants` が
 * single source of truth。Web の `@workspace/ui` の Button と同じ API になっている。
 * ここで色を直書きしないこと（`.claude/rules/frontend.md`）。
 */
const buttonStyle = tva({
  base: 'flex-row items-center justify-center gap-2',
  variants: {
    variant: pickSlot(buttonRecipe.variant, 'container'),
    size: pickSlot(buttonRecipe.size, 'container'),
    isDisabled: {
      true: buttonRecipe.disabled.container,
      false: '',
    },
  },
  defaultVariants: buttonRecipe.defaultVariants,
})

const buttonTextStyle = tva({
  base: 'font-medium',
  variants: {
    variant: pickSlot(buttonRecipe.variant, 'label'),
    size: pickSlot(buttonRecipe.size, 'label'),
  },
  defaultVariants: buttonRecipe.defaultVariants,
})

const buttonIconStyle = tva({
  base: '',
  variants: {
    variant: pickSlot(buttonRecipe.variant, 'label'),
    size: buttonRecipe.iconSize,
  },
  defaultVariants: buttonRecipe.defaultVariants,
})

type StyleContext = {
  variant?: keyof typeof buttonRecipe.variant
  size?: keyof typeof buttonRecipe.size
}

const UIButton = withStyleContext(Pressable, SCOPE)

const UIButtonText = ({
  className,
  ...props
}: React.ComponentProps<typeof Text> & { className?: string }) => {
  const { variant, size } = useStyleContext(SCOPE) as StyleContext
  return <Text className={buttonTextStyle({ variant, size, class: className })} {...props} />
}

const UIButtonSpinner = ({
  className,
  ...props
}: React.ComponentProps<typeof ActivityIndicator> & { className?: string }) => {
  return <ActivityIndicator className={className} {...props} />
}

const UIButtonIcon = ({
  className,
  as: AsComp,
  ...props
}: { className?: string; as?: React.ElementType } & Record<string, unknown>) => {
  const { variant, size } = useStyleContext(SCOPE) as StyleContext
  if (!AsComp) {
    return null
  }
  return <AsComp className={buttonIconStyle({ variant, size, class: className })} {...props} />
}

const UIButtonGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof View> & { className?: string }) => {
  return <View className={className} {...props} />
}

const AccessibleButton = createButton({
  Root: UIButton,
  Text: UIButtonText,
  Group: UIButtonGroup,
  Spinner: UIButtonSpinner,
  Icon: UIButtonIcon,
})

type ButtonProps = React.ComponentProps<typeof AccessibleButton> &
  VariantProps<typeof buttonStyle> & {
    className?: string
  }

/**
 * Mobile Button。
 *
 * React 19 では ref は通常の prop として渡せるため forwardRef は使わない。
 * @see .claude/skills/upgrading-expo/references/react-19.md
 */
function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <AccessibleButton
      className={buttonStyle({ variant, size, class: className })}
      context={{ variant, size }}
      {...props}
    />
  )
}
Button.displayName = 'Button'

const ButtonText = AccessibleButton.Text
const ButtonSpinner = AccessibleButton.Spinner
const ButtonIcon = AccessibleButton.Icon
const ButtonGroup = AccessibleButton.Group

export type { ButtonProps }
export { Button, ButtonGroup, ButtonIcon, ButtonSpinner, ButtonText }
