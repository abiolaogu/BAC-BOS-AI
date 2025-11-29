from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.engine import AgentEngine
import os

app = FastAPI(title="NEXUS AI Service", version="1.0.0")

# Initialize Engine
config_path = os.getenv("AGENTS_CONFIG_PATH", "config/agents.json")
engine = AgentEngine(config_path)

class AgentExecutionRequest(BaseModel):
    prompt: str
    session_id: str = "default"

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/agents")
async def list_agents():
    return {"agents": engine.list_agents()}

@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = engine.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@app.post("/agents/{agent_id}/execute")
async def execute_agent(agent_id: str, req: AgentExecutionRequest):
    result = engine.execute_agent(agent_id, req.prompt, req.session_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8086))
    uvicorn.run(app, host="0.0.0.0", port=port)
