from typing import Dict, Callable, Any, List, Optional
import inspect

class Tool:
    def __init__(self, name: str, func: Callable, description: str):
        self.name = name
        self.func = func
        self.description = description
        self.parameters = inspect.signature(func).parameters

    def execute(self, **kwargs):
        return self.func(**kwargs)

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Tool] = {}

    def register(self, name: str, description: str):
        def decorator(func: Callable):
            self.tools[name] = Tool(name, func, description)
            return func
        return decorator

    def get_tool(self, name: str) -> Optional[Tool]:
        return self.tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": name,
                "description": tool.description,
                "parameters": str(tool.parameters)
            }
            for name, tool in self.tools.items()
        ]

    def execute_tool(self, name: str, **kwargs) -> Any:
        tool = self.get_tool(name)
        if not tool:
            raise ValueError(f"Tool '{name}' not found")
        return tool.execute(**kwargs)

# Global registry instance
registry = ToolRegistry()
