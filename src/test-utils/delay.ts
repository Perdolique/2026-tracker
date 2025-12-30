/**
 * Delay utility for tests — use instead of new Promise + setTimeout
 * eslint-disable-next-line eslint-plugin-promise/avoid-new -- intentional Promise wrapper for setTimeout
 */
export const delay = (ms: number): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new -- required for setTimeout wrapping
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Wait for a condition to be true, with timeout
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 2000,
  interval = 50,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (condition()) {
      return
    }
    // eslint-disable-next-line eslint/no-await-in-loop -- intentional polling
    await delay(interval)
  }
  throw new Error('waitFor timeout')
}
