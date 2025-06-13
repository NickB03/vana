#!/usr/bin/env python3
"""
VANA Agent Memory Behavior Optimization

This script optimizes agent behavior to use memory-first strategy following
Google ADK best practices and Manus AI patterns.

Key optimizations:
- Memory-first decision hierarchy
- Proactive memory lookup before external searches
- Automatic session-to-memory conversion
- Cross-session learning patterns

Usage:
    python scripts/optimize_agent_memory_behavior.py [--dry-run] [--verbose]
"""

import logging
import re
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class AgentMemoryOptimizer:
    """Optimizes VANA agent behavior for intelligent memory usage."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.optimized_count = 0

    def get_memory_first_prompt_additions(self) -> str:
        """Get memory-first strategy prompt additions for agents."""

        return """
## 🧠 MEMORY-FIRST DECISION STRATEGY

Before responding to any user query, follow this hierarchy:

### 1. SESSION MEMORY CHECK (Automatic)
- Review current conversation context
- Check session.state for user preferences and previous decisions
- Maintain conversation continuity

### 2. VANA KNOWLEDGE SEARCH (search_knowledge)
- For questions about VANA capabilities, agents, tools, or system features
- Use: search_knowledge("query about VANA system")
- This searches the RAG corpus with VANA-specific knowledge

### 3. MEMORY RETRIEVAL (load_memory) 
- For user preferences, past interactions, or learned patterns
- Use: load_memory with relevant query
- This retrieves cross-session user context and preferences

### 4. VECTOR SEARCH (vector_search)
- For technical documentation or similarity-based searches
- Use: vector_search("technical query")
- This performs semantic similarity search

### 5. WEB SEARCH (brave_search_mcp)
- Only for external information not available in memory systems
- Use: brave_search_mcp("external query")
- This searches the web for current information

## 🎯 PROACTIVE MEMORY USAGE PATTERNS

### When User Asks About VANA:
```
ALWAYS use search_knowledge first:
- "What can VANA do?" → search_knowledge("VANA capabilities and features")
- "How do agents work?" → search_knowledge("VANA agent coordination and specialization")
- "What tools are available?" → search_knowledge("VANA tools and functionality")
```

### When User Has Preferences:
```
ALWAYS check load_memory first:
- Before suggesting approaches → load_memory("user preferences for task type")
- Before making recommendations → load_memory("user previous choices and feedback")
- Before starting complex tasks → load_memory("user workflow preferences")
```

### When Completing Tasks:
```
ALWAYS store important discoveries:
- User preferences: session.state['user_preference_X'] = value
- Successful patterns: session.state['successful_approach_Y'] = method
- Important insights: session.state['learned_insight_Z'] = discovery
```

## 🔄 AUTOMATIC MEMORY CONVERSION

After successful task completion, important session content should be converted to persistent memory for future use.

## ⚠️ MEMORY USAGE RULES

1. **NEVER guess** about VANA capabilities - always search_knowledge first
2. **NEVER assume** user preferences - always load_memory first  
3. **NEVER repeat** external searches - check memory systems first
4. **ALWAYS store** successful patterns and user preferences
5. **ALWAYS cite** memory sources when using retrieved information

This memory-first approach ensures intelligent, personalized, and efficient responses.
"""

    def get_agent_coordination_memory_patterns(self) -> str:
        """Get agent coordination memory patterns."""

        return """
## 🤝 AGENT COORDINATION MEMORY PATTERNS

### Multi-Agent Memory Sharing
When working with other agents, use session.state for coordination:

```python
# Research Agent stores findings
session.state['research_findings'] = {
    "sources": [...],
    "key_insights": [...],
    "data_quality": "high"
}

# Analysis Agent accesses research findings
research_data = session.state.get('research_findings', {})
# Process and add analysis results
session.state['analysis_results'] = {
    "insights": [...],
    "recommendations": [...],
    "confidence": 0.85
}

# Strategy Agent coordinates final output
research = session.state.get('research_findings', {})
analysis = session.state.get('analysis_results', {})
# Create comprehensive strategy
```

