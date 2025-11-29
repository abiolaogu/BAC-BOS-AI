import json
import os
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from app.tools import registry

class AgentConfig(BaseModel):
    id: str
    name: str
    role: str
    description: str
    capabilities: List[str]
    model: str

class AgentContext:
    def __init__(self):
        self.history: List[Dict[str, str]] = []

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})

    def get_history(self) -> List[Dict[str, str]]:
        return self.history

class AgentEngine:
    def __init__(self, config_path: str):
        self.agents: Dict[str, AgentConfig] = {}
        self.contexts: Dict[str, AgentContext] = {} # Map session_id to Context
        self.load_agents(config_path)

    def load_agents(self, config_path: str):
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")
        
        with open(config_path, 'r') as f:
            data = json.load(f)
            for agent_data in data.get("agents", []):
                agent = AgentConfig(**agent_data)
                self.agents[agent.id] = agent
        
        print(f"Loaded {len(self.agents)} agents.")

    def get_agent(self, agent_id: str) -> Optional[AgentConfig]:
        return self.agents.get(agent_id)

    def list_agents(self) -> List[AgentConfig]:
        return list(self.agents.values())

    def get_context(self, session_id: str) -> AgentContext:
        if session_id not in self.contexts:
            self.contexts[session_id] = AgentContext()
        return self.contexts[session_id]

    def execute_agent(self, agent_id: str, prompt: str, session_id: str = "default") -> Dict[str, Any]:
        agent = self.get_agent(agent_id)
        if not agent:
            return {"error": "Agent not found"}
        
        context = self.get_context(session_id)
        context.add_message("user", prompt)

        # 1. Check if prompt triggers a tool (Simple keyword matching for now)
        # In a real implementation, an LLM would decide which tool to call
        tool_result = None
        executed_tool = None
        
        # Example: "Create invoice for $500" -> triggers 'create_invoice' tool if capability exists
        # This is a mock logic. Real logic needs NLP/LLM function calling.
        if "invoice" in prompt.lower() and "invoice_generation" in agent.capabilities:
             # Mocking tool execution
             tool_result = f"Generated invoice for request: {prompt}"
             executed_tool = "create_invoice"

        response_content = f"[{agent.name}] Processed: {prompt}"
        if tool_result:
            response_content += f"\nExecuted Tool '{executed_tool}': {tool_result}"

        context.add_message("assistant", response_content)
        
        return {
            "agent": agent.name,
            "response": response_content,
            "tool_executed": executed_tool,
            "history_length": len(context.history)
        }
