import readline from 'node:readline'

/** Entrée/sortie du terminal : saisie normale et saisie masquée (aucun écho du mot de passe). */
export function createTerminalIo({ input = process.stdin, output = process.stdout } = {}) {
  const rl = readline.createInterface({ input, output, terminal: Boolean(input.isTTY) })
  let muted = false
  const originalWrite = rl._writeToOutput?.bind(rl)
  rl._writeToOutput = (text) => {
    if (!muted) originalWrite?.(text)
  }

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve))

  return {
    isInteractive: Boolean(input.isTTY && output.isTTY),
    print: (line) => output.write(`${line}\n`),
    ask: (prompt) => question(prompt),
    async askSecret(prompt) {
      output.write(prompt)
      muted = true
      try {
        return await question('')
      } finally {
        muted = false
        output.write('\n')
      }
    },
    close: () => rl.close(),
  }
}
