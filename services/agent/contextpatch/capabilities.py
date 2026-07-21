from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass(frozen=True)
class McpCapabilities:
    mode: str
    server_version_represented: str
    read_tools: List[str]
    mutation_tools: List[str]
    mutation_enabled: bool
    source: str

    def supports(self, tool: str) -> bool:
        return tool in self.read_tools or tool in self.mutation_tools

    def may_mutate(self, tool: str, approved: bool) -> bool:
        return self.mutation_enabled and approved and tool in self.mutation_tools


def load_recorded_capabilities(repository_root: Path) -> McpCapabilities:
    path = repository_root / "infra" / "mcp" / "capabilities-replay.json"
    value = json.loads(path.read_text(encoding="utf-8"))
    return McpCapabilities(
        mode=value["mode"],
        server_version_represented=value["serverVersionRepresented"],
        read_tools=value["readTools"],
        mutation_tools=value["mutationTools"],
        mutation_enabled=value["mutationEnabled"],
        source=value["source"],
    )
