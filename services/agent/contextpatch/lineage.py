from __future__ import annotations

from collections import deque
from typing import Any, Dict, Iterable, List, Set, Tuple

from .models import ImpactGraph, ImpactedAsset


def build_impact_graph(
    snapshot: Dict[str, Any], source_urn: str, changed_fields: Iterable[str], max_hops: int = 3
) -> ImpactGraph:
    changed = set(changed_fields)
    entities = snapshot["entities"]
    edges = snapshot["edges"]
    outgoing: Dict[str, List[Dict[str, Any]]] = {}
    for edge in edges:
        outgoing.setdefault(edge["source"], []).append(edge)

    queue = deque([(source_urn, 0, [source_urn])])
    best_distance: Dict[str, int] = {source_urn: 0}
    paths: Dict[str, List[str]] = {}
    incoming_evidence: Dict[str, List[str]] = {}
    direct: Set[str] = set()

    while queue:
        current, distance, path = queue.popleft()
        if distance >= max_hops:
            continue
        for edge in outgoing.get(current, []):
            target = edge["target"]
            edge_fields = set(edge.get("fields", []))
            next_distance = distance + 1
            if current == source_urn and edge_fields & changed:
                direct.add(target)
            incoming_evidence.setdefault(target, []).append(edge["evidenceId"])
            if target not in best_distance or next_distance < best_distance[target]:
                best_distance[target] = next_distance
                paths[target] = path + [target]
                queue.append((target, next_distance, path + [target]))

    nodes: List[ImpactedAsset] = []
    for urn, distance in sorted(best_distance.items(), key=lambda item: (item[1], item[0])):
        if urn == source_urn:
            continue
        entity = entities.get(urn, {})
        level = "direct" if urn in direct else "indirect"
        nodes.append(
            ImpactedAsset(
                urn=urn,
                display_name=entity.get("displayName", urn.rsplit(",", 1)[-1].rstrip(")")),
                asset_type=entity.get("type", "dataset"),
                impact_level=level,
                impact_reason=(
                    "Directly references a changed provider field."
                    if level == "direct"
                    else "Consumes output from an impacted downstream path."
                ),
                impacted_fields=sorted(changed if level == "direct" else set(entity.get("canonicalFields", []))),
                lineage_distance=distance,
                owner=entity.get("owner", "Unassigned"),
                business_criticality=entity.get("criticality", "normal"),
                evidence_references=sorted(set(incoming_evidence.get(urn, []))),
                recommended_action=("Patch and test field mapping." if level == "direct" else "Run downstream regression checks."),
            )
        )

    critical_paths = [path for urn, path in paths.items() if entities.get(urn, {}).get("criticality") == "critical"]
    owners = sorted({node.owner for node in nodes if node.owner != "Unassigned"})
    domains = sorted({entities[node.urn].get("domain", "Unknown") for node in nodes})
    direct_count = sum(node.impact_level == "direct" for node in nodes)
    indirect_count = sum(node.impact_level == "indirect" for node in nodes)
    evidence_count = sum(bool(node.evidence_references) for node in nodes)
    return ImpactGraph(
        nodes=nodes,
        edges=[edge for edge in edges if edge["source"] in best_distance and edge["target"] in best_distance],
        critical_paths=critical_paths,
        affected_owners=owners,
        affected_domains=domains,
        blast_radius={"direct": direct_count, "indirect": indirect_count, "total": len(nodes)},
        unresolved_assets=[node.urn for node in nodes if node.owner == "Unassigned"],
        evidence_coverage=round(evidence_count / len(nodes), 3) if nodes else 1.0,
    )

