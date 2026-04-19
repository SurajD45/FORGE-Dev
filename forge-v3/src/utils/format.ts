import { formatDistanceToNow, format } from 'date-fns'
import type { PipelineStatus } from '@/types/pipeline'

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'MMM d, yyyy · HH:mm')
}

export function formatStatus(status: PipelineStatus): string {
  const map: Record<PipelineStatus, string> = {
    queued:           'Queued',
    stage_1_running:  'Exploring',
    stage_2_running:  'Architecting',
    stage_3_running:  'Developing',
    stage_4_running:  'Reviewing',
    completed:        'Completed',
    failed:           'Failed',
  }
  return map[status]
}

export function getStatusColor(status: PipelineStatus): string {
  const map: Record<PipelineStatus, string> = {
    queued:           'text-forge-muted',
    stage_1_running:  'text-forge-primary',
    stage_2_running:  'text-forge-primary',
    stage_3_running:  'text-forge-primary',
    stage_4_running:  'text-forge-primary',
    completed:        'text-forge-success',
    failed:           'text-forge-danger',
  }
  return map[status]
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}