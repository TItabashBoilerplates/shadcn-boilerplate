/**
 * Design Tokens: Component Variant Contract
 *
 * Web (shadcn/ui) / Mobile (gluestack-ui + NativeWind) / Desktop (Web 技術) で
 * **同じバリアント名・同じセマンティックトークン**を使うための共有定義。
 *
 * ここに含めてよいのは「両プラットフォームで有効な Tailwind ユーティリティ」だけ。
 * `hover:` `focus-visible:` `transition-*` などの Web 専用の装飾は
 * 各プラットフォームの実装側（`@workspace/ui` / `@workspace/native-ui`）で足す。
 *
 * @example
 * ```ts
 * import { buttonRecipe, pickSlot } from '@workspace/tokens/variants'
 *
 * buttonRecipe.variant.destructive.container // 'bg-destructive'
 * pickSlot(buttonRecipe.variant, 'container') // { default: 'bg-primary', ... }
 * ```
 */

/** バリアント 1 つあたりのクラス断片（コンテナ / ラベル） */
export type VariantSlots = {
  /** 押下領域（View / Pressable / button 要素）に当てるクラス */
  container: string
  /** ラベル（Text / span）に当てるクラス */
  label: string
}

export const buttonVariant = {
  default: {
    container: 'bg-primary',
    label: 'text-primary-foreground',
  },
  secondary: {
    container: 'bg-secondary',
    label: 'text-secondary-foreground',
  },
  destructive: {
    container: 'bg-destructive',
    label: 'text-destructive-foreground',
  },
  outline: {
    container: 'border border-input bg-background',
    label: 'text-foreground',
  },
  ghost: {
    container: 'bg-transparent',
    label: 'text-foreground',
  },
  link: {
    container: 'bg-transparent',
    label: 'text-primary underline',
  },
} as const satisfies Record<string, VariantSlots>

export const buttonSize = {
  sm: {
    container: 'h-8 px-3 rounded-md',
    label: 'text-sm',
  },
  default: {
    container: 'h-9 px-4 rounded-md',
    label: 'text-sm',
  },
  lg: {
    container: 'h-10 px-6 rounded-md',
    label: 'text-base',
  },
  icon: {
    container: 'h-9 w-9 rounded-md',
    label: 'text-sm',
  },
} as const satisfies Record<string, VariantSlots>

export type ButtonVariant = keyof typeof buttonVariant
export type ButtonSize = keyof typeof buttonSize

/**
 * サイズごとのアイコン寸法。Web の shadcn/ui は `[&_svg]:size-4` で表現するが、
 * React Native には子孫セレクタが無いためアイコンへ直接当てる。
 */
export const buttonIconSize = {
  sm: 'h-4 w-4',
  default: 'h-4 w-4',
  lg: 'h-5 w-5',
  icon: 'h-4 w-4',
} as const satisfies Record<ButtonSize, string>

/** 無効状態の見た目（両プラットフォーム共通） */
export const disabledSlots = {
  container: 'opacity-50',
  label: '',
} as const satisfies VariantSlots

export const buttonRecipe = {
  variant: buttonVariant,
  size: buttonSize,
  iconSize: buttonIconSize,
  disabled: disabledSlots,
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
} as const satisfies {
  variant: Record<ButtonVariant, VariantSlots>
  size: Record<ButtonSize, VariantSlots>
  iconSize: Record<ButtonSize, string>
  disabled: VariantSlots
  defaultVariants: { variant: ButtonVariant; size: ButtonSize }
}

/**
 * バリアント定義から 1 スロットぶんのクラスマップを取り出す。
 *
 * キーの型を保つので、`cva` / `tva` に渡したときに variant 名の型推論が効く。
 */
export function pickSlot<
  Slots extends Record<string, VariantSlots>,
  Slot extends keyof VariantSlots,
>(slots: Slots, slot: Slot): { [Key in keyof Slots]: string } {
  return Object.fromEntries(Object.entries(slots).map(([key, value]) => [key, value[slot]])) as {
    [Key in keyof Slots]: string
  }
}
