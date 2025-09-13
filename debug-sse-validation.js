/**
 * Debug script to test SSE validation with actual data structure
 */

const testData = {
  "type": "research_progress",
  "sessionId": "research_1757764657655_lpu71zcmx",
  "status": "running",
  "overall_progress": 0.49833333333333335,
  "current_phase": "Content Structure Planning",
  "agents": [
    {
      "agent_id": "22c66fad-bff1-4c56-8f64-6559290abf1a",
      "agent_type": "team_leader",
      "name": "Research Team Leader",
      "status": "completed",
      "progress": 1,
      "current_task": "Processing team_leader phase",
      "error": null
    },
    {
      "agent_id": "f6b1c6bf-8afe-422f-95e6-89f263d468c6",
      "agent_type": "plan_generator",
      "name": "Research Plan Generator",
      "status": "completed",
      "progress": 1,
      "current_task": "Processing plan_generator phase",
      "error": null
    },
    {
      "agent_id": "ea1bb30c-3a9f-403f-9dfc-5959bfd66c14",
      "agent_type": "section_planner",
      "name": "Section Planning Specialist",
      "status": "current",
      "progress": 0.99,
      "current_task": "Processing section_planner phase",
      "error": null
    }
  ],
  "partial_results": {
    "team_leader": {
      "content": "",
      "agent_type": "team_leader",
      "completed_at": "2025-09-13T06:57:50.101048"
    },
    "plan_generator": {
      "content": "The query \"Test\" is incredibly broad and ambiguous, encompassing a vast",
      "agent_type": "plan_generator", 
      "completed_at": "2025-09-13T06:58:01.311487"
    }
  },
  "timestamp": "2025-09-13T06:58:02.314223"
};

console.log('=== SSE Data Structure Analysis ===');
console.log('Type:', testData.type);
console.log('Session ID:', testData.sessionId);
console.log('Status:', testData.status);
console.log('Progress:', testData.overall_progress);
console.log('Phase:', testData.current_phase);
console.log('Agents count:', testData.agents.length);

console.log('\n=== Agent Analysis ===');
testData.agents.forEach((agent, index) => {
  console.log(`Agent ${index + 1}:`);
  console.log(`  ID: ${agent.agent_id}`);
  console.log(`  Type: ${agent.agent_type}`);
  console.log(`  Status: ${agent.status}`);
  console.log(`  Progress: ${agent.progress}`);
  console.log(`  Task: ${agent.current_task}`);
  console.log(`  Error: ${agent.error}`);
});

console.log('\n=== Validation Issues Check ===');
console.log('All required fields present:', 
  testData.type && testData.sessionId && testData.status && 
  testData.agents && testData.timestamp);

console.log('Agent status values:', testData.agents.map(a => a.status));
console.log('Valid status values should be: waiting, current, completed, error');

// Check for any non-standard status values
const validStatuses = ['waiting', 'current', 'completed', 'error'];
const invalidStatuses = testData.agents
  .map(a => a.status)
  .filter(status => !validStatuses.includes(status));

if (invalidStatuses.length > 0) {
  console.log('❌ Invalid agent status values found:', invalidStatuses);
} else {
  console.log('✅ All agent statuses are valid');
}

// Check progress values
const invalidProgress = testData.agents
  .filter(a => a.progress < 0 || a.progress > 1);

if (invalidProgress.length > 0) {
  console.log('❌ Invalid progress values:', invalidProgress.map(a => a.progress));
} else {
  console.log('✅ All progress values are valid (0-1 range)');
}

console.log('\n=== Data Should Be Valid ===');
console.log('This data structure should pass Zod validation');