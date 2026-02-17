import pytest
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.engine import AgentEngine, AgentConfig

def test_agent_engine_initialization():
    # Mock config path
    config_path = "config/agents_sample.json"
    
    # Create a dummy config if it doesn't exist for testing
    if not os.path.exists(config_path):
        import json
        os.makedirs("config", exist_ok=True)
        with open(config_path, "w") as f:
            json.dump({
                "agents": [
                    {
                        "id": "test_agent",
                        "name": "Test Agent",
                        "role": "Tester",
                        "description": "A test agent",
                        "capabilities": ["conversation"],
                        "model": "gpt-3.5-turbo"
                    }
                ]
            }, f)

    engine = AgentEngine(config_path)
    assert len(engine.agents) > 0
    assert engine.get_agent("test_agent") is not None

def test_agent_execution():
    config_path = "config/agents_sample.json"
    engine = AgentEngine(config_path)
    
    result = engine.execute_agent("test_agent", "Hello", "session_1")
    assert result["agent"] == "Test Agent"
    assert "Processed: Hello" in result["response"]
    assert result["history_length"] == 2 # User + Assistant
