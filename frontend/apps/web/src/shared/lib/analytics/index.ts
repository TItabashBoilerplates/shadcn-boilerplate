/**
 * Analytics（PostHog）public API — Web
 *
 * @module shared/lib/analytics
 */
export { AnalyticsIdentity } from './AnalyticsIdentity'
export type { AnalyticsProperties } from './posthog'
export { captureEvent, identifyUser, resetUser } from './posthog'
