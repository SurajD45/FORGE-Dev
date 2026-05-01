import { apiClient } from './client'
import type {
  SubmitProjectRequest,
  SubmitProjectResponse,
  PipelineStatusResponse,
  PipelineResultResponse,
  ResumeProjectRequest,
} from '@/types/pipeline'

export const pipelineApi = {
  submit: async (data: SubmitProjectRequest): Promise<SubmitProjectResponse> => {
    const response = await apiClient.post<SubmitProjectResponse>('/pipeline/submit', data)
    return response.data
  },

  getStatus: async (pipelineId: string): Promise<PipelineStatusResponse> => {
    const response = await apiClient.get<PipelineStatusResponse>(
      `/pipeline/status/${pipelineId}`
    )
    return response.data
  },

  getResult: async (pipelineId: string): Promise<PipelineResultResponse> => {
    const response = await apiClient.get<PipelineResultResponse>(
      `/pipeline/result/${pipelineId}`
    )
    return response.data
  },

  listRuns: async (): Promise<PipelineStatusResponse[]> => {
    const response = await apiClient.get<PipelineStatusResponse[]>('/pipeline/runs')
    return response.data
  },

  resume: async (data: ResumeProjectRequest): Promise<SubmitProjectResponse> => {
    const response = await apiClient.post<SubmitProjectResponse>('/pipeline/resume', data)
    return response.data
  },
}