/**
 * CRDT Composer - Framework for creating composite CRDT structures
 * Allows combining multiple CRDTs into complex data structures
 */

const GCounter = require('./g-counter');
const PNCounter = require('./pn-counter');
const ORSet = require('./or-set');
const LWWRegister = require('./lww-register');
const ORMap = require('./or-map');
const RGA = require('./rga');
const VectorClock = require('./vector-clock');

class CRDTComposer {
  constructor() {
    this.compositeTypes = new Map();
    this.transformations = new Map();
    this.validators = new Map();
  }

  // Define composite CRDT structure
  defineComposite(name, schema, options = {}) {
    const compositeSpec = {
      name: name,
      schema: schema,
      options: options,
      factory: (nodeId, replicationGroup) => 
        this.createComposite(name, schema, nodeId, replicationGroup, options)
    };
    
    this.compositeTypes.set(name, compositeSpec);
    
    // Register validator if provided
    if (options.validator) {
      this.validators.set(name, options.validator);
    }
    
    return compositeSpec;
  }

  // Create composite CRDT instance
  createComposite(typeName, schema, nodeId, replicationGroup, options = {}) {
    const composite = new CompositeCRDT(typeName, nodeId, replicationGroup, options);
    
    for (const [fieldName, fieldSpec] of Object.entries(schema)) {
      const fieldCRDT = this.createFieldCRDT(fieldSpec, nodeId, replicationGroup);
      composite.addField(fieldName, fieldCRDT, fieldSpec);
    }
    
    return composite;
  }

  // Create field CRDT based on specification
  createFieldCRDT(fieldSpec, nodeId, replicationGroup) {
    // Handle string type specification
    if (typeof fieldSpec === 'string') {
      fieldSpec = { type: fieldSpec };
    }
    
    const { type, options = {} } = fieldSpec;
    
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
        return new ORMap(nodeId, replicationGroup, options.valueType || 'LWW_REGISTER', options.initialState);
        
      case 'RGA':
        return new RGA(nodeId, options.initialSequence);
        
      case 'COMPOSITE':
        if (!options.compositeType) {
          throw new Error('Composite field requires compositeType option');
        }
        return this.create(options.compositeType, nodeId, replicationGroup);
        
      default:
        throw new Error(`Unknown CRDT field type: ${type}`);
    }
  }

  // Create composite by name
  create(typeName, nodeId, replicationGroup) {
    const compositeSpec = this.compositeTypes.get(typeName);
    
    if (!compositeSpec) {
      throw new Error(`Unknown composite type: ${typeName}`);
    }
    
    return compositeSpec.factory(nodeId, replicationGroup);
  }

  // Define transformation between CRDT types
  defineTransformation(fromType, toType, transformFn) {
    const key = `${fromType}->${toType}`;
    this.transformations.set(key, transformFn);
  }

  // Apply transformation
  transform(fromCRDT, toType, nodeId, replicationGroup) {
    const fromType = fromCRDT.constructor.name;
    const key = `${fromType}->${toType}`;
    
    const transformFn = this.transformations.get(key);
    if (!transformFn) {
      throw new Error(`No transformation defined from ${fromType} to ${toType}`);
    }
    
    return transformFn(fromCRDT, nodeId, replicationGroup);
  }

  // Get all registered composite types
  getCompositeTypes() {
    return Array.from(this.compositeTypes.keys());
  }

  // Get schema for composite type
  getSchema(typeName) {
    const compositeSpec = this.compositeTypes.get(typeName);
    return compositeSpec ? compositeSpec.schema : null;
  }

  // Validate composite structure
  validate(typeName, composite) {
    const validator = this.validators.get(typeName);
    
    if (validator) {
      return validator(composite);
    }
    
    // Default validation
    return composite.isValid();
  }
}

class CompositeCRDT {
  constructor(typeName, nodeId, replicationGroup, options = {}) {
    this.typeName = typeName;
    this.nodeId = nodeId;
    this.replicationGroup = new Set(replicationGroup);
    this.fields = new Map();
    this.fieldSpecs = new Map();
    this.vectorClock = new VectorClock(nodeId);
    this.updateCallbacks = [];
    this.options = options;
    
    // Composite-specific options
    this.autoMerge = options.autoMerge !== false;
    this.trackChanges = options.trackChanges !== false;
    this.changeHistory = this.trackChanges ? [] : null;
  }

  // Add field to composite
  addField(name, crdt, fieldSpec = {}) {
    this.fields.set(name, crdt);
    this.fieldSpecs.set(name, fieldSpec);
    
    // Subscribe to field updates
    if (crdt.onUpdate) {
      crdt.onUpdate((delta) => {
        this.handleFieldUpdate(name, delta);
      });
    }
    
    return this;
  }

