import { test as teardown } from '@playwright/test'
import fs from 'fs'

teardown('cleanup', async ({ }) => {
  // Clean up authentication files
  const authFiles = [
    'playwright/.auth/user.json',
    'playwright/.auth/admin.json',
  ]

  authFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  })
})