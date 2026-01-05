import type { Context } from 'hono'

/**
 * Get the base URL for OAuth redirects.
 * Uses REDIRECT_BASE_URL from environment if set, otherwise extracts origin from the current request.
 * 
 * @param context - Hono context with environment bindings
 * @returns The base URL (origin) to use for constructing redirect URIs
 */
export function getRedirectBaseUrl(context: Context): string {
  return context.env.REDIRECT_BASE_URL ?? new URL(context.req.url).origin
}

/**
 * Get the Twitch OAuth callback URL.
 * Constructs the full callback URL using the redirect base URL.
 * 
 * @param context - Hono context with environment bindings
 * @returns The full Twitch callback URL
 */
export function getTwitchCallbackUrl(context: Context): string {
  const baseUrl = getRedirectBaseUrl(context)
  return new URL('/api/auth/twitch/callback', baseUrl).toString()
}