  // Handle field updates
  handleFieldUpdate(fieldName, delta) {
    this.vectorClock.increment();
    
    const compositeDelta = {
      type: 'FIELD_UPDATE',
      field: fieldName,
      delta: delta,
      timestamp: Date.now(),
      vectorClock: this.vectorClock.toJSON()
    };
    
    // Track change if enabled
    if (this.trackChanges) {
      this.changeHistory.push({
        ...compositeDelta,
        fieldValue: this.getFieldValue(fieldName)
      });
    }
    
    this.notifyUpdate(compositeDelta);
  }

  // Get field CRDT
  getField(name) {
    return this.fields.get(name);
  }

  // Get field value (extracted from CRDT)
  getFieldValue(name) {
    const field = this.fields.get(name);
    if (!field) return undefined;
    
    // Extract value based on CRDT type
    if (field.value) return field.value();
    if (field.get) return field.get();
    if (field.values) return field.values();
    if (field.toArray) return field.toArray();
    if (field.entries) return field.entries();
    
    return field;
  }

  // Set field value (if field supports it)
  setFieldValue(name, value) {
    const field = this.fields.get(name);
    if (!field) {
      throw new Error(`Field ${name} not found`);
    }
    
    if (field.set) {
      return field.set(value);
    } else if (field.add) {
      return field.add(value);
    } else {
      throw new Error(`Field ${name} does not support setting values`);
    }
  }

  // Get all field names
  getFieldNames() {
    return Array.from(this.fields.keys());
  }

  // Get composite value as object
  getValue() {
    const result = {};
    
    for (const [name, field] of this.fields) {
      result[name] = this.getFieldValue(name);
    }
    
    return result;
  }

  // Check if field exists
  hasField(name) {
    return this.fields.has(name);
  }

  // Remove field
  removeField(name) {
    const removed = this.fields.delete(name);
    this.fieldSpecs.delete(name);
    
    if (removed) {
      this.vectorClock.increment();
      
      this.notifyUpdate({
        type: 'FIELD_REMOVED',
        field: name,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      });
    }
    
    return removed;
  }

  // Merge with another composite CRDT
  merge(otherComposite) {
    let changed = false;
    
    // Handle different input formats
    const otherFields = otherComposite.fields || otherComposite;
    const fieldsMap = otherFields instanceof Map ? 
      otherFields : 
      new Map(Object.entries(otherFields));
    
    for (const [fieldName, otherField] of fieldsMap) {
      const localField = this.fields.get(fieldName);
      
      if (localField && localField.merge) {
        // Merge existing field
        const oldState = localField.clone ? localField.clone() : { ...localField };
        const fieldChanged = localField.merge(otherField);
        
        if (fieldChanged) {
          changed = true;
        }
      } else if (!localField && this.autoMerge) {
        // Add missing field if auto-merge is enabled
        this.fields.set(fieldName, otherField);
        changed = true;
      }
    }
    
    // Merge vector clocks if present
    if (otherComposite.vectorClock) {
      const otherClock = otherComposite.vectorClock instanceof VectorClock ? 
        otherComposite.vectorClock : 
        VectorClock.fromJSON(otherComposite.vectorClock);
      this.vectorClock.merge(otherClock);
    }
    
    if (changed) {
      const delta = {
        type: 'COMPOSITE_MERGE',
        mergedFrom: otherComposite,
        timestamp: Date.now(),
        vectorClock: this.vectorClock.toJSON()
      };
      
      this.notifyUpdate(delta);
    }
    
    return changed;
  }

  // Apply delta from synchronization
  applyDelta(delta) {
    let applied = false;
    
    switch (delta.type) {
      case 'FIELD_UPDATE':
        const field = this.fields.get(delta.field);
        if (field && field.applyDelta) {
          applied = field.applyDelta(delta.delta);
        }
        break;
        
      case 'FIELD_REMOVED':
        applied = this.removeField(delta.field);
        break;
        
      case 'COMPOSITE_MERGE':
        applied = this.merge(delta.mergedFrom);
        break;
        
      default:
        console.warn(`Unknown composite delta type: ${delta.type}`);
    }
    
    if (applied) {
      // Update vector clock
      if (delta.vectorClock) {
        const deltaClock = VectorClock.fromJSON(delta.vectorClock);
        this.vectorClock.merge(deltaClock);
      }
      
      this.notifyUpdate({
        type: 'DELTA_APPLIED',
        originalDelta: delta,
        timestamp: Date.now()
      });
    }
    
    return applied;
  }

  // Clone composite CRDT
  clone() {
    const newComposite = new CompositeCRDT(
      this.typeName,
      this.nodeId,
      this.replicationGroup,
      this.options
    );
    
    // Clone all fields
    for (const [name, field] of this.fields) {
      const clonedField = field.clone ? field.clone() : { ...field };
      const fieldSpec = this.fieldSpecs.get(name);
      newComposite.addField(name, clonedField, fieldSpec);
    }
    
    newComposite.vectorClock = this.vectorClock.clone();
    
    return newComposite;
  }

