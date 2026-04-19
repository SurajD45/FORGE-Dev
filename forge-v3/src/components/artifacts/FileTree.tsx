import { ArtifactResponse } from '@/types/pipeline'
import { useState } from 'react'

interface FileTreeProps {
  artifacts: ArtifactResponse[]
  onSelectFile: (artifact: ArtifactResponse) => void
  selectedFile: ArtifactResponse | null
}

export function FileTree({ artifacts, onSelectFile, selectedFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'generated': true,
    'docs': true,
  })

  // Group artifacts by category
  const sourceFiles = artifacts.filter(a => a.artifact_type === 'generated_file')
  const docs = artifacts.filter(a => 
    ['trd_md', 'arch_md', 'readme', 'review_report'].includes(a.artifact_type)
  )
  const jsonFiles = artifacts.filter(a => 
    ['trd_json', 'arch_json'].includes(a.artifact_type)
  )

  const toggleExpanded = (section: string) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const FileItem = ({ artifact, isSelected }: { artifact: ArtifactResponse; isSelected: boolean }) => (
    <button
      onClick={() => onSelectFile(artifact)}
      className={[
        'w-full text-left px-3 py-2 rounded text-sm transition-colors',
        isSelected
          ? 'bg-forge-primary/20 text-forge-primary border border-forge-primary/30'
          : 'text-forge-muted hover:text-forge-text hover:bg-forge-border',
      ].join(' ')}
    >
      <span className="font-mono">{artifact.file_name}</span>
    </button>
  )

  return (
    <div className="space-y-2 text-sm">
      {/* Source Files */}
      {sourceFiles.length > 0 && (
        <div>
          <button
            onClick={() => toggleExpanded('generated')}
            className="flex items-center gap-2 w-full px-3 py-2 text-forge-text hover:bg-forge-border rounded transition-colors font-medium"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded['generated'] ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            📁 Generated Files ({sourceFiles.length})
          </button>
          {expanded['generated'] && (
            <div className="pl-4 space-y-1">
              {sourceFiles.map(artifact => (
                <FileItem
                  key={artifact.file_name}
                  artifact={artifact}
                  isSelected={selectedFile?.file_name === artifact.file_name}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documentation */}
      {docs.length > 0 && (
        <div>
          <button
            onClick={() => toggleExpanded('docs')}
            className="flex items-center gap-2 w-full px-3 py-2 text-forge-text hover:bg-forge-border rounded transition-colors font-medium"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded['docs'] ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            📄 Documentation ({docs.length})
          </button>
          {expanded['docs'] && (
            <div className="pl-4 space-y-1">
              {docs.map(artifact => (
                <FileItem
                  key={artifact.file_name}
                  artifact={artifact}
                  isSelected={selectedFile?.file_name === artifact.file_name}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* JSON Files */}
      {jsonFiles.length > 0 && (
        <div>
          <button
            onClick={() => toggleExpanded('json')}
            className="flex items-center gap-2 w-full px-3 py-2 text-forge-text hover:bg-forge-border rounded transition-colors font-medium"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded['json'] ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            ⚙️ Configuration ({jsonFiles.length})
          </button>
          {expanded['json'] && (
            <div className="pl-4 space-y-1">
              {jsonFiles.map(artifact => (
                <FileItem
                  key={artifact.file_name}
                  artifact={artifact}
                  isSelected={selectedFile?.file_name === artifact.file_name}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}