const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const mode = process.argv[2] || 'dev'
const nextBin = require.resolve('next/dist/bin/next')
const nextCmd = process.execPath
const nextArgs = [nextBin, mode, ...process.argv.slice(3)]
const nextDir = path.join(process.cwd(), '.next')
const devMarkerPath = path.join(nextDir, '.safe-next-dev.json')

const missingChunkRegex = /Cannot find module '\.\/chunks\/vendor-chunks|Cannot find module '\.\/chunks\/vendor-chunks\/@smithy|MODULE_NOT_FOUND[\s\S]*\.next\\server|MODULE_NOT_FOUND[\s\S]*\.next\/server|ENOENT[\s\S]*next-font-manifest\.json|ENOENT[\s\S]*routes-manifest\.json/i

const clearNextDir = () => {
  try {
    if (fs.existsSync(nextDir)) {
      fs.rmSync(nextDir, { recursive: true, force: true })
      console.log('[safe-next] Cleared .next directory')
    }
  } catch (error) {
    console.warn('[safe-next] Failed to clear .next:', error && error.message ? error.message : error)
  }
}

const writeDevMarker = () => {
  try {
    fs.mkdirSync(nextDir, { recursive: true })
    fs.writeFileSync(
      devMarkerPath,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2),
      'utf8'
    )
  } catch (error) {
    console.warn('[safe-next] Failed to write dev marker:', error && error.message ? error.message : error)
  }
}

const removeDevMarker = () => {
  try {
    if (fs.existsSync(devMarkerPath)) {
      fs.rmSync(devMarkerPath, { force: true })
    }
  } catch (error) {
    console.warn('[safe-next] Failed to remove dev marker:', error && error.message ? error.message : error)
  }
}

const runBuildWithRetry = () => {
  let retried = false

  const start = () => {
    const child = spawn(nextCmd, nextArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      env: process.env,
    })

    let output = ''

    const handle = (chunk, stream) => {
      const text = chunk.toString()
      output += text
      stream.write(chunk)
    }

    child.stdout.on('data', (chunk) => handle(chunk, process.stdout))
    child.stderr.on('data', (chunk) => handle(chunk, process.stderr))

    child.on('close', (code) => {
      if (code === 0) {
        process.exit(0)
      }

      if (!retried && missingChunkRegex.test(output)) {
        retried = true
        console.warn('[safe-next] Detected stale chunk/module cache issue during build. Retrying once after cleanup...')
        clearNextDir()
        start()
        return
      }

      process.exit(code || 1)
    })
  }

  start()
}

const runDevWithSelfHeal = () => {
  let restarted = false
  let healing = false
  let child = null

  const onSignal = (signal) => {
    removeDevMarker()
    if (child) child.kill(signal)
    process.exit(0)
  }

  process.on('SIGINT', () => onSignal('SIGINT'))
  process.on('SIGTERM', () => onSignal('SIGTERM'))

  const start = () => {
    writeDevMarker()

    child = spawn(nextCmd, nextArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      env: process.env,
    })

    const relay = (chunk, stream) => {
      const text = chunk.toString()
      stream.write(chunk)

      if (!restarted && !healing && missingChunkRegex.test(text)) {
        healing = true
        restarted = true
        console.warn('\n[safe-next] Detected stale vendor-chunk/module cache issue. Restarting dev server after cleaning .next...')
        clearNextDir()
        child.kill('SIGINT')
      }
    }

    child.stdout.on('data', (chunk) => relay(chunk, process.stdout))
    child.stderr.on('data', (chunk) => relay(chunk, process.stderr))

    child.on('close', (code) => {
      if (healing) {
        healing = false
        start()
        return
      }

      removeDevMarker()
      process.exit(code || 0)
    })
  }

  start()
}

if (mode === 'build') {
  runBuildWithRetry()
} else if (mode === 'dev') {
  runDevWithSelfHeal()
} else {
  const child = spawn(nextCmd, nextArgs, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  })
  child.on('close', (code) => process.exit(code || 0))
}
