# VANA Memory System Visual Diagrams

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Claude Code Interface"
        CC[Claude Code Agent]
    end
    
    subgraph "Memory Decision Layer"
        MDL[Memory Router]
        MC[Memory Controller]
    end
    
    subgraph "Dual Memory Systems"
        subgraph "Standard MCP"
            KG[Knowledge Graph]
            ER[Entity-Relationship Store]
            OB[Observations]
        end
        
        subgraph "Custom ChromaDB"
            VDB[Vector Database]
            EMB[Embeddings]
            IDX[File Indexer]
        end
    end
    
    subgraph "Storage Layer"
        CDB[(ChromaDB<br/>2,343+ chunks)]
        FS[(File System<br/>.claude/)]
    end
    
    CC --> MDL
    MDL --> MC
    MC --> KG
    MC --> VDB
    KG --> ER
    KG --> OB
    VDB --> EMB
    VDB --> IDX
    ER --> CDB
    OB --> CDB
    EMB --> CDB
    IDX --> FS
    
    style CC fill:#e1f5fe
    style MDL fill:#b3e5fc
    style MC fill:#81d4fa
    style KG fill:#c8e6c9
    style VDB fill:#ffccbc
    style CDB fill:#d7ccc8
    style FS fill:#f5f5f5
```

## Memory Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude Code
    participant MR as Memory Router
    participant MCP as Standard MCP
    participant CDB as ChromaDB
    participant FS as File System
    
    User->>Claude: Query/Command
    Claude->>MR: Process Request
    
    alt Memory Search Needed
        MR->>MCP: Query Entities/Relations
        MR->>CDB: Semantic Search
        MCP-->>MR: Graph Results
        CDB-->>MR: Vector Results
        MR->>Claude: Combined Results
    end
    
    alt Memory Storage Needed
        Claude->>MR: Store Insight
        MR->>MCP: Create/Update Entity
        MR->>CDB: Index Content
        MCP-->>FS: Persist Graph
        CDB-->>FS: Update Vectors
    end
    
    Claude-->>User: Response with Context
```

## Auto-Indexing Process

```mermaid
flowchart LR
    subgraph "File Monitoring"
        FW[File Watcher]
        CD[Change Detection]
    end
    
    subgraph "Processing Pipeline"
        FP[File Parser]
        CE[Chunk Extractor]
        EG[Embedding Generator]
    end
    
    subgraph "Storage Operations"
        CR[Conflict Resolver]
        VI[Vector Indexer]
        DB[(ChromaDB)]
    end
    
    FW --> CD
    CD -->|New/Modified| FP
    FP --> CE
    CE --> EG
    EG --> CR
    CR --> VI
    VI --> DB
    
    style FW fill:#fff3e0
    style CD fill:#ffe0b2
    style FP fill:#ffcc80
    style CE fill:#ffb74d
    style EG fill:#ffa726
    style CR fill:#ff9800
    style VI fill:#fb8c00
    style DB fill:#f57c00
```

## Memory Categories & Relationships

```mermaid
graph LR
    subgraph "Memory Categories"
        PS[Project Status]
        TD[Technical Decisions]
        UP[User Preferences]
        SK[System Knowledge]
        RE[Relationships]
    end
    
    subgraph "Entity Examples"
        PS --> P1[VANA_Project]
        PS --> P2[Phase_1_Complete]
        TD --> T1[Python_3.13_Requirement]
        TD --> T2[Dual_Memory_Architecture]
        UP --> U1[Nick_Concise_Responses]
        UP --> U2[Visual_Documentation_Preference]
        SK --> S1[ChromaDB_Configuration]
        SK --> S2[MCP_Server_Setup]
        RE --> R1[Nick_manages_VANA]
        RE --> R2[ChromaDB_powers_VectorSearch]
    end
    
    style PS fill:#e8f5e9
    style TD fill:#e3f2fd
    style UP fill:#fce4ec
    style SK fill:#fff3e0
    style RE fill:#f3e5f5
```

## Performance Metrics Dashboard

```mermaid
graph TD
    subgraph "Performance Indicators"
        ST[Search Time<br/>0.3s avg]
        CS[Chunk Size<br/>2,343+]
        IR[Index Rate<br/>~50 chunks/min]
        QM[Query Match<br/>85%+ relevance]
    end
    
    subgraph "Health Status"
        MS[Memory Status<br/>✅ Operational]
        AS[API Status<br/>✅ Connected]
        IS[Index Status<br/>✅ Up-to-date]
        PS[Performance<br/>✅ Optimal]
    end
    
    ST --> MS
    CS --> AS
    IR --> IS
    QM --> PS
    
    style ST fill:#a5d6a7
    style CS fill:#90caf9
    style IR fill:#ffcc80
    style QM fill:#ce93d8
    style MS fill:#66bb6a
    style AS fill:#42a5f5
    style IS fill:#ffa726
    style PS fill:#ab47bc
```

## Configuration Flow

```mermaid
flowchart TD
    A[Start Configuration] --> B{Check .claude.json}
    B -->|Missing| C[Add Memory Server Config]
    B -->|Exists| D{Check Permissions}
    C --> D
    D -->|Not Set| E[Update settings.local.json]
    D -->|Set| F{Test Connection}
    E --> F
    F -->|Failed| G[Debug Configuration]
    F -->|Success| H[Memory System Ready]
    G --> B
    
    style A fill:#ffebee
    style B fill:#e3f2fd
    style C fill:#fff3e0
    style D fill:#e8f5e9
    style E fill:#fce4ec
    style F fill:#f3e5f5
    style G fill:#ffccbc
    style H fill:#c8e6c9
```

## Next Steps

These visual diagrams illustrate:
- Overall system architecture
- Data flow sequences
- Auto-indexing pipeline
- Memory categorization
- Performance monitoring
- Configuration process

The next documentation will cover implementation details and deployment procedures.