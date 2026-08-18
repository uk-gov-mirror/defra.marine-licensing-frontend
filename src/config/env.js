import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDotenv } from 'dotenv'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const oneDay = 1000 * 60 * 60 * 24
export const fourHoursMs = 14400000
export const oneWeekMs = 604800000
export const fiftyMB = 50_000_000 // 50 MB :== 50 * 1000 * 1000
export const localhost = 'http://localhost:3000'

export const isProduction = process.env.NODE_ENV === 'production'
export const isTest = process.env.NODE_ENV === 'test'
export const isDevelopment = process.env.NODE_ENV === 'development'

export const projectRoot = path.resolve(dirname, '../..')

if (isDevelopment) {
  configDotenv()
}
