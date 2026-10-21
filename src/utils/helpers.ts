export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(d)
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key])
    ;(groups[groupKey] = groups[groupKey] || []).push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T | ((item: T) => number | string), direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key]
    const bVal = typeof key === 'function' ? key(b) : b[key]
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return direction === 'asc' ? comparison : -comparison
  })
}

export function sumBy<T>(array: T[], key: keyof T | ((item: T) => number)): number {
  return array.reduce((sum, item) => {
    const val = typeof key === 'function' ? key(item) : Number(item[key])
    return sum + (val || 0)
  }, 0)
}

export function uniqueBy<T>(array: T[], key: keyof T | ((item: T) => string)): T[] {
  const seen = new Set<string>()
  return array.filter((item) => {
    const k = typeof key === 'function' ? key(item) : String(item[key])
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function parseMermaidError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('Parse error')) return 'Invalid diagram syntax'
    if (msg.includes('timeout')) return 'Diagram rendering timed out'
    return msg
  }
  return 'Failed to render diagram'
}

export function validateCourseInput(input: Partial<import('../types').CourseInput>): string[] {
  const errors: string[] = []
  if (!input.subject?.trim()) errors.push('Subject is required')
  if (!input.knowledgeLevel) errors.push('Knowledge level is required')
  if (!input.timePerDayMinutes || input.timePerDayMinutes < 5) errors.push('Minimum 5 minutes per day required')
  if (!input.targetDurationDays || input.targetDurationDays < 1) errors.push('Target duration must be at least 1 day')
  if (!input.depth) errors.push('Depth level is required')
  return errors
}

export function estimateTotalHours(input: import('../types').CourseInput): number {
  const totalMinutes = input.timePerDayMinutes * input.targetDurationDays
  return Math.round(totalMinutes / 60 * 10) / 10
}

export function isRealisticSchedule(input: import('../types').CourseInput): { realistic: boolean; warning?: string } {
  const totalHours = estimateTotalHours(input)
  const depthMultiplier = { quick: 1, thorough: 1.5, mastery: 2.5 }
  const estimatedHoursNeeded = 20 * depthMultiplier[input.depth]
  
  if (totalHours < estimatedHoursNeeded * 0.3) {
    return { 
      realistic: false, 
      warning: `This schedule provides ~${totalHours}h but ${input.depth} depth typically needs ~${estimatedHoursNeeded}h. Consider more time or lower depth.` 
    }
  }
  if (totalHours < estimatedHoursNeeded) {
    return { 
      realistic: true, 
      warning: `This is an intensive schedule. ${totalHours}h for ${input.depth} depth (typically ${estimatedHoursNeeded}h).` 
    }
  }
  return { realistic: true }
}