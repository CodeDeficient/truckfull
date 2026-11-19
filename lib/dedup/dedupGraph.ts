import type { DedupEventInput, PairEvaluation, GraphEdge, ConnectedComponent, EvidenceStrength } from './dedupTypes';
import { DIAGNOSTIC_CLUSTER_SIZE_FLAG } from './dedupConstants';

const EDGE_STRENGTHS: ReadonlySet<EvidenceStrength> = new Set(['strong', 'moderate']);

export interface DedupGraph {
  readonly adjacency: ReadonlyMap<string, readonly GraphEdge[]>;
  readonly eventIds: readonly string[];
}

export function buildDedupGraph(
  events: readonly DedupEventInput[],
  evaluate: (a: DedupEventInput, b: DedupEventInput) => PairEvaluation,
): DedupGraph {
  const adjacency = new Map<string, GraphEdge[]>();

  for (const event of events) {
    adjacency.set(event.id, []);
  }

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      if (a.source === b.source) continue;

      const evaluation = evaluate(a, b);

      if (!EDGE_STRENGTHS.has(evaluation.strength)) continue;

      const edge: GraphEdge = {
        from: a.id,
        to: b.id,
        strength: evaluation.strength,
        reasons: evaluation.reasons,
        score: evaluation.score,
      };

      adjacency.get(a.id)!.push(edge);
      adjacency.get(b.id)!.push(edge);
    }
  }

  return {
    adjacency,
    eventIds: events.map((e) => e.id),
  };
}

export function findConnectedComponents(
  graph: DedupGraph,
  events: readonly DedupEventInput[],
): readonly ConnectedComponent[] {
  const visited = new Set<string>();
  const eventMap = new Map<string, DedupEventInput>();
  for (const event of events) {
    eventMap.set(event.id, event);
  }

  const components: ConnectedComponent[] = [];

  for (const startId of graph.eventIds) {
    if (visited.has(startId)) continue;

    const componentEventIds = new Set<string>();
    const componentEdges: GraphEdge[] = [];
    const stack = [startId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      componentEventIds.add(currentId);

      const edges = graph.adjacency.get(currentId);
      if (!edges) continue;

      for (const edge of edges) {
        const neighborId = edge.from === currentId ? edge.to : edge.from;

        if (!componentEdges.some((e) => e.from === edge.from && e.to === edge.to)) {
          componentEdges.push(edge);
        }

        if (!visited.has(neighborId)) {
          stack.push(neighborId);
        }
      }
    }

    const componentEvents: DedupEventInput[] = [];
    for (const id of componentEventIds) {
      const event = eventMap.get(id);
      if (event) componentEvents.push(event);
    }

    components.push({
      events: componentEvents,
      edges: componentEdges,
      flagged: componentEventIds.size > DIAGNOSTIC_CLUSTER_SIZE_FLAG,
    });
  }

  return components;
}
