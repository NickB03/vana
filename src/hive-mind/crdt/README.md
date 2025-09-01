# Hive Mind CRDT Implementation

This directory contains a comprehensive implementation of Conflict-free Replicated Data Types (CRDTs) designed for the Hive Mind distributed system. CRDTs enable eventually consistent distributed state synchronization without conflicts.

## Overview

CRDTs are data structures that can be replicated across multiple nodes and updated independently without coordination. They automatically resolve conflicts and guarantee eventual consistency across all replicas.

## Components

### Core CRDT Types

#### VectorClock (`vector-clock.js`)
- Tracks causal ordering between events
- Enables proper event sequencing in distributed systems
- Methods: `increment()`, `merge()`, `compare()`, `isBefore()`, `isAfter()`

#### G-Counter (`g-counter.js`)
- Grow-only counter (increment-only)
- Each node maintains its own counter value
- Value is sum of all node counters
- Methods: `increment()`, `value()`, `merge()`

#### PN-Counter (`pn-counter.js`)
- Increment/decrement counter
- Combines two G-Counters (positive and negative)
- Methods: `increment()`, `decrement()`, `value()`

#### OR-Set (`or-set.js`)
- Observe-Remove Set with unique tags
- Elements can be added and removed
- Uses unique tags to resolve add/remove conflicts
- Methods: `add()`, `remove()`, `has()`, `values()`

#### LWW-Register (`lww-register.js`)
- Last-Writer-Wins Register
- Resolves conflicts using timestamps
- Node ID as tiebreaker for simultaneous writes
- Methods: `set()`, `get()`, `merge()`

#### RGA (`rga.js`)
- Replicated Growable Array
- Maintains sequence order with causal dependencies
- Supports insert, remove, and sequence operations
- Methods: `insert()`, `remove()`, `toArray()`

#### OR-Map (`or-map.js`)
- Observe-Remove Map
- Keys managed by OR-Set, values by configurable CRDTs
- Methods: `set()`, `get()`, `delete()`, `keys()`, `values()`

### Advanced Features

#### CRDT Synchronizer (`crdt-synchronizer.js`)
- Main coordination class for CRDT instances
- Manages synchronization between nodes
- Handles delta generation and application
- Features: auto-sync, vector clocks, causal tracking

#### Delta-State CRDT (`delta-state-crdt.js`)
- Efficient incremental synchronization
- Only sends changes (deltas) instead of full state
- Compression and garbage collection
- Reduces network bandwidth significantly

#### CRDT Composer (`crdt-composer.js`)
- Framework for creating composite CRDT structures
- Combines multiple CRDTs into complex data types
- Schema-based composition with validation
- Supports nested and recursive structures

### Hive Mind Integration

#### HiveMindCRDTConfig (`hive-mind-crdt-config.js`)
- Pre-configured CRDT structures for Hive Mind
- Agent states, task management, consensus
- Knowledge base and distributed memory
- Ready-to-use composite types

## Usage

### Basic Usage

```javascript
const { createHiveMindCRDT } = require('./src/hive-mind/crdt');

// Initialize Hive Mind CRDT system
const hiveMind = createHiveMindCRDT('node1', {
  replicationGroup: ['node1', 'node2', 'node3']
});

await hiveMind.initialize();

// Register an agent
const agent = hiveMind.registerAgent('agent1', ['coder', 'tester']);

// Create a task
const task = hiveMind.createTask({
  title: 'Implement feature X',
  description: 'Add new functionality',
  priority: 'high'
});

// Synchronize with peers
await hiveMind.synchronize();
```

### Individual CRDT Usage

```javascript
const { GCounter, ORSet, LWWRegister } = require('./src/hive-mind/crdt');

// Create a counter
const counter = new GCounter('node1', ['node1', 'node2']);
counter.increment(5);
console.log(counter.value()); // 5

// Create a set
const set = new ORSet('node1');
set.add('item1');
set.add('item2');
console.log(set.values()); // Set(['item1', 'item2'])

// Create a register
const register = new LWWRegister('node1');
register.set('initial value');
console.log(register.get()); // 'initial value'
```

### Composite Structures

```javascript
const { CRDTComposer } = require('./src/hive-mind/crdt');

const composer = new CRDTComposer();

// Define a custom composite type
composer.defineComposite('UserProfile', {
  name: { type: 'LWW_REGISTER' },
  skills: { type: 'OR_SET' },
  experience: { type: 'G_COUNTER' },
  projects: { type: 'RGA' }
});

// Create instance
const profile = composer.create('UserProfile', 'node1', ['node1', 'node2']);
profile.setFieldValue('name', 'Alice');
profile.getField('skills').add('JavaScript');
```

## Key Features

### Conflict-Free Operation
- Mathematical guarantees of eventual consistency
- No coordination required for updates
- Automatic conflict resolution

### Network Partition Tolerance
- Continues operating during network splits
- Reconciles state when connectivity restored
- No data loss or corruption

### Scalability
- Delta-state optimization reduces bandwidth
- Efficient garbage collection
- Configurable buffer sizes and sync intervals

### Flexibility
- Composable structures for complex data
- Multiple synchronization strategies
- Extensible architecture

## Configuration

The system supports various configuration options:

```javascript
const options = {
  replicationGroup: ['node1', 'node2', 'node3'],
  autoSync: true,
  syncInterval: 30000,          // 30 seconds
  maxDeltaBuffer: 1000,         // Max delta entries
  deltaCompression: true,       // Enable compression
  garbageCollectInterval: 3600000 // 1 hour
};
```

## Memory Storage

CRDT configuration is automatically stored in memory under the `hive-mind/crdt-config` namespace for persistence and coordination across the distributed system.

## Architecture Benefits

1. **No Central Coordinator**: Fully decentralized operation
2. **Strong Eventual Consistency**: All replicas converge to same state
3. **Partition Tolerance**: Graceful handling of network failures
4. **Performance**: Delta synchronization minimizes network usage
5. **Flexibility**: Composable data structures for complex requirements

## File Structure

```
src/hive-mind/crdt/
├── index.js                    # Main exports and utilities
├── vector-clock.js             # Causal ordering
├── crdt-synchronizer.js        # Main coordination
├── g-counter.js                # Increment-only counter
├── pn-counter.js               # Inc/dec counter
├── or-set.js                   # Add/remove set
├── lww-register.js             # Last-writer-wins register
├── rga.js                      # Replicated array
├── or-map.js                   # Observe-remove map
├── delta-state-crdt.js         # Delta synchronization
├── crdt-composer.js            # Composite structures
├── hive-mind-crdt-config.js    # Hive Mind integration
└── README.md                   # This file
```

This CRDT implementation provides a solid foundation for distributed state management in the Hive Mind system, ensuring data consistency and availability even under adverse network conditions.