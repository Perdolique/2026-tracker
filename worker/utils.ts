import type { Context } from 'hono'

/**
 * Get the base URL for OAuth redirects.
 * Uses REDIRECT_BASE_URL from environment if set, otherwise extracts origin from the current request.
 * 
 * @param context - Hono context with environment bindings
 * @returns The base URL (origin) to use for constructing redirect URIs
 * @throws {Error} If the request URL is invalid when REDIRECT_BASE_URL is not set
 */
export function getRedirectBaseUrl(context: Context): string {
  if (context.env.REDIRECT_BASE_URL) {
    return context.env.REDIRECT_BASE_URL
  }
  
  try {
    return new URL(context.req.url).origin
  } catch (error) {
    throw new Error('Invalid request URL and REDIRECT_BASE_URL not configured', { cause: error })
  }
}

/**
 * Get the Twitch OAuth callback URL.
 * Constructs the full callback URL using the redirect base URL.
 * 
 * @param context - Hono context with environment bindings
 * @returns The full Twitch callback URL
 * @throws {Error} If the base URL is invalid or cannot be constructed
 */
export function getTwitchCallbackUrl(context: Context): string {
  const baseUrl = getRedirectBaseUrl(context)
  
  try {
    return new URL('/api/auth/twitch/callback', baseUrl).toString()
  } catch (error) {
    throw new Error('Failed to construct Twitch callback URL', { cause: error })
  }
}
