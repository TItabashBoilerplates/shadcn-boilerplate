import { HomePageProps } from './model'
import { HomePageUI } from './ui'

export function HomePage(props: HomePageProps) {
  return <HomePageUI {...props} />
}

// public API
export type { HomePageProps }
