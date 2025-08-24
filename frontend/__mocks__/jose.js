// Mock for 'jose' JWT library used in authentication

const mockJWT = {
  payload: {
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  },
  protectedHeader: {
    alg: 'HS256',
    typ: 'JWT',
  },
}

const mockEncryptedJWT = {
  payload: mockJWT.payload,
  protectedHeader: {
    alg: 'dir',
    enc: 'A256GCM',
  },
}

module.exports = {
  // JWT verification
  jwtVerify: jest.fn().mockImplementation(async (token, secret) => {
    if (token === 'invalid-token') {
      throw new Error('JWTInvalid')
    }
    return mockJWT
  }),

  // JWT signing
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setSubject: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-token'),
  })),

  // JWE encryption
  EncryptJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setSubject: jest.fn().mockReturnThis(),
    encrypt: jest.fn().mockResolvedValue('mock-encrypted-jwt'),
  })),

  // JWE decryption
  jwtDecrypt: jest.fn().mockImplementation(async (encryptedJWT, secret) => {
    if (encryptedJWT === 'invalid-encrypted-jwt') {
      throw new Error('JWEDecryptionFailed')
    }
    return mockEncryptedJWT
  }),

  // Key generation
  generateSecret: jest.fn().mockResolvedValue('mock-secret-key'),

  // Error types
  errors: {
    JWTExpired: class JWTExpired extends Error {
      constructor(message) {
        super(message)
        this.name = 'JWTExpired'
        this.code = 'ERR_JWT_EXPIRED'
      }
    },
    JWTInvalid: class JWTInvalid extends Error {
      constructor(message) {
        super(message)
        this.name = 'JWTInvalid'
        this.code = 'ERR_JWT_INVALID'
      }
    },
    JWEDecryptionFailed: class JWEDecryptionFailed extends Error {
      constructor(message) {
        super(message)
        this.name = 'JWEDecryptionFailed'
        this.code = 'ERR_JWE_DECRYPTION_FAILED'
      }
    },
  },

  // Utility functions for testing
  __setMockPayload: (payload) => {
    mockJWT.payload = { ...mockJWT.payload, ...payload }
    mockEncryptedJWT.payload = { ...mockEncryptedJWT.payload, ...payload }
  },

  __reset: () => {
    mockJWT.payload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    mockEncryptedJWT.payload = mockJWT.payload
  },
}