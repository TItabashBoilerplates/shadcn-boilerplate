/**
 * Analytics（PostHog）public API — Web
 *
 * @module shared/lib/analytics
 */
export { AnalyticsIdentity } from './AnalyticsIdentity'
export type { AnalyticsProperties } from './posthog'
export {
  captureEvent,
  hasAnalyticsDecision,
  identifyUser,
  isAnalyticsConfigured,
  optInAnalytics,
  optOutAnalytics,
  resetUser,
} from './posthog'