### Progress Tracking (Manus-Inspired)
Maintain task progress in session state:

```python
session.state['current_plan'] = [
    {"step": 1, "task": "Research requirements", "status": "completed", "agent": "research"},
    {"step": 2, "task": "Analyze data", "status": "in_progress", "agent": "analysis"},
    {"step": 3, "task": "Generate strategy", "status": "pending", "agent": "strategy"}
]
```

### Memory-Driven Agent Selection
Use memory to choose optimal agents:

```python
# Check what worked before
previous_success = load_memory("successful agent coordination for similar task")
# Select agents based on memory insights
```
"""

    def optimize_agent_file(self, agent_file_path: Path) -> bool:
        """Optimize a single agent file for memory-first behavior."""

        try:
            logger.info(f"Optimizing agent file: {agent_file_path}")

            # Read current agent file
            with open(agent_file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Check if already optimized
            if "MEMORY-FIRST DECISION STRATEGY" in content:
                logger.info(f"✅ Already optimized: {agent_file_path.name}")
                return True

            # Find agent instruction sections
            instruction_patterns = [
                r'(instruction\s*=\s*""")(.*?)(""")',
                r'(instruction\s*=\s*")(.*?)(")',
                r'(instruction\s*=\s*f""")(.*?)(""")',
                r'(instruction\s*=\s*f")(.*?)(")',
            ]

            optimized = False

            for pattern in instruction_patterns:
                matches = re.finditer(pattern, content, re.DOTALL)

                for match in matches:
                    start_quote = match.group(1)
                    instruction_content = match.group(2)
                    end_quote = match.group(3)

                    # Add memory-first strategy to instruction
                    memory_additions = self.get_memory_first_prompt_additions()

                    # Check if this is a coordination-related agent
                    if any(
                        keyword in instruction_content.lower()
                        for keyword in ["coordinat", "orchestrat", "manag", "strategy"]
                    ):
                        memory_additions += self.get_agent_coordination_memory_patterns()

                    new_instruction = instruction_content + memory_additions

                    # Replace in content
                    new_match = start_quote + new_instruction + end_quote
                    content = content.replace(match.group(0), new_match)
                    optimized = True

                    logger.info(f"✅ Added memory-first strategy to agent instruction")

            if not optimized:
                logger.warning(f"⚠️ No instruction patterns found in {agent_file_path.name}")
                return False

            # Write optimized content
            if not self.dry_run:
                with open(agent_file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                logger.info(f"💾 Saved optimized agent file: {agent_file_path.name}")
            else:
                logger.info(f"🔍 DRY RUN: Would optimize {agent_file_path.name}")

            self.optimized_count += 1
            return True

        except Exception as e:
            logger.error(f"❌ Failed to optimize {agent_file_path}: {e}")
            return False

    def optimize_all_agents(self) -> bool:
        """Optimize all VANA agent files for memory-first behavior."""

        logger.info("🚀 Starting agent memory behavior optimization...")

        # Find all agent files
        agent_directories = [project_root / "agents" / "vana", project_root / "agent", project_root / "lib" / "_tools"]

        agent_files = []
        for directory in agent_directories:
            if directory.exists():
                # Find Python files that likely contain agents
                for file_path in directory.rglob("*.py"):
                    if any(
                        keyword in file_path.name.lower() for keyword in ["agent", "team", "coordinator", "manager"]
                    ):
                        agent_files.append(file_path)

        if not agent_files:
            logger.warning("⚠️ No agent files found to optimize")
            return False

        logger.info(f"📁 Found {len(agent_files)} agent files to optimize")

        success_count = 0
        for agent_file in agent_files:
            if self.optimize_agent_file(agent_file):
                success_count += 1

        logger.info(f"📊 Optimization completed: {success_count}/{len(agent_files)} files optimized")

        return success_count > 0

    def create_memory_usage_examples(self) -> str:
        """Create examples of proper memory usage for agents."""

        examples_content = """# VANA Agent Memory Usage Examples

## Example 1: User Asks About VANA Capabilities

```python
# ❌ WRONG - Guessing about capabilities
def handle_vana_question(query):
    return "VANA is an AI system with various capabilities..."

# ✅ CORRECT - Memory-first approach
def handle_vana_question(query):
    # First check VANA knowledge base
    knowledge_results = search_knowledge(f"VANA capabilities {query}")
    
    if knowledge_results and "fallback" not in knowledge_results:
        # Use authoritative VANA knowledge
        return format_knowledge_response(knowledge_results)
    else:
        # Fallback to general response with note
        return "Let me search for that information..." + search_web(query)
```

## Example 2: Multi-Agent Coordination

```python
# ✅ CORRECT - Memory-driven coordination
def coordinate_research_task(user_request):
    # Check if similar task was done before
    previous_approach = load_memory(f"successful research approach for {task_type}")
    
    if previous_approach:
        # Use proven approach
        strategy = adapt_previous_strategy(previous_approach, user_request)
    else:
        # Create new strategy
        strategy = create_research_strategy(user_request)
    
    # Store coordination plan in session
    session.state['coordination_plan'] = strategy
    
    # Execute with memory tracking
    results = execute_coordinated_research(strategy)
    
    # Store successful pattern for future use
    if results.success:
        session.state['successful_research_pattern'] = {
            "approach": strategy,
            "outcome": results,
            "user_satisfaction": "high"
        }
```

## Example 3: User Preference Learning

```python
# ✅ CORRECT - Learning and applying preferences
def handle_analysis_request(data, user_request):
    # Check user preferences for analysis style
    preferences = load_memory("user analysis preferences")
    
    analysis_style = "detailed"  # default
    if preferences:
        analysis_style = preferences.get("preferred_detail_level", "detailed")
        visualization_type = preferences.get("preferred_charts", "bar")
    
    # Perform analysis with user preferences
    results = analyze_data(data, style=analysis_style)
    
    # Learn from user feedback
    if user_feedback == "too_detailed":
        session.state['user_analysis_preference'] = "summary"
    elif user_feedback == "perfect":
        session.state['user_analysis_preference'] = analysis_style
```
"""

        return examples_content

    def create_memory_examples_file(self):
        """Create a file with memory usage examples."""

        examples_path = project_root / "docs" / "agent_memory_examples.md"
        examples_content = self.create_memory_usage_examples()

        if not self.dry_run:
            examples_path.parent.mkdir(exist_ok=True)
            with open(examples_path, "w", encoding="utf-8") as f:
                f.write(examples_content)
            logger.info(f"📚 Created memory usage examples: {examples_path}")
        else:
            logger.info(f"🔍 DRY RUN: Would create examples file at {examples_path}")


def main():
    """Main execution function."""

    import argparse

    parser = argparse.ArgumentParser(description="Optimize VANA agent memory behavior")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be optimized without actually doing it")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("--examples-only", action="store_true", help="Only create examples file")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    optimizer = AgentMemoryOptimizer(dry_run=args.dry_run)

    if args.examples_only:
        optimizer.create_memory_examples_file()
        return

    # Optimize agent behavior
    success = optimizer.optimize_all_agents()

    # Create examples file
    optimizer.create_memory_examples_file()

    if success:
        logger.info(f"\n🎉 Agent Memory Optimization Completed Successfully!")
        logger.info(f"📊 Total agents optimized: {optimizer.optimized_count}")
        logger.info(f"🧠 Agents now use memory-first decision strategy")

        if not args.dry_run:
            logger.info(f"\n🚀 Next steps:")
            logger.info(f"1. Test agent behavior with memory-first strategy")
            logger.info(f"2. Validate proactive memory usage")
            logger.info(f"3. Monitor memory search patterns")
    else:
        logger.error(f"\n❌ Agent optimization failed. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
