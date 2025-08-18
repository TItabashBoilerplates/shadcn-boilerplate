import { TypographyExamplePageUI } from './ui'
import { TypographyExamplePageProps } from './model'

export function TypographyExamplePage(props: TypographyExamplePageProps) {
  return <TypographyExamplePageUI {...props} />
}

export * from './model'
export * from './ui'