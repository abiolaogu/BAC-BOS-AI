import json
import os
from typing import List, Dict, Optional
from pydantic import BaseModel

class AgentConfig(BaseModel):
    id: str
    name: str
    role: str
    description: str
    capabilities: List[str]
    model: str

class AgentEngine:
    def __init__(self, config_path: str):
        self.agents: Dict[str, AgentConfig] = {}
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

    def execute_agent(self, agent_id: str, prompt: str) -> str:
        agent = self.get_agent(agent_id)
        if not agent:
            return "Agent not found"
        
        # Mock execution logic
        # In a real implementation, this would call OpenAI/Anthropic/Local LLM
        return f"[{agent.name}] Processed request: {prompt} using model {agent.model}"
