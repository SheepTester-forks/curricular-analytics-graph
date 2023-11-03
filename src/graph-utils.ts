export type Graph<T> = {
  inNeighbors: (node: T) => T[]
  outNeighbors: (node: T) => T[]
}

function reachable<T> (graph: Graph<T>, node: T): Set<T> {
  const reachable = new Set<T>([node])
  const toVisit: T[] = [node]
  let next: T | undefined
  while ((next = toVisit.pop())) {
    for (const neighbor of graph.outNeighbors(next)) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor)
        toVisit.push(neighbor)
      }
    }
  }
  return reachable
}

export function blockingFactor<T> (graph: Graph<T>, node: T): number {
  return reachable(graph, node).size
}

export function allPaths<T> (graph: Graph<T>, nodes: T[]): T[][] {
  const paths: T[][] = []
  for (const source of nodes) {
    // Only consider source nodes
    if (
      graph.outNeighbors(source).length === 0 ||
      graph.inNeighbors(source).length > 0
    ) {
      continue
    }

    const toVisit: T[][] = [[source]]
    let path: T[] | undefined
    while ((path = toVisit.pop())) {
      for (const node of graph.outNeighbors(path[0])) {
        const newPath = [...path, node]
        // If reached a sink, then the path is done
        if (graph.outNeighbors(node).length === 0) {
          paths.push(newPath)
        } else {
          toVisit.push(newPath)
        }
      }
    }
  }
  return paths
}

/**
 * Courses that are not connected to the graph are not included in the `Map`.
 * The default delay factor is 1.
 */
export function delayFactors<T> (allPaths: T[][]): Map<T, number> {
  const delayFactors = new Map<T, number>()
  for (const path of allPaths) {
    for (const node of path) {
      delayFactors.set(node, Math.max(delayFactors.get(node) ?? 1, path.length))
    }
  }
  return delayFactors
}

/**
 * The default complexity is 1.
 */
export function complexities<T> (
  blockingFactors: Map<T, number>,
  delayFactors: Map<T, number>,
  system: 'semester' | 'quarter'
): Map<T, number> {
  const nodes = new Set(blockingFactors.keys())
  for (const node of delayFactors.keys()) {
    nodes.add(node)
  }
  const complexities = new Map<T, number>()
  for (const node of nodes) {
    const sum = (blockingFactors.get(node) ?? 0) + (delayFactors.get(node) ?? 1)
    complexities.set(
      node,
      system === 'quarter' ? +((sum * 2) / 3).toFixed(1) : sum
    )
  }
  return complexities
}

export function centrality<T> (allPaths: T[][], node: T): number {
  let centrality = 0
  for (const path of allPaths) {
    if (
      path.includes(node) &&
      path.length > 2 &&
      path[0] !== node &&
      path.at(-1) !== node
    ) {
      centrality += path.length
    }
  }
  return centrality
}

export function redundantRequisites<T> (graph: Graph<T>, nodes: T[]): [T, T][] {
  const redundant = new Map<T, Set<T>>()
  for (const node of nodes) {
    if (graph.inNeighbors(node).length === 0) {
      continue
    }
    const nodeNeighbors = graph.outNeighbors(node)
    const toVisit = [...nodeNeighbors]
    let next: T | undefined
    while ((next = toVisit.pop())) {
      const neighbors = graph.outNeighbors(next)
      toVisit.push(...neighbors)

      for (const neighbor of neighbors) {
        // Definitely not redundant requisite
        if (nodeNeighbors.includes(neighbor)) {
          continue
        }

        // NOTE: Currently does not check for coreqs (low priority because UCSD
        // doesn't have many coreqs)

        const reqs = redundant.get(neighbor) ?? new Set()
        reqs.add(node)
        if (!redundant.has(neighbor)) {
          redundant.set(neighbor, reqs)
        }
      }
    }
  }
  return Array.from(redundant, ([node, reqs]) =>
    Array.from(reqs, (req): [T, T] => [req, node])
  ).flat()
}
