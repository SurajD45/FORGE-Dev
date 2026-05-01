import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface ExplorerQuestion {
  question: string
  options: string[]
  type?: string
}

interface QuestionFormProps {
  questions: unknown[]
  pipelineId: string
  onSubmit: (answers: string[]) => Promise<void>
  isSubmitting: boolean
}

/**
 * Normalize a raw question from the API into a typed ExplorerQuestion.
 * Handles: string, {question, options}, {text, options}, and fallback.
 */
function parseQuestion(raw: unknown): ExplorerQuestion {
  if (typeof raw === 'string') {
    return { question: raw, options: [], type: 'hybrid' }
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    const question =
      typeof obj.question === 'string' ? obj.question :
      typeof obj.text === 'string' ? obj.text :
      String(raw)
    const options = Array.isArray(obj.options)
      ? obj.options.filter((o): o is string => typeof o === 'string')
      : []
    return { question, options, type: 'hybrid' }
  }
  return { question: String(raw), options: [], type: 'hybrid' }
}

export function QuestionForm({ questions, pipelineId, onSubmit, isSubmitting }: QuestionFormProps) {
  const questionList = (Array.isArray(questions) ? questions : []).map(parseQuestion)
  const [answers, setAnswers] = useState<string[]>(questionList.map(() => ''))

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleOptionClick = (questionIndex: number, option: string) => {
    setAnswers(prev => {
      const next = [...prev]
      // If the textarea already has text, append with a separator
      const current = next[questionIndex].trim()
      next[questionIndex] = current ? `${current}, ${option}` : option
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nonEmpty = answers.filter(a => a.trim().length > 0)
    if (nonEmpty.length === 0) return
    await onSubmit(answers)
  }

  const allAnswered = answers.every(a => a.trim().length > 0)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-amber-400" style={{ fontSize: '20px' }}>
            help_center
          </span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-forge-text">The Explorer Agent needs your input</h3>
          <p className="text-xs text-forge-muted mt-0.5">
            Pick a quick-select option or type a custom answer for each question.
          </p>
        </div>
      </div>

      {/* Questions form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {questionList.map((q, idx) => (
          <div key={idx} className="group">
            {/* Question label */}
            <label className="flex items-start gap-2 mb-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-md bg-forge-primary/15 text-forge-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <span className="text-sm text-forge-text font-medium leading-relaxed">
                {q.question}
              </span>
            </label>

            {/* Quick-Select Option Buttons */}
            {q.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2.5 ml-7">
                {q.options.map((option, optIdx) => {
                  const isSelected = answers[idx].includes(option)
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleOptionClick(idx, option)}
                      className={[
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                        'border cursor-pointer',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        isSelected
                          ? 'bg-forge-primary/20 border-forge-primary/40 text-forge-primary'
                          : 'bg-forge-surface-low border-forge-border/40 text-forge-muted hover:border-forge-primary/30 hover:text-forge-text hover:bg-forge-primary/5',
                      ].join(' ')}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Textarea for custom / combined answer */}
            <div className="ml-7">
              <textarea
                id={`question-${pipelineId}-${idx}`}
                value={answers[idx]}
                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                placeholder="Type your answer or click an option above…"
                rows={2}
                disabled={isSubmitting}
                className={[
                  'w-full rounded-xl px-4 py-3 text-sm',
                  'bg-forge-surface-low border transition-all duration-200',
                  'text-forge-text placeholder-forge-muted-dim',
                  'focus:outline-none focus:ring-2 focus:ring-forge-primary/40 focus:border-forge-primary/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'resize-none',
                  answers[idx].trim()
                    ? 'border-forge-primary/30'
                    : 'border-forge-border/40 hover:border-forge-border/60',
                ].join(' ')}
              />
            </div>
          </div>
        ))}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-forge-muted-dim">
            {answers.filter(a => a.trim()).length} / {questionList.length} answered
          </p>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!allAnswered || isSubmitting}
            size="md"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
            {isSubmitting ? 'Resuming pipeline…' : 'Submit Answers'}
          </Button>
        </div>
      </form>
    </div>
  )
}
