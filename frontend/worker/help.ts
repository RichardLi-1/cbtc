import { answerHelp } from '../src/help/answer'
import type { TrainPosition } from '../src/types/domain'

interface Env {
  ANTHROPIC_API_KEY?: string
  AI?: {
    run(model: string, input: Record<string, unknown>): Promise<{ response?: string }>
  }
}

export async function handleHelp(
  question: string,
  history: { role: string; content: string }[],
  trains: TrainPosition[],
  env: Env,
) {
  return answerHelp({
    question,
    history,
    trains,
    anthropicKey: env.ANTHROPIC_API_KEY,
    workersAi: env.AI,
  })
}