  // Get serializable state
  getState() {
    const fieldStates = {};
    const fieldSpecs = {};
    
    for (const [name, field] of this.fields) {
      fieldStates[name] = field.getState ? field.getState() : field;
      fieldSpecs[name] = this.fieldSpecs.get(name);
    }
    
    return {
      type: 'COMPOSITE_CRDT',
      typeName: this.typeName,
      nodeId: this.nodeId,
      replicationGroup: Array.from(this.replicationGroup),
      fields: fieldStates,
      fieldSpecs: fieldSpecs,
      vectorClock: this.vectorClock.toJSON(),
      options: this.options,
      value: this.getValue(),
      changeHistory: this.changeHistory
    };
  }

  // Create from serialized state
  static fromState(state, composer) {
    const composite = new CompositeCRDT(
      state.typeName,
      state.nodeId,
      state.replicationGroup,
      state.options
    );
    
    // Restore fields
    for (const [name, fieldState] of Object.entries(state.fields)) {
      const fieldSpec = state.fieldSpecs[name];
      let field;
      
      if (fieldState.type) {
        // Restore CRDT field
        switch (fieldState.type) {
          case 'G_COUNTER':
            field = GCounter.fromState(fieldState);
            break;
          case 'PN_COUNTER':
            field = PNCounter.fromState(fieldState);
            break;
          case 'OR_SET':
            field = ORSet.fromState(fieldState);
            break;
          case 'LWW_REGISTER':
            field = LWWRegister.fromState(fieldState);
            break;
          case 'OR_MAP':
            field = ORMap.fromState(fieldState);
            break;
          case 'RGA':
            field = RGA.fromState(fieldState);
            break;
          case 'COMPOSITE_CRDT':
            field = CompositeCRDT.fromState(fieldState, composer);
            break;
          default:
            field = fieldState;
        }
      } else {
        field = fieldState;
      }
      
      composite.addField(name, field, fieldSpec);
    }
    
    if (state.vectorClock) {
      composite.vectorClock = VectorClock.fromJSON(state.vectorClock);
    }
    
    if (state.changeHistory) {
      composite.changeHistory = state.changeHistory;
    }
    
    return composite;
  }

  // Query fields
  query(predicate) {
    const results = [];
    
    for (const [name, field] of this.fields) {
      if (predicate(name, field, this.getFieldValue(name))) {
        results.push({
          name: name,
          field: field,
          value: this.getFieldValue(name)
        });
      }
    }
    
    return results;
  }

  // Transform composite to another type
  transformTo(targetType, composer) {
    if (!composer) {
      throw new Error('Composer required for transformation');
    }
    
    return composer.transform(this, targetType, this.nodeId, this.replicationGroup);
  }

  // Event handling
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  notifyUpdate(delta) {
    this.updateCallbacks.forEach(callback => callback(delta));
  }

  // Utility methods
  size() {
    return this.fields.size;
  }

  isEmpty() {
    return this.size() === 0;
  }

  getChangeHistory() {
    return this.changeHistory ? [...this.changeHistory] : [];
  }

  clearChangeHistory() {
    if (this.changeHistory) {
      this.changeHistory.length = 0;
    }
  }

  // Debug information
  toString() {
    const fields = Array.from(this.fields.keys()).join(', ');
    return `CompositeCRDT[${this.typeName}]{${fields}}`;
  }

  getDebugInfo() {
    const fieldInfo = {};
    
    for (const [name, field] of this.fields) {
      fieldInfo[name] = {
        type: field.constructor.name,
        value: this.getFieldValue(name),
        debug: field.getDebugInfo ? field.getDebugInfo() : 'N/A'
      };
    }
    
    return {
      typeName: this.typeName,
      nodeId: this.nodeId,
      replicationGroup: Array.from(this.replicationGroup),
      fields: fieldInfo,
      vectorClock: this.vectorClock.toString(),
      options: this.options,
      changeHistorySize: this.changeHistory ? this.changeHistory.length : 0
    };
  }

  // Validation
  isValid() {
    // Validate all fields
    for (const field of this.fields.values()) {
      if (field.isValid && !field.isValid()) {
        return false;
      }
    }
    
    return true;
  }

  // Statistics
  getStats() {
    const fieldTypes = {};
    let totalSize = 0;
    
    for (const field of this.fields.values()) {
      const typeName = field.constructor.name;
      fieldTypes[typeName] = (fieldTypes[typeName] || 0) + 1;
      
      if (field.size) {
        totalSize += field.size();
      } else if (field.length !== undefined) {
        totalSize += field.length;
      }
    }
    
    return {
      typeName: this.typeName,
      fieldCount: this.fields.size,
      fieldTypes: fieldTypes,
      totalSize: totalSize,
      vectorClockSize: this.vectorClock.clock.size,
      changeHistorySize: this.changeHistory ? this.changeHistory.length : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Estimate memory usage
  estimateMemoryUsage() {
    try {
      return JSON.stringify(this.getState()).length;
    } catch {
      return -1; // Unable to estimate
    }
  }
}

module.exports = { CRDTComposer, CompositeCRDT };