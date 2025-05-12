import fetchMock from 'jest-fetch-mock'

global.fetch = fetchMock

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn()
}))
jest.mock('@hapi/jwt', () => ({
  __esModule: true,
  default: { token: { decode: jest.fn() } }
}))
jest.mock('@hapi/bell', () => ({
  __esModule: true,
  default: {}
}))
