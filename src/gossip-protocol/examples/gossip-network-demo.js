/**
 * Gossip Network Demonstration
 * Shows how to use the Hive Mind Gossip Network for distributed communication
 */

import { HiveMindGossipNetwork } from '../HiveMindGossipNetwork.js';

async function demonstrateGossipNetwork() {
  console.log('🐝 Starting Hive Mind Gossip Network Demonstration\n');
  
  // Create three nodes for demonstration
  const node1 = new HiveMindGossipNetwork('hive-alpha', 'development');
  const node2 = new HiveMindGossipNetwork('hive-beta', 'development');
  const node3 = new HiveMindGossipNetwork('hive-gamma', 'development');
  
  try {
    // Initialize all nodes
    console.log('📡 Initializing gossip network nodes...');
    await node1.initialize();
    await node2.initialize();
    await node3.initialize();
    
    // Start the networks
    console.log('🚀 Starting gossip networks...');
    await node1.start();
    await node2.start();
    await node3.start();
    
    // Connect nodes together
    console.log('🔗 Connecting nodes in gossip network...');
    await node1.addPeer({
      id: 'hive-beta',
      address: '127.0.0.1',
      port: 8002
    });
    
    await node2.addPeer({
      id: 'hive-gamma',
      address: '127.0.0.1',
      port: 8003
    });
    
    await node3.addPeer({
      id: 'hive-alpha',
      address: '127.0.0.1',
      port: 8001
    });
    
    // Demonstrate message broadcasting
    console.log('\n📨 Broadcasting Hive Mind updates...');
    
    const collectiveDecision = {
      type: 'resource_allocation',
      decision: 'allocate_compute_cluster_7',
      reasoning: 'High priority ML training job detected',
      confidence: 0.94,
      participating_nodes: ['hive-alpha', 'hive-beta', 'hive-gamma'],
      timestamp: Date.now()
    };
    
    const messageId1 = await node1.broadcastHiveMindUpdate(collectiveDecision);
    console.log(`✅ Node Alpha broadcasted decision: ${messageId1}`);
    
    // Demonstrate consensus proposal
    console.log('\n🗳️ Broadcasting consensus proposal...');
    
    const consensusProposal = {
      id: 'proposal-network-expansion',
      type: 'network_topology_change',
      proposal: {
        action: 'add_regional_cluster',
        region: 'eu-west-1',
        expected_nodes: 25,
        resources: ['compute', 'storage', 'networking']
      },
      voting_period: 300000, // 5 minutes
      required_majority: 0.67
    };
    
    const messageId2 = await node2.broadcastConsensusProposal(consensusProposal);
    console.log(`✅ Node Beta broadcasted proposal: ${messageId2}`);
    
    // Demonstrate state synchronization
    console.log('\n🔄 Synchronizing distributed state...');
    
    const stateUpdate = {
      key: 'hive_global_status',
      value: {
        active_nodes: 3,
        total_compute_units: 1500,
        active_tasks: 42,
        consensus_round: 157,
        last_update: Date.now()
      },
      version: 23,
      priority: 'high'
    };
    
    const messageId3 = await node3.synchronizeState(stateUpdate);
    console.log(`✅ Node Gamma synchronized state: ${messageId3}`);
    
    // Wait for message propagation
    console.log('\n⏳ Allowing time for message propagation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Display network status for each node
    console.log('\n📊 Network Status Report:');
    console.log('=' .repeat(60));
    
    for (const [name, node] of [['Alpha', node1], ['Beta', node2], ['Gamma', node3]]) {
      const status = node.getNetworkStatus();
      const topology = node.getNetworkTopology();
      
      console.log(`\n🏷️  Node ${name} (${status.nodeId}):`);
      console.log(`   Status: ${status.status}`);
      console.log(`   Uptime: ${Math.round(status.uptime / 1000)}s`);
      console.log(`   Connected Peers: ${status.stats.peersConnected}`);
      console.log(`   Messages Processed: ${status.stats.messagesProcessed}`);
      console.log(`   Convergence Events: ${status.stats.convergenceEvents}`);
      console.log(`   Vector Clock: ${JSON.stringify(topology.vectorClock)}`);
      console.log(`   Message History: ${topology.messageCount} messages`);
    }
    
    // Display performance metrics
    console.log('\n📈 Performance Metrics:');
    console.log('=' .repeat(60));
    
    const metrics1 = node1.getPerformanceMetrics();
    console.log('\n🔄 Epidemic Protocol Performance:');
    console.log(`   Push Rounds: ${metrics1.gossipRounds?.pushRounds || 0}`);
    console.log(`   Pull Rounds: ${metrics1.gossipRounds?.pullRounds || 0}`);
    console.log(`   Messages Sent: ${metrics1.gossipRounds?.messagesSent || 0}`);
    console.log(`   Messages Received: ${metrics1.gossipRounds?.messagesReceived || 0}`);
    
    console.log('\n🔧 Anti-Entropy Performance:');
    console.log(`   Sync Rounds: ${metrics1.antiEntropyRounds?.syncRounds || 0}`);
    console.log(`   States Synchronized: ${metrics1.antiEntropyRounds?.statesSynchronized || 0}`);
    console.log(`   Conflicts Resolved: ${metrics1.antiEntropyRounds?.conflictsResolved || 0}`);
    
    console.log('\n💔 Failure Detection:');
    console.log(`   Monitored Peers: ${metrics1.failureDetection?.monitoredPeers || 0}`);
    console.log(`   Failures Detected: ${metrics1.failureDetection?.failuresDetected || 0}`);
    console.log(`   Average Phi: ${metrics1.failureDetection?.averagePhiValue?.toFixed(2) || 0}`);
    
    // Demonstrate network convergence
    console.log('\n🎯 Testing Network Convergence...');
    
    // Send multiple messages to test convergence
    for (let i = 0; i < 5; i++) {
      await node1.broadcastHiveMindUpdate({
        type: 'convergence_test',
        sequence: i,
        timestamp: Date.now()
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Wait for convergence
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Convergence test completed');
    
    // Demonstrate graceful shutdown
    console.log('\n🔄 Demonstrating graceful shutdown...');
    
    await node1.stop();
    console.log('✅ Node Alpha stopped gracefully');
    
    await node2.stop();
    console.log('✅ Node Beta stopped gracefully');
    
    await node3.stop();
    console.log('✅ Node Gamma stopped gracefully');
    
    console.log('\n🎉 Gossip network demonstration completed successfully!');
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    
    // Cleanup on error
    if (node1.isRunning) await node1.stop();
    if (node2.isRunning) await node2.stop();
    if (node3.isRunning) await node3.stop();
  }
}

// Run demonstration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateGossipNetwork().catch(console.error);
}

export { demonstrateGossipNetwork };