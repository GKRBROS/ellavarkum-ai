const fs = require('fs')
const path = require('path')

const nextDir = path.join(process.cwd(), '.next')
const devMarkerPath = path.join(nextDir, '.safe-next-dev.json')

const isProcessAlive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const shouldBlockClear = () => {
  if (process.env.FORCE_NEXT_CACHE_CLEAR === 'true') return false
  if (!fs.existsSync(devMarkerPath)) return false

  try {
    const marker = JSON.parse(fs.readFileSync(devMarkerPath, 'utf8'))
    if (isProcessAlive(marker?.pid)) {
      console.warn('[clear-next-cache] Refusing to clear .next while dev server is running.')
      console.warn('[clear-next-cache] Stop the dev server first, or set FORCE_NEXT_CACHE_CLEAR=true to override.')
      return true
    }
  } catch {
    // If marker is unreadable, continue with cleanup.
  }

  return false
}

try {
  if (shouldBlockClear()) {
    process.exit(1)
  }

  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true })
    console.log('Cleared .next cache')
  } else {
    console.log('No .next cache to clear')
  }
} catch (error) {
  console.warn('Could not clear .next cache:', error?.message || error)
}
