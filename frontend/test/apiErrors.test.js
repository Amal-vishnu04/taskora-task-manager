import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getApiErrorMessage } from '../src/api/errors.js'

function apiError(status, url = '/tasks', message = 'SQL connection string leaked') {
  return {
    config: { url },
    response: { status, data: { message } },
  }
}

test('maps API statuses to safe, user-facing messages', () => {
  const cases = [
    [400, '/tasks', 'Some information could not be accepted. Review your entries and try again.'],
    [401, '/tasks', 'Your session has expired. Please sign in again.'],
    [403, '/tasks', 'You do not have permission to do that.'],
    [404, '/tasks/42', 'That item is no longer available. Refresh and try again.'],
    [409, '/auth/register', 'An account with that email address already exists.'],
    [429, '/auth/login', 'Too many attempts. Please wait a moment and try again.'],
    [500, '/tasks', 'Taskora could not complete your request. Please try again shortly.'],
  ]

  for (const [status, url, expected] of cases) {
    const message = getApiErrorMessage(apiError(status, url))
    assert.equal(message, expected)
    assert.doesNotMatch(message, /SQL|connection string|JWT|secret/i)
  }
})

test('distinguishes invalid login credentials from an expired session', () => {
  assert.equal(getApiErrorMessage(apiError(401, '/auth/login')), 'Email or password is incorrect.')
  assert.equal(getApiErrorMessage(apiError(401, '/tasks')), 'Your session has expired. Please sign in again.')
})

test('maps timeout and network failures without exposing Axios details', () => {
  assert.equal(
    getApiErrorMessage({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }),
    'Taskora took too long to respond. Please try again.',
  )
  assert.equal(
    getApiErrorMessage({ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' }),
    'Unable to connect to Taskora. Please check your connection and try again.',
  )
})

test('uses the caller fallback for client-side errors without an HTTP request', () => {
  assert.equal(
    getApiErrorMessage(new Error('Unexpected upload response'), 'The image could not be validated.'),
    'The image could not be validated.',
  )
})