/**
 * CRDT Module Index
 * Exports all CRDT implementations and utilities for the Hive Mind system
 */

// Core CRDT implementations
const VectorClock = require('./vector-clock');
const { CRDTSynchronizer, CausalTracker } = require('./crdt-synchronizer');

// Basic CRDT types
const GCounter = require('./g-counter');
const PNCounter = require('./pn-counter');
const ORSet = require('./or-set');
const LWWRegister = require('./lww-register');
const RGA = require('./rga');
const ORMap = require('./or-map');

// Advanced CRDT features
const DeltaStateCRDT = require('./delta-state-crdt');
const { CRDTComposer, CompositeCRDT } = require('./crdt-composer');

// Hive Mind integration
const HiveMindCRDTConfig = require('./hive-mind-crdt-config');

// Utility functions
const CRDTUtils = {
  // Create CRDT by type name
  createCRDT(type, nodeId, replicationGroup, options = {}) {
    switch (type.toUpperCase()) {
      case 'G_COUNTER':
        return new GCounter(nodeId, replicationGroup, options.initialState);
      case 'PN_COUNTER':
        return new PNCounter(nodeId, replicationGroup, options.initialState);
      case 'OR_SET':
        return new ORSet(nodeId, options.initialState);
      case 'LWW_REGISTER':
        return new LWWRegister(nodeId, options.initialValue, options.initialTimestamp);
      case 'OR_MAP':
        return new ORMap(nodeId, replicationGroup, options.valueType, options.initialState);
      case 'RGA':
        return new RGA(nodeId, options.initialSequence);
      default:
        throw new Error(`Unknown CRDT type: ${type}`);
    }
  },

  // Validate CRDT state
  validateCRDT(crdt) {
    return crdt.isValid ? crdt.isValid() : true;
  },

  // Compare CRDT states
  compareCRDTStates(crdt1, crdt2) {
    if (crdt1.compare && crdt2.compare) {
      return crdt1.compare(crdt2);
    }
    
    // Fallback to JSON comparison
    return JSON.stringify(crdt1.getState()) === JSON.stringify(crdt2.getState());
  },

  // Merge multiple CRDTs of the same type
  mergeCRDTs(...crdts) {
    if (crdts.length === 0) return null;
    if (crdts.length === 1) return crdts[0];
    
    const result = crdts[0].clone ? crdts[0].clone() : { ...crdts[0] };
    
    for (let i = 1; i < crdts.length; i++) {
      if (result.merge) {
        result.merge(crdts[i]);
      }
    }
    
    return result;
  },

  // Get CRDT statistics
  getCRDTStats(crdt) {
    const stats = {
      type: crdt.constructor.name,
      nodeId: crdt.nodeId,
      valid: this.validateCRDT(crdt)
    };
    
    if (crdt.getStats) {
      Object.assign(stats, crdt.getStats());
    } else {
      // Basic stats
      if (crdt.size) stats.size = crdt.size();
      if (crdt.value) stats.value = crdt.value();
      if (crdt.isEmpty) stats.isEmpty = crdt.isEmpty();
    }
    
    return stats;
  },

  // Convert CRDT to different format
  convertCRDT(crdt, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return crdt.getState ? crdt.getState() : crdt;
      case 'string':
        return crdt.toString ? crdt.toString() : JSON.stringify(crdt);
      case 'debug':
        return crdt.getDebugInfo ? crdt.getDebugInfo() : this.getCRDTStats(crdt);
      default:
        return crdt;
    }
  }
};

// Export everything
module.exports = {
  // Core classes
  VectorClock,
  CRDTSynchronizer,
  CausalTracker,
  
  // Basic CRDT types
  GCounter,
  PNCounter,
  ORSet,
  LWWRegister,
  RGA,
  ORMap,
  
  // Advanced features
  DeltaStateCRDT,
  CRDTComposer,
  CompositeCRDT,
  
  // Hive Mind integration
  HiveMindCRDTConfig,
  
  // Utilities
  CRDTUtils,
  
  // Constants
  CRDT_TYPES: {
    G_COUNTER: 'G_COUNTER',
    PN_COUNTER: 'PN_COUNTER',
    OR_SET: 'OR_SET',
    LWW_REGISTER: 'LWW_REGISTER',
    OR_MAP: 'OR_MAP',
    RGA: 'RGA',
    COMPOSITE: 'COMPOSITE'
  },
  
  // Factory function
  createHiveMindCRDT: (nodeId, options = {}) => {
    return new HiveMindCRDTConfig(nodeId, options);
  }
};