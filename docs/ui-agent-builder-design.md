# UI-Based Google ADK Agent Builder for VANA

## Overview
Add a UI interface to VANA for creating, configuring, and deploying Google ADK agents dynamically, while keeping the existing Cloud Run hosting infrastructure.

## Architecture

### 1. **Frontend Agent Builder UI**

#### Component Structure:
```typescript
// frontend/app/agent-builder/page.tsx
interface AgentBuilderUI {
  // Main sections
  AgentTemplates: React.FC       // Pre-built agent templates
  AgentConfigurator: React.FC    // Configure agent properties
  ToolSelector: React.FC         // Select/configure tools
  ModelSelector: React.FC        // Choose Gemini models
  DeploymentPanel: React.FC      // Deploy to Cloud Run
  TestingInterface: React.FC    // Test agent before deployment
}
```

#### Key UI Components:

```typescript
// Agent Configuration Form
interface AgentConfig {
  name: string
  description: string
  type: 'LlmAgent' | 'LoopAgent' | 'SequentialAgent' | 'ParallelAgent'
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash'
  temperature: number
  maxTokens: number
  tools: Tool[]
  callbacks: Callback[]
  systemPrompt: string
  plannerType?: 'BuiltInPlanner' | 'CustomPlanner'
}
```

### 2. **Backend API Extensions**

#### New Endpoints:
```python
# app/routes/agent_builder.py

@router.post("/api/agents/create")
async def create_agent(config: AgentConfig) -> AgentResponse:
    """Create a new ADK agent from UI configuration"""
    
@router.get("/api/agents/templates")
async def get_agent_templates() -> List[AgentTemplate]:
    """Get pre-built agent templates"""
    
@router.post("/api/agents/deploy")
async def deploy_agent(agent_id: str) -> DeploymentResponse:
    """Deploy agent to Cloud Run"""
    
@router.post("/api/agents/test")
async def test_agent(config: AgentConfig, input: str) -> TestResponse:
    """Test agent configuration before deployment"""
```

### 3. **Agent Template System**

```python
# app/agent_templates/templates.py

AGENT_TEMPLATES = {
    "research_analyst": {
        "name": "Research Analyst",
        "type": "LoopAgent",
        "model": "gemini-2.5-pro",
        "tools": ["brave_search", "web_scraper"],
        "system_prompt": "You are a research analyst...",
        "planner": "BuiltInPlanner",
    },
    "code_reviewer": {
        "name": "Code Reviewer",
        "type": "LlmAgent",
        "model": "gemini-2.5-pro",
        "tools": ["github_api", "code_analyzer"],
        "system_prompt": "You are a code review expert...",
    },
    "data_processor": {
        "name": "Data Processor",
        "type": "SequentialAgent",
        "model": "gemini-2.5-flash",
        "tools": ["csv_reader", "data_transformer"],
        "system_prompt": "You process and analyze data...",
    }
}
```

### 4. **Dynamic Agent Generation**

```python
# app/agent_builder/generator.py

class AgentGenerator:
    def generate_agent_code(self, config: AgentConfig) -> str:
        """Generate Python code for ADK agent"""
        
        template = '''
from google.adk.agents import {agent_type}
from google.genai import Client
{tool_imports}

class {agent_name}Agent:
    def __init__(self):
        self.client = Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = "{model}"
        
    def create_agent(self):
        return {agent_type}(
            name="{name}",
            description="{description}",
            llm_client=self.client,
            model=self.model,
            tools=[{tools}],
            system_prompt="""{system_prompt}""",
            temperature={temperature},
            max_output_tokens={max_tokens},
            {additional_config}
        )
'''
        return template.format(**config)
    
    def save_agent_file(self, agent_id: str, code: str):
        """Save generated agent to filesystem"""
        path = f"agents/custom/{agent_id}/agent.py"
        # Write file and create __init__.py
        
    def deploy_to_cloud_run(self, agent_id: str):
        """Deploy agent to existing Cloud Run service"""
        # Update Cloud Run with new agent
```

### 5. **UI Implementation**

```tsx
// frontend/components/agent-builder/AgentBuilder.tsx

export function AgentBuilder() {
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    type: 'LlmAgent',
    model: 'gemini-2.5-flash',
    tools: [],
    systemPrompt: '',
  })

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Panel - Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form>
            <FormField name="name" label="Agent Name">
              <Input />
            </FormField>
            
            <FormField name="type" label="Agent Type">
              <Select>
                <SelectItem value="LlmAgent">LLM Agent</SelectItem>
                <SelectItem value="LoopAgent">Loop Agent</SelectItem>
                <SelectItem value="SequentialAgent">Sequential</SelectItem>
              </Select>
            </FormField>
            
            <FormField name="model" label="Model">
              <RadioGroup>
                <RadioItem value="gemini-2.5-pro">Gemini 2.5 Pro</RadioItem>
                <RadioItem value="gemini-2.5-flash">Gemini 2.5 Flash</RadioItem>
              </RadioGroup>
            </FormField>
            
            <ToolSelector 
              selected={config.tools}
              onChange={(tools) => setConfig({...config, tools})}
            />
            
            <FormField name="systemPrompt" label="System Prompt">
              <Textarea rows={10} />
            </FormField>
          </Form>
        </CardContent>
      </Card>

      {/* Right Panel - Preview & Deploy */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <CodePreview code={generatePreview(config)} />
          
          <div className="mt-4 space-y-2">
            <Button onClick={testAgent} variant="secondary">
              Test Agent
            </Button>
            <Button onClick={deployAgent} variant="default">
              Deploy to Cloud Run
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6. **Tool Configuration UI**

```tsx
// frontend/components/agent-builder/ToolSelector.tsx

const AVAILABLE_TOOLS = [
  { id: 'brave_search', name: 'Web Search', requiresKey: true },
  { id: 'github_api', name: 'GitHub API', requiresKey: true },
  { id: 'csv_reader', name: 'CSV Reader', requiresKey: false },
  { id: 'web_scraper', name: 'Web Scraper', requiresKey: false },
]

export function ToolSelector({ selected, onChange }) {
  return (
    <div className="space-y-2">
      <Label>Tools</Label>
      {AVAILABLE_TOOLS.map(tool => (
        <div key={tool.id} className="flex items-center space-x-2">
          <Checkbox 
            checked={selected.includes(tool.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...selected, tool.id])
              } else {
                onChange(selected.filter(t => t !== tool.id))
              }
            }}
          />
          <Label>{tool.name}</Label>
          {tool.requiresKey && (
            <Badge variant="outline">API Key Required</Badge>
          )}
        </div>
      ))}
    </div>
  )
}
```

### 7. **Deployment Integration**

```python
# app/agent_builder/deployer.py

class CloudRunDeployer:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.service_name = "vana"
        
    async def deploy_agent(self, agent_id: str, config: AgentConfig):
        """Deploy agent to existing Cloud Run service"""
        
        # 1. Generate agent code
        generator = AgentGenerator()
        code = generator.generate_agent_code(config)
        
        # 2. Save to agents directory
        agent_path = f"agents/custom/{agent_id}"
        os.makedirs(agent_path, exist_ok=True)
        
        with open(f"{agent_path}/agent.py", "w") as f:
            f.write(code)
            
        with open(f"{agent_path}/__init__.py", "w") as f:
            f.write(f"from .agent import {config.name}Agent")
        
        # 3. Update agent registry
        self.update_agent_registry(agent_id, config)
        
        # 4. Trigger Cloud Run redeployment
        await self.redeploy_cloud_run()
        
    def update_agent_registry(self, agent_id: str, config: AgentConfig):
        """Update the agent registry with new agent"""
        registry_path = "agents/registry.json"
        
        with open(registry_path, "r") as f:
            registry = json.load(f)
            
        registry[agent_id] = {
            "name": config.name,
            "type": config.type,
            "model": config.model,
            "created": datetime.now().isoformat(),
            "status": "active"
        }
        
        with open(registry_path, "w") as f:
            json.dump(registry, f, indent=2)
```

### 8. **Testing Interface**

```tsx
// frontend/components/agent-builder/TestingInterface.tsx

export function TestingInterface({ agentConfig }) {
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    const response = await fetch('/api/agents/test', {
      method: 'POST',
      body: JSON.stringify({
        config: agentConfig,
        input: testInput
      })
    })
    const result = await response.json()
    setTestResult(result)
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea 
          placeholder="Enter test input..."
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          rows={4}
        />
        
        <Button 
          onClick={runTest} 
          disabled={loading}
          className="mt-2"
        >
          {loading ? 'Testing...' : 'Run Test'}
        </Button>
        
        {testResult && (
          <div className="mt-4 p-4 bg-muted rounded">
            <pre>{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## Implementation Steps

### Phase 1: Core UI (1 week)
1. Create agent builder page layout
2. Implement configuration forms
3. Add tool selector
4. Create model selector

### Phase 2: Backend API (1 week)
1. Create agent builder routes
2. Implement agent generator
3. Add template system
4. Create test endpoint

### Phase 3: Integration (3-4 days)
1. Connect UI to backend
2. Implement code preview
3. Add testing interface
4. Deploy functionality

### Phase 4: Polish (3-4 days)
1. Add validation
2. Error handling
3. Success notifications
4. Documentation

## Benefits

1. **No Infrastructure Changes**: Uses existing Cloud Run setup
2. **User-Friendly**: No coding required for basic agents
3. **Flexible**: Support for custom configurations
4. **Testable**: Test agents before deployment
5. **Extensible**: Easy to add new templates and tools

## Technical Requirements

- Next.js 14+ (already in VANA)
- shadcn/ui components (already installed)
- FastAPI backend (existing)
- Google ADK (already configured)
- Cloud Run (existing deployment)

## Estimated Effort

**Total: 2.5-3 weeks** with one developer

This approach gives you Palmier-like UI capabilities for creating agents while leveraging your existing VANA infrastructure.