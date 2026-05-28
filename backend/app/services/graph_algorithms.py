from collections import defaultdict, deque

from app.models.graph import GraphDocument, Link, Node


class CycleError(ValueError):
    pass


def assert_acyclic(nodes: list[Node], links: list[Link]) -> None:
    graph: dict[str, list[str]] = defaultdict(list)
    for link in links:
        graph[link.sourceNode].append(link.targetNode)

    colors = {node.id: 0 for node in nodes}

    def visit(node_id: str) -> bool:
        colors[node_id] = 1
        for child in graph[node_id]:
            if colors.get(child) == 1:
                return True
            if colors.get(child) == 0 and visit(child):
                return True
        colors[node_id] = 2
        return False

    if any(colors[node.id] == 0 and visit(node.id) for node in nodes):
        raise CycleError("Graph contains a recursive dependency.")


def kahn_order(graph_doc: GraphDocument) -> list[Node]:
    nodes_by_id = {node.id: node for node in graph_doc.nodes}
    outgoing: dict[str, list[str]] = defaultdict(list)
    indegree = {node.id: 0 for node in graph_doc.nodes}

    for link in graph_doc.links:
        outgoing[link.sourceNode].append(link.targetNode)
        indegree[link.targetNode] = indegree.get(link.targetNode, 0) + 1

    queue = deque([node_id for node_id, degree in indegree.items() if degree == 0])
    ordered: list[Node] = []

    while queue:
        node_id = queue.popleft()
        ordered.append(nodes_by_id[node_id])
        for child in outgoing[node_id]:
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    if len(ordered) != len(graph_doc.nodes):
        raise CycleError("Graph contains a recursive dependency.")

    return ordered
