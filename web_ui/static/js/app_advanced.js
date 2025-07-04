// Advanced UI Methods for VANA WebUI
// This extends the main VANAWebUI class with multi-agent workflow simulation

// Add these methods to the VANAWebUI class
VANAWebUI.prototype.resetAdvancedUI = function() {
    if (this.teamLogContent) this.teamLogContent.innerHTML = '<p class="placeholder-text">Generating plan...</p>';
    if (this.taskPlanContent) this.taskPlanContent.innerHTML = '<p class="placeholder-text">Generating plan...</p>';
    if (this.canvasPreview) this.canvasPreview.innerHTML = '<p class="placeholder-text">Canvas content will appear here.</p>';
    if (this.canvasCodeContent) this.canvasCodeContent.textContent = '';
    this.rawCanvasContent = '';
    this.agentColors = {};
    this.colorIndex = 0;
};

VANAWebUI.prototype.getAgentColor = function(agentName) {
    if (!this.agentColors[agentName]) {
        this.agentColors[agentName] = this.colorPalette[this.colorIndex % this.colorPalette.length];
        this.colorIndex++;
    }
    return this.agentColors[agentName];
};

VANAWebUI.prototype.addTeamLogEntry = function(agent, message, isThinking = false) {
    if (!this.teamLogContent) return;
    
    const color = this.getAgentColor(agent);
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-agent" style="color: ${color};">[${agent}]</span>
        <span class="log-message ${isThinking ? 'thinking' : ''}">${message}</span>
    `;
    
    if (this.teamLogContent.querySelector('.placeholder-text')) {
        this.teamLogContent.innerHTML = '';
    }
    
    this.teamLogContent.appendChild(entry);
    this.teamLogContent.scrollTop = this.teamLogContent.scrollHeight;
};

VANAWebUI.prototype.updateTaskPlan = function(tasks) {
    if (!this.taskPlanContent) return;
    
    this.taskPlanContent.innerHTML = '';
    tasks.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.dataset.taskIndex = index;
        taskItem.innerHTML = `
            <div class="task-status">📋</div>
            <div class="task-description">${task}</div>
        `;
        this.taskPlanContent.appendChild(taskItem);
    });
};

VANAWebUI.prototype.updateTaskStatus = function(taskIndex, status) {
    if (!this.taskPlanContent) return;
    
    const taskItem = this.taskPlanContent.querySelector(`[data-task-index="${taskIndex}"]`);
    if (taskItem) {
        const statusEl = taskItem.querySelector('.task-status');
        const descEl = taskItem.querySelector('.task-description');
        
        const statusIcons = { pending: '📋', working: '⏳', completed: '✅' };
        statusEl.textContent = statusIcons[status] || '📋';
        
        descEl.className = 'task-description';
        if (status === 'working') {
            descEl.classList.add('working');
        } else if (status === 'completed') {
            descEl.classList.add('completed');
        }
    }
};

VANAWebUI.prototype.updateCanvas = function(content) {
    this.rawCanvasContent = content;
    if (this.canvasPreview) {
        const htmlContent = this.parseMarkdown(content);
        this.canvasPreview.innerHTML = htmlContent;
    }
    if (this.canvasCodeContent) {
        this.canvasCodeContent.textContent = content;
    }
};

VANAWebUI.prototype.parseMarkdown = function(text) {
    return text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>')
        .replace(/\n/gim, '<br>');
};

VANAWebUI.prototype.simulateAgentWorkflow = function(userMessage) {
    setTimeout(() => {
        this.addTeamLogEntry('VANA', `Received request: "${userMessage}". Generating initial plan.`);
        
        const mockTasks = [
            `Research-Agent: Analyze requirements for "${userMessage}"`,
            `Planning-Agent: Create detailed execution strategy`,
            `Writer-Agent: Generate comprehensive response`,
            `Quality-Agent: Review and finalize output`
        ];
        
        this.updateTaskPlan(mockTasks);
        this.addTeamLogEntry('VANA', 'Plan approved. Delegating tasks to specialist agents.');
        
        this.simulateAgentTasks(mockTasks, userMessage);
    }, 1000);
};

VANAWebUI.prototype.simulateAgentTasks = async function(tasks, userMessage) {
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const agentMatch = task.match(/^(\w+-Agent):/);
        const agent = agentMatch ? agentMatch[1] : 'Agent';
        
        await this.delay(1500);
        this.updateTaskStatus(i, 'working');
        this.addTeamLogEntry(agent, `Starting task: "${task}"`, true);
        
        await this.delay(2000);
        this.updateTaskStatus(i, 'completed');
        this.addTeamLogEntry(agent, `Completed task: "${task}"`);
    }
    
    await this.delay(1000);
    this.addTeamLogEntry('VANA', 'All tasks complete. Synthesizing final response.');
    
    const canvasContent = `# Task Completion Report

## Request Analysis
User requested: "${userMessage}"

## Execution Summary
- ✅ Requirements analyzed by Research-Agent
- ✅ Strategy developed by Planning-Agent  
- ✅ Response generated by Writer-Agent
- ✅ Quality assured by Quality-Agent

## Results
The multi-agent system has successfully processed your request through a coordinated workflow involving specialized agents.

**Key Findings:**
- All agents completed their assigned tasks
- Workflow executed smoothly with full transparency
- Final output meets quality standards

This demonstrates the power of multi-agent AI systems working in coordination to deliver comprehensive results.`;

    this.updateCanvas(canvasContent);
    
    const finalMessage = `Task completed! I've processed your request "${userMessage}" using a coordinated team of specialist agents. You can see the full workflow in the Team Log and the detailed results in the Canvas.`;
    this.addMessage('assistant', finalMessage, 'VANA Orchestrator');
    
    this.addTeamLogEntry('VANA', 'Final answer provided to user.');
    this.sendButton.disabled = false;
    this.updateAgentStatus('Ready', 'success');
};

VANAWebUI.prototype.delay = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

VANAWebUI.prototype.getLastUserMessage = function() {
    return this.lastUserMessage || '';
};

// Override the addMessage method to track user messages
const originalAddMessage = VANAWebUI.prototype.addMessage;
VANAWebUI.prototype.addMessage = function(role, content, agent = null) {
    if (role === 'user') {
        this.lastUserMessage = content;
    }
    
    const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
    if (welcomeMessage && this.isFirstMessage) {
        welcomeMessage.remove();
        this.isFirstMessage = false;
    }
    
    return originalAddMessage.call(this, role, content, agent);
};

// Override the handleWebSocketMessage to trigger simulation
const originalHandleWebSocketMessage = VANAWebUI.prototype.handleWebSocketMessage;
VANAWebUI.prototype.handleWebSocketMessage = function(data) {
    originalHandleWebSocketMessage.call(this, data);
    
    // Trigger advanced UI simulation after agent response is complete
    if (data.type === 'agent_response_complete') {
        const lastUserMessage = this.getLastUserMessage();
        if (lastUserMessage) {
            this.simulateAgentWorkflow(lastUserMessage);
        }
    }
};
