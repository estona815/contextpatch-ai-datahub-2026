# Risk register

| Risk | Likelihood | Impact | Mitigation / status |
| --- | --- | --- | --- |
| Judges require live DataHub proof | High | High | Largest gap; record Full Mode only after real ingestion/MCP/write-back validation |
| Static replay mistaken for live | Medium | High | Persistent labels, disclosure files, manifest limitations |
| No hosted URL or video | High until completed | High | Keep placeholders explicit; user must publish and attach links |
| Deterministic provider seen as insufficient AI | Medium | High | Explain safe keyless architecture; add optional structured live provider only with key and evaluation |
| Patch template overfits one incident | High | Medium | 25-case router suite exists, but multi-incident code generation is not evaluated |
| Transitive dependency drift | Medium | Medium | JS lockfile and direct Python pins; add committed Python lock/hashes |
| Regex injection detection misses variants | Medium | High in Full Mode | Revalidate outputs, segregate instruction/data, red-team live provider |
| Filesystem symlink escape | Low in current controlled repo | High | Use fresh sandbox; add resolved-path containment before Full Mode |
| Name collision/legal clearance | Low/unknown | Medium | Search found no identical product; no trademark clearance performed |
| Submission deadline/time zone error | Low | High | Deadline recorded as 2026-08-11 06:00 KST; verify again before submit |
