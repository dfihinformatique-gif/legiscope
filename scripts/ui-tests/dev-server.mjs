import { spawn } from "node:child_process"

const DEFAULT_TIMEOUT_MS = 120_000

async function waitForServer(url, timeoutMs, childProcess, logs) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(
        `Le serveur Vite s'est arrêté prématurément.\n${logs.join("")}`,
      )
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Le serveur n'est pas encore prêt.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Délai dépassé en attendant ${url}.\n${logs.join("")}`)
}

export async function startUiDevServer({
  cwd,
  port,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const logs = []
  const childProcess = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  )

  const onData = (chunk) => {
    logs.push(String(chunk))
    if (logs.length > 40) logs.shift()
  }

  childProcess.stdout?.on("data", onData)
  childProcess.stderr?.on("data", onData)

  await waitForServer(
    `http://127.0.0.1:${port}/`,
    timeoutMs,
    childProcess,
    logs,
  )

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async stop() {
      if (childProcess.exitCode !== null) return

      const waitForExit = () =>
        new Promise((resolve) => childProcess.once("exit", resolve))

      try {
        process.kill(-childProcess.pid, "SIGTERM")
      } catch {
        childProcess.kill("SIGTERM")
      }

      const gracefulExit = await Promise.race([
        waitForExit(),
        new Promise((resolve) => setTimeout(resolve, 3_000)),
      ])

      if (gracefulExit !== undefined || childProcess.exitCode !== null) return

      try {
        process.kill(-childProcess.pid, "SIGKILL")
      } catch {
        childProcess.kill("SIGKILL")
      }
      await waitForExit()
    },
  }
}
