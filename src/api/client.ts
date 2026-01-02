import ky, { type KyInstance, type HTTPError } from 'ky'
// oxlint-disable-next-line id-length
import * as v from 'valibot'

const ApiErrorBodySchema = v.object({
  error: v.optional(
    v.string()
  ),
})

// Extract error message from API response body
async function extractErrorMessage(error: HTTPError): Promise<HTTPError> {
  const { response } = error

  try {
    const body = await response.clone().json()
    const parsedError = v.parse(ApiErrorBodySchema, body)

    if (parsedError.error !== undefined) {
      error.message = parsedError.error
    }
  } catch {
    // Response is not JSON, keep original message
  }

  return error
}

// Base API client with /api prefix and error handling
export const api: KyInstance = ky.create({
  prefixUrl: '/api',
  timeout: 10_000,
  hooks: {
    beforeError: [extractErrorMessage],
  },
})
