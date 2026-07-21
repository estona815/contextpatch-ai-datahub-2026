// Generated contract surface from packages/schemas/contextpatch.schema.json.
// Keep JSON field names camelCase at every service boundary.

export type ImpactLevel = 'direct' | 'indirect' | 'possible' | 'informational'
export type ChangeType =
  | 'rename'
  | 'typeChange'
  | 'unitChange'
  | 'nullableChange'
  | 'split'
  | 'merge'
  | 'removed'
  | 'added'
  | 'semanticChange'
  | 'unknown'

export interface IncidentReport {
  incidentId: string
  title: string
  description: string
  reportedAt: string
  environment: string
  sourceAssetHint: string
  observedSymptoms: string[]
  suspectedChange: string
  repositoryPath: string
  requestedActions: string[]
  constraints: string[]
  reporter: string
  status: string
  synthetic?: boolean
}

export interface SchemaChange {
  changeId: string
  oldField: string
  newField: string
  changeType: ChangeType
  nameSimilarity: number
  semanticSimilarity: number
  typeCompatibility: string
  unitCompatibility: string
  evidence: string[]
  assumptions: string[]
  confidence: number
  requiresHumanConfirmation: boolean
}

export interface ImpactedAsset {
  urn: string
  displayName: string
  assetType: string
  impactLevel: ImpactLevel
  impactReason: string
  impactedFields: string[]
  lineageDistance: number
  owner: string
  businessCriticality: string
  evidenceReferences: string[]
  recommendedAction: string
}

export interface ImpactGraph {
  nodes: ImpactedAsset[]
  edges: Array<Record<string, unknown>>
  criticalPaths: string[][]
  affectedOwners: string[]
  affectedDomains: string[]
  blastRadius: { direct: number; indirect: number; total: number }
  unresolvedAssets: string[]
  evidenceCoverage: number
}

export interface PatchFile {
  path: string
  operation: 'create' | 'modify' | 'delete'
  language: string
  purpose: string
  relatedAssets: string[]
  evidenceReferences: string[]
  originalHash: string
  proposedContent: string
  diff: string
  validationCommands: string[]
}

export interface PatchPlan {
  patchId: string
  incidentId: string
  summary: string
  strategy: string
  assumptions: string[]
  files: PatchFile[]
  commands: string[]
  validationPlan: string[]
  rollbackPlan: string[]
  writeBackPlan: Record<string, unknown>
  unresolvedQuestions: string[]
  riskLevel: string
  confidence: number
  requiresApproval: true
}

export interface ValidationCheck {
  name: string
  passed: boolean
  detail: string
}

export interface ValidationResult {
  validationId: string
  patchId: string
  checks: ValidationCheck[]
  passed: boolean
  failedChecks: string[]
  warnings: string[]
  dataComparison: Record<string, Record<string, string | number>>
  startedAt: string
  completedAt: string
  logs: string[]
  repairAttempted: boolean
  finalStatus: 'passed' | 'blocked'
}

export interface AgentTraceEvent {
  traceId: string
  timestamp: string
  stage: string
  tool: string
  requestSummary: string
  responseSummary: string
  evidenceIds: string[]
  decision: string
  result: string
  durationMs: number
  error: string | null
  fallbackUsed: boolean
}

export interface WriteBackPreview {
  mode: string
  requiresApproval: true
  approved: boolean
  affectedUrns: string[]
  operations: Array<Record<string, unknown>>
  patchId: string
  validationStatus: string
  executionResults: unknown[]
  note: string
}

export interface ReplayOutcome {
  mode: 'replay'
  incident: IncidentReport
  schemaChanges: SchemaChange[]
  impactGraph: ImpactGraph
  patchPlan: PatchPlan
  validation: ValidationResult
  trace: AgentTraceEvent[]
  writeBackPreview: WriteBackPreview
  warnings: string[]
}

