from typing import Any, Literal

from pydantic import BaseModel, Field


NodeType = Literal["input", "prompt", "llm", "vector", "router", "output", "subagent", "code", "custom"]


class Position(BaseModel):
    x: float
    y: float


class Port(BaseModel):
    id: str
    label: str


class Node(BaseModel):
    id: str
    type: NodeType
    label: str
    position: Position
    inputs: list[Port] = Field(default_factory=list)
    outputs: list[Port] = Field(default_factory=list)
    data: dict[str, Any] = Field(default_factory=dict)


class Link(BaseModel):
    id: str
    sourceNode: str
    sourcePort: str
    targetNode: str
    targetPort: str
    active: bool = False
    invalid: bool = False


class GraphDocument(BaseModel):
    id: str | None = None
    name: str
    version: int = 1
    nodes: list[Node]
    links: list[Link]


class ProviderRuntime(BaseModel):
    id: str | None = None
    name: str | None = None
    providerType: str | None = None
    apiKey: str | None = None
    baseUrl: str | None = None


class VectorDatabaseRuntime(BaseModel):
    id: str | None = None
    kind: str = "mongodb_atlas"
    connectionString: str | None = None
    database: str = "promptflow_studio"
    collection: str = "documents"
    index: str = "vector_index"
    path: str = "embedding"
    namespace: str | None = None
    endpoint: str | None = None
    apiKey: str | None = None


class RuntimeConfig(BaseModel):
    providers: dict[str, ProviderRuntime] = Field(default_factory=dict)
    databases: list[VectorDatabaseRuntime] = Field(default_factory=list)
    vectorDatabase: VectorDatabaseRuntime = Field(default_factory=VectorDatabaseRuntime)


class ExecutionRequest(BaseModel):
    graph: GraphDocument
    runtime: RuntimeConfig = Field(default_factory=RuntimeConfig)


class CompletionRequest(BaseModel):
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    messages: list[dict[str, str]]
    temperature: float = 0.2
    stream: bool = False
    runtime: RuntimeConfig = Field(default_factory=RuntimeConfig)


class VectorSearchRequest(BaseModel):
    query: str
    collection: str = "documents"
    index: str = "vector_index"
    path: str = "embedding"
    limit: int = 4
    provider: str = "openai"
    model: str = "text-embedding-3-small"
    runtime: RuntimeConfig = Field(default_factory=RuntimeConfig)
