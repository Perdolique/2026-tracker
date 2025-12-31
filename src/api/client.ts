import ky, { type KyInstance, type HTTPError } from 'ky'

interface ApiErrorBody {
  error?: string
}

// Extract error message from API response body
async function extractErrorMessage(error: HTTPError): Promise<HTTPError> {
  const { response } = error

  if (response) {
    try {
      const body = await response.clone().json() as ApiErrorBody
      if (body.error) {
        error.message = body.error
      }
    } catch {
      // Response is not JSON, keep original message
    }
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
