import { describe, it, expect } from 'vitest'
import { ChatError, ErrorCode, getErrorMessage } from '../../utils/errors'

describe('ChatError', () => {
  it('should create error with default message from ErrorCode', () => {
    const err = new ChatError(ErrorCode.NETWORK_ERROR)
    expect(err.code).toBe(ErrorCode.NETWORK_ERROR)
    expect(err.message).toBe('Network error.')
  })

  it('should create error with custom message override', () => {
    const err = new ChatError(ErrorCode.UNKNOWN_ERROR, 'custom detail')
    expect(err.code).toBe(ErrorCode.UNKNOWN_ERROR)
    expect(err.message).toBe('custom detail')
  })

  it('CONVERSATION_LIMIT should have a useful default message', () => {
    const err = new ChatError(ErrorCode.CONVERSATION_LIMIT)
    expect(err.message).toContain('limit')
    expect(err.message.length).toBeGreaterThan(5)
  })
})

describe('getErrorMessage', () => {
  it('should return distinct messages for known error codes', () => {
    const codes = [
      ErrorCode.CONVERSATION_LIMIT,
      ErrorCode.UNKNOWN_ERROR,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.UNAUTHORIZED,
      ErrorCode.CAPTCHA,
      ErrorCode.MODEL_INTERNAL_ERROR,
    ]
    const messages = codes.map((c) => getErrorMessage(c))
    // All should be non-empty strings
    for (const msg of messages) {
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
    }
    // All should be unique (except maybe UNKNOWN fallback)
    const unique = new Set(messages)
    expect(unique.size).toBeGreaterThanOrEqual(codes.length - 1)
  })

  it('should return generic fallback for unknown error codes', () => {
    const msg = getErrorMessage('NONEXISTENT_CODE' as ErrorCode)
    expect(msg).toBe('Unknown error.')
  })
})
