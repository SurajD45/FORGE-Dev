export type PipelineStatus =
  | 'queued'
  | 'stage_1_running'
  | 'awaiting_user_input'
  | 'stage_2_running'
  | 'stage_3_running'
  | 'stage_4_running'
  | 'completed'
  | 'failed'

export type ArtifactType =
  | 'trd_json'
  | 'trd_md'
  | 'arch_json'
  | 'arch_md'
  | 'generated_file'
  | 'readme'
  | 'review_report'

export interface SubmitProjectRequest {
  project_idea: string
}

export interface SubmitProjectResponse {
  pipeline_id: string
  status: PipelineStatus
  message: string
}

export interface ResumeProjectRequest {
  pipeline_id: string
  answers: string[]
}

export interface PipelineStatusResponse {
  pipeline_id: string
  status: PipelineStatus
  current_stage: number
  created_at: string
  updated_at: string
  error_message: string | null
  project_idea: string | null
  questions: unknown[] | null
}

export interface ArtifactResponse {
  artifact_type: ArtifactType
  file_name: string
  download_url: string
}

export interface PipelineResultResponse {
  pipeline_id: string
  status: PipelineStatus
  artifacts: ArtifactResponse[]
  project_idea: string | null
}

export interface StageInfo {
  number: number
  label: string
  description: string
  status: 'waiting' | 'running' | 'complete' | 'failed' | 'paused'
}

export const STAGE_MAP: Record<PipelineStatus, number> = {
  queued:                0,
  stage_1_running:       1,
  awaiting_user_input:   1,
  stage_2_running:       2,
  stage_3_running:       3,
  stage_4_running:       4,
  completed:             5,
  failed:               -1,
}

export const STAGE_LABELS = [
  { number: 1, label: 'Explorer',  description: 'Analysing your idea'         },
  { number: 2, label: 'Architect', description: 'Designing file structure'     },
  { number: 3, label: 'Developer', description: 'Writing source code'          },
  { number: 4, label: 'Reviewer',  description: 'Validating and auto-fixing'   },
]