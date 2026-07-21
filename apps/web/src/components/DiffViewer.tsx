import type { PatchFile } from '../../../../packages/shared/src/types'
import { Icon } from '../icons'

interface DiffLine {
  left: string
  right: string
  kind: 'context' | 'remove' | 'add'
}

function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split('\n').filter((line) => line && !line.startsWith('---') && !line.startsWith('+++') && !line.startsWith('@@'))
  const result: DiffLine[] = []
  lines.forEach((line) => {
    if (line.startsWith('-')) result.push({ left: line.slice(1), right: '', kind: 'remove' })
    else if (line.startsWith('+')) result.push({ left: '', right: line.slice(1), kind: 'add' })
    else result.push({ left: line.slice(1), right: line.slice(1), kind: 'context' })
  })
  return result.slice(0, 26)
}

interface DiffViewerProps {
  file: PatchFile
  files: PatchFile[]
  onSelectFile: (path: string) => void
}

export function DiffViewer({ file, files, onSelectFile }: DiffViewerProps) {
  const lines = parseDiff(file.diff)
  return (
    <section className="diff-viewer" aria-label="Patch diff">
      <div className="diff-target-row">
        <span>Target</span>
        <Icon name="document" />
        <select value={file.path} onChange={(event) => onSelectFile(event.target.value)} aria-label="Select generated file">
          {files.map((item) => <option value={item.path} key={item.path}>{item.path}</option>)}
        </select>
      </div>
      <div className="split-diff">
        <div className="diff-pane">
          <div className="diff-pane-title remove">− Current replay snapshot</div>
          <ol>
            {lines.map((line, index) => (
              <li className={line.kind === 'remove' ? 'removed' : line.kind === 'add' ? 'empty' : ''} key={`left-${index}`}>
                <code>{line.left || ' '}</code>
              </li>
            ))}
          </ol>
        </div>
        <div className="diff-pane">
          <div className="diff-pane-title add">+ Proposed patch</div>
          <ol>
            {lines.map((line, index) => (
              <li className={line.kind === 'add' ? 'added' : line.kind === 'remove' ? 'empty' : ''} key={`right-${index}`}>
                <code>{line.right || ' '}</code>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <details className="why-row">
        <summary><strong>Why?</strong><span>{file.purpose}</span><em>View evidence</em><Icon name="chevron" /></summary>
        <div className="why-detail">
          <p><b>DataHub assets:</b> {file.relatedAssets.slice(0, 3).join(' · ')}</p>
          <p><b>Evidence:</b> {file.evidenceReferences.join(' · ')}</p>
          <p><b>Validation:</b> {file.validationCommands.join(' · ')}</p>
        </div>
      </details>
    </section>
  )
}

