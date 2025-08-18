import { ThemeExamplePageUI } from './ui'
import { ThemeExamplePageProps } from './model'

export function ThemeExamplePage(props: ThemeExamplePageProps) {
  return <ThemeExamplePageUI {...props} />
}

export * from './model'
export * from './ui'