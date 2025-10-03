# Tool Registration Guide

This guide explains how to register tools with agents in the AgentPress system, including configuration options, tool groups, and granular method control.

## Table of Contents

1. [Overview](#overview)
2. [Basic Tool Registration](#basic-tool-registration)
3. [Tool Groups Configuration](#tool-groups-configuration)
4. [Granular Method Control](#granular-method-control)
5. [Agent Configuration](#agent-configuration)
6. [Registration Patterns](#registration-patterns)
7. [Debugging and Troubleshooting](#debugging-and-troubleshooting)

## Overview

Tool registration is the process of making tools available to agents. The AgentPress system uses a `ToolRegistry` to manage tools and their schemas, which are then made available to the LLM through OpenAPI function definitions.

### Key Components

- **ToolRegistry**: Manages tool instances and their schemas
- **ThreadManager**: Coordinates tool registration and execution
- **Tool Groups**: Organize tools for UI and configuration
- **Agent Configuration**: Controls which tools are enabled per agent

## Basic Tool Registration

### 1. Direct Registration in Code

The most straightforward way to register a tool:

```python
from core.agentpress.thread_manager import ThreadManager
from your_module import YourTool

# Create thread manager
thread_manager = ThreadManager()

# Register tool (all methods enabled)
thread_manager.add_tool(YourTool)

# Register tool with parameters
thread_manager.add_tool(YourTool, param1="value1", param2="value2")

# Register only specific methods
thread_manager.add_tool(YourTool, function_names=["method1", "method2"])
```

### 2. Registration with Parameters

Tools often need initialization parameters:

```python
# Sandbox tools need project_id and thread_manager
thread_manager.add_tool(
    SandboxFilesTool,
    project_id=project_id,
    thread_manager=thread_manager
)

# Tools with external service connections
thread_manager.add_tool(
    SearchTool,
    thread_manager=thread_manager,
    api_key=config.SEARCH_API_KEY
)

# Database-connected tools
thread_manager.add_tool(
    DataTool,
    db_connection=db,
    account_id=account_id
)
```

### 3. Real-World Registration Examples

Based on the AgentPress codebase, here are actual registration patterns:

```python
# Core tools (always available)
def _register_core_tools(self):
    """Register core tools that are always available."""
    self.thread_manager.add_tool(
        ExpandMessageTool,
        thread_id=self.thread_id,
        thread_manager=self.thread_manager
    )
    self.thread_manager.add_tool(MessageTool)
    self.thread_manager.add_tool(
        TaskListTool,
        project_id=self.project_id,
        thread_manager=self.thread_manager,
        thread_id=self.thread_id
    )

# Sandbox tools with conditional enabling
def _register_sandbox_tools(self, disabled_tools: List[str]):
    """Register sandbox-related tools with granular control."""
    sandbox_tools = {
        'sb_files_tool': SandboxFilesTool,
        'sb_shell_tool': SandboxShellTool,
        'sb_browser_tool': SandboxBrowserTool,
        # ... more tools
    }

    for tool_name, tool_class in sandbox_tools.items():
        if tool_name not in disabled_tools:
            kwargs = {
                'project_id': self.project_id,
                'thread_manager': self.thread_manager
            }

            enabled_methods = self._get_enabled_methods_for_tool(tool_name)
            if enabled_methods is not None:
                # Register only enabled methods
                self.thread_manager.add_tool(
                    tool_class,
                    function_names=enabled_methods,
                    **kwargs
                )
            else:
                # Register all methods
                self.thread_manager.add_tool(tool_class, **kwargs)
```

## Tool Groups Configuration

Tool groups organize tools for UI display and configuration management. They're defined in `backend/core/utils/tool_groups.py`.

### 1. Understanding Tool Groups

```python
@dataclass
class ToolGroup:
    name: str                    # Internal identifier
    display_name: str           # UI display name
    description: str            # Description for users
    tool_class: str            # Class name of the tool
    methods: List[ToolMethod]  # Available methods
    enabled: bool = True       # Whether group is enabled
    is_core: bool = False      # Whether it's a core tool
```

### 2. Example Tool Group Definition

```python
TOOL_GROUPS: Dict[str, ToolGroup] = {
    "calculator_tool": ToolGroup(
        name="calculator_tool",
        display_name="Calculator",
        description="Mathematical operations and calculations",
        tool_class="CalculatorTool",
        methods=[
            ToolMethod(
                name="add",
                display_name="Addition",
                description="Add numbers together",
                enabled=True
            ),
            ToolMethod(
                name="multiply",
                display_name="Multiplication",
                description="Multiply numbers",
                enabled=True
            ),
            ToolMethod(
                name="divide",
                display_name="Division",
                description="Divide numbers",
                enabled=True,
                is_core=False
            )
        ],
        enabled=True,
        is_core=False
    )
}
```

### 3. Adding Your Tool to Tool Groups

To add your tool to the system's tool groups:

1. **Edit tool_groups.py**:

```python
# In backend/core/utils/tool_groups.py
from your_module import YourTool

TOOL_GROUPS["your_tool"] = ToolGroup(
    name="your_tool",
    display_name="Your Tool Name",
    description="What your tool does",
    tool_class="YourTool",
    methods=[
        ToolMethod(
            name="method_name",
            display_name="Method Display Name",
            description="What this method does",
            enabled=True
        ),
        # ... more methods
    ],
    enabled=True
)
```

2. **Register in agent configuration**:

```python
# In your agent setup
if "your_tool" not in disabled_tools:
    enabled_methods = self._get_enabled_methods_for_tool("your_tool")
    if enabled_methods is not None:
        self.thread_manager.add_tool(
            YourTool,
            function_names=enabled_methods,
            **kwargs
        )
    else:
        self.thread_manager.add_tool(YourTool, **kwargs)
```

## Granular Method Control

The system supports enabling/disabling specific methods within tools.

### 1. Method Control Configuration

Agent configurations can specify which methods are enabled:

```python
{
    "tools": {
        "calculator_tool": {
            "enabled": true,
            "methods": {
                "add": {"enabled": true},
                "subtract": {"enabled": false},
                "multiply": {"enabled": true},
                "divide": {"enabled": false}
            }
        }
    }
}
```

### 2. Implementation Pattern

```python
def _get_enabled_methods_for_tool(self, tool_name: str) -> Optional[List[str]]:
    """Get list of enabled methods for a tool, or None for all methods."""
    if not hasattr(self, 'agent_config') or not self.agent_config:
        return None

    tools_config = self.agent_config.get('tools', {})
    tool_config = tools_config.get(tool_name, {})

    if not tool_config.get('enabled', True):
        return []  # Tool disabled entirely

    methods_config = tool_config.get('methods', {})
    if not methods_config:
        return None  # All methods enabled

    enabled_methods = [
        method_name for method_name, method_config in methods_config.items()
        if method_config.get('enabled', True)
    ]

    return enabled_methods if enabled_methods else None

# Usage in registration
enabled_methods = self._get_enabled_methods_for_tool('calculator_tool')
if enabled_methods is not None:
    self.thread_manager.add_tool(
        CalculatorTool,
        function_names=enabled_methods
    )
else:
    self.thread_manager.add_tool(CalculatorTool)
```

## Agent Configuration

### 1. Agent Configuration Structure

```python
{
    "agent_id": "your-agent-id",
    "name": "Your Agent",
    "tools": {
        "tool_name": {
            "enabled": true,
            "methods": {
                "method_name": {"enabled": true},
                "another_method": {"enabled": false}
            }
        }
    },
    "disabled_tools": ["unwanted_tool"],
    "sandbox_config": {
        "enabled": true,
        "workspace_path": "/workspace"
    }
}
```

### 2. Creating Agent Configurations

```python
# Define agent configuration
agent_config = {
    "tools": {
        "calculator_tool": {
            "enabled": True,
            "methods": {
                "add": {"enabled": True},
                "multiply": {"enabled": True},
                "divide": {"enabled": False}  # Disable division
            }
        },
        "text_processing_tool": {
            "enabled": True
            # No methods specified = all methods enabled
        }
    }
}

# Use in thread manager
thread_manager = ThreadManager(agent_config=agent_config)
```

### 3. Dynamic Tool Registration

```python
class AgentSetup:
    def __init__(self, agent_config, project_id, thread_id):
        self.agent_config = agent_config
        self.project_id = project_id
        self.thread_id = thread_id
        self.thread_manager = ThreadManager(agent_config=agent_config)

    def setup_tools(self):
        """Set up tools based on agent configuration."""
        # Get disabled tools list
        disabled_tools = self.agent_config.get('disabled_tools', [])

        # Register core tools (always enabled)
        self._register_core_tools()

        # Register optional tools based on configuration
        self._register_optional_tools(disabled_tools)

    def _register_core_tools(self):
        """Register tools that are always available."""
        self.thread_manager.add_tool(MessageTool)
        self.thread_manager.add_tool(
            TaskListTool,
            project_id=self.project_id,
            thread_manager=self.thread_manager,
            thread_id=self.thread_id
        )

    def _register_optional_tools(self, disabled_tools):
        """Register tools that can be disabled."""
        # Calculator tool
        if "calculator_tool" not in disabled_tools:
            enabled_methods = self._get_enabled_methods_for_tool("calculator_tool")
            if enabled_methods is not None:
                self.thread_manager.add_tool(
                    CalculatorTool,
                    function_names=enabled_methods
                )
            else:
                self.thread_manager.add_tool(CalculatorTool)

        # Text processing tool (requires sandbox)
        if "text_processing_tool" not in disabled_tools:
            enabled_methods = self._get_enabled_methods_for_tool("text_processing_tool")
            if enabled_methods is not None:
                self.thread_manager.add_tool(
                    TextProcessingTool,
                    function_names=enabled_methods,
                    project_id=self.project_id,
                    thread_manager=self.thread_manager
                )
            else:
                self.thread_manager.add_tool(
                    TextProcessingTool,
                    project_id=self.project_id,
                    thread_manager=self.thread_manager
                )
```

## Registration Patterns

### 1. Core Tools Pattern

Tools that should always be available:

```python
def register_core_tools(self):
    """Core tools are always registered."""
    self.thread_manager.add_tool(MessageTool)
    self.thread_manager.add_tool(TaskListTool, **required_params)
```

### 2. Conditional Tools Pattern

Tools that can be disabled or require specific conditions:

```python
def register_conditional_tools(self, config):
    """Tools that depend on configuration or external services."""
    # Check if API key is available
    if config.get('SEARCH_API_KEY'):
        self.thread_manager.add_tool(SearchTool, api_key=config.SEARCH_API_KEY)

    # Check if tool is enabled in configuration
    if config.get('enable_advanced_features'):
        self.thread_manager.add_tool(AdvancedTool)
```

### 3. Parameterized Tools Pattern

Tools that need different parameters based on context:

```python
def register_parameterized_tools(self, context):
    """Tools that need context-specific parameters."""
    # Sandbox tools need project context
    if context.get('project_id'):
        self.thread_manager.add_tool(
            SandboxFilesTool,
            project_id=context['project_id'],
            thread_manager=self.thread_manager
        )

    # Database tools need connection info
    if context.get('db_connection'):
        self.thread_manager.add_tool(
            DatabaseTool,
            db_connection=context['db_connection'],
            schema=context.get('db_schema', 'public')
        )
```

### 4. Error-Resilient Registration Pattern

Handle registration errors gracefully:

```python
def register_tools_safely(self, tools_config):
    """Register tools with error handling."""
    for tool_name, tool_class in tools_config.items():
        try:
            # Get configuration for this tool
            tool_config = self.get_tool_config(tool_name)

            # Register with appropriate parameters
            self.thread_manager.add_tool(tool_class, **tool_config)

            logger.info(f"Successfully registered {tool_name}")

        except Exception as e:
            logger.warning(f"Failed to register {tool_name}: {e}")
            # Continue with other tools
            continue
```

## Debugging and Troubleshooting

### 1. Common Issues

**Tool Not Found Error**:
```python
# Check if tool is properly registered
registered_tools = thread_manager.tool_registry.tools
print("Registered tools:", list(registered_tools.keys()))
```

**Schema Registration Issues**:
```python
# Check tool schemas
tool_instance = YourTool()
schemas = tool_instance.get_schemas()
print("Tool schemas:", schemas)
```

**Method Not Available**:
```python
# Check enabled methods
enabled_methods = self._get_enabled_methods_for_tool("your_tool")
print("Enabled methods:", enabled_methods)
```

### 2. Debugging Tools

**List All Available Tools**:
```python
def debug_tool_registry(thread_manager):
    """Debug tool registration."""
    registry = thread_manager.tool_registry

    print("Registered Tools:")
    for tool_name, tool_info in registry.tools.items():
        print(f"  {tool_name}: {tool_info['instance'].__class__.__name__}")

    print("\nOpenAPI Schemas:")
    schemas = registry.get_openapi_schemas()
    for schema in schemas:
        print(f"  {schema['function']['name']}")

    print("\nUsage Examples:")
    examples = registry.get_usage_examples()
    for func_name, example in examples.items():
        print(f"  {func_name}: {len(example)} chars")
```

**Validate Tool Configuration**:
```python
def validate_tool_config(tool_class, config):
    """Validate tool configuration before registration."""
    try:
        # Try to instantiate the tool
        tool_instance = tool_class(**config)
        print(f"✅ {tool_class.__name__} configuration valid")

        # Check for required methods
        schemas = tool_instance.get_schemas()
        if not schemas:
            print(f"⚠️  {tool_class.__name__} has no schemas defined")

        return True

    except Exception as e:
        print(f"❌ {tool_class.__name__} configuration invalid: {e}")
        return False
```

### 3. Testing Tool Registration

**Unit Test Example**:
```python
import pytest
from core.agentpress.thread_manager import ThreadManager
from your_tool import YourTool

def test_tool_registration():
    """Test that tool registers correctly."""
    thread_manager = ThreadManager()

    # Register tool
    thread_manager.add_tool(YourTool, param1="test_value")

    # Check registration
    assert "your_method" in thread_manager.tool_registry.tools

    # Check schema availability
    schemas = thread_manager.tool_registry.get_openapi_schemas()
    method_names = [s['function']['name'] for s in schemas]
    assert "your_method" in method_names

def test_method_filtering():
    """Test that method filtering works."""
    thread_manager = ThreadManager()

    # Register with specific methods
    thread_manager.add_tool(YourTool, function_names=["method1"])

    # Check only specified method is available
    assert "method1" in thread_manager.tool_registry.tools
    assert "method2" not in thread_manager.tool_registry.tools
```

## Complete Example

Here's a complete example of setting up tool registration for a new agent:

```python
from core.agentpress.thread_manager import ThreadManager
from examples.simple_tool_example import CalculatorTool
from examples.sandbox_tool_example import TextProcessingTool

class MyAgentSetup:
    def __init__(self, project_id: str, thread_id: str, agent_config: dict):
        self.project_id = project_id
        self.thread_id = thread_id
        self.agent_config = agent_config
        self.thread_manager = ThreadManager(agent_config=agent_config)

    def setup_all_tools(self):
        """Set up all tools for the agent."""
        disabled_tools = self.agent_config.get('disabled_tools', [])

        # Core tools (always enabled)
        self._register_core_tools()

        # Optional tools
        self._register_calculator_tool(disabled_tools)
        self._register_text_processing_tool(disabled_tools)

    def _register_core_tools(self):
        """Register core tools."""
        from core.tools.message_tool import MessageTool
        from core.tools.task_list_tool import TaskListTool

        self.thread_manager.add_tool(MessageTool)
        self.thread_manager.add_tool(
            TaskListTool,
            project_id=self.project_id,
            thread_manager=self.thread_manager,
            thread_id=self.thread_id
        )

    def _register_calculator_tool(self, disabled_tools):
        """Register calculator tool if enabled."""
        if "calculator_tool" not in disabled_tools:
            enabled_methods = self._get_enabled_methods_for_tool("calculator_tool")
            if enabled_methods is not None:
                self.thread_manager.add_tool(
                    CalculatorTool,
                    function_names=enabled_methods
                )
            else:
                self.thread_manager.add_tool(CalculatorTool)

    def _register_text_processing_tool(self, disabled_tools):
        """Register text processing tool if enabled."""
        if "text_processing_tool" not in disabled_tools:
            enabled_methods = self._get_enabled_methods_for_tool("text_processing_tool")
            if enabled_methods is not None:
                self.thread_manager.add_tool(
                    TextProcessingTool,
                    function_names=enabled_methods,
                    project_id=self.project_id,
                    thread_manager=self.thread_manager
                )
            else:
                self.thread_manager.add_tool(
                    TextProcessingTool,
                    project_id=self.project_id,
                    thread_manager=self.thread_manager
                )

    def _get_enabled_methods_for_tool(self, tool_name: str):
        """Get enabled methods for a tool from configuration."""
        tools_config = self.agent_config.get('tools', {})
        tool_config = tools_config.get(tool_name, {})

        if not tool_config.get('enabled', True):
            return []

        methods_config = tool_config.get('methods', {})
        if not methods_config:
            return None

        enabled_methods = [
            method_name for method_name, method_config in methods_config.items()
            if method_config.get('enabled', True)
        ]

        return enabled_methods if enabled_methods else None

# Usage
if __name__ == "__main__":
    agent_config = {
        "tools": {
            "calculator_tool": {
                "enabled": True,
                "methods": {
                    "add": {"enabled": True},
                    "multiply": {"enabled": True},
                    "divide": {"enabled": False}
                }
            },
            "text_processing_tool": {
                "enabled": True
            }
        }
    }

    setup = MyAgentSetup("project-123", "thread-456", agent_config)
    setup.setup_all_tools()

    print("Tools registered successfully!")
```

## Next Steps

1. Read [TOOL_DEVELOPMENT.md](TOOL_DEVELOPMENT.md) to understand how to create tools
2. See [examples/](examples/) for complete tool implementations
3. Check [TOOL_BEST_PRACTICES.md](TOOL_BEST_PRACTICES.md) for optimization tips
4. Review existing agent setups in `backend/core/run.py` for real-world patterns