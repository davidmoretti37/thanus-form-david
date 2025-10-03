# Tool Development Guide

This guide explains how to create new tools for agents in the AgentPress system. Tools are the primary way agents interact with external services, perform operations, and extend their capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Tool Architecture](#tool-architecture)
3. [Base Classes](#base-classes)
4. [Creating Your First Tool](#creating-your-first-tool)
5. [Tool Components](#tool-components)
6. [Advanced Features](#advanced-features)
7. [Testing Tools](#testing-tools)
8. [Common Patterns](#common-patterns)

## Overview

AgentPress tools are Python classes that inherit from base tool classes and provide specific functionality to agents. Each tool:

- Defines one or more methods that agents can call
- Uses OpenAPI schemas to describe parameters and behavior
- Provides usage examples for better agent understanding
- Returns standardized `ToolResult` objects
- Can be enabled/disabled and configured per agent

## Tool Architecture

```
Tool Hierarchy:
├── Tool (base class)
│   ├── MessageTool
│   ├── WebSearchTool
│   └── ... (other tools)
└── SandboxToolsBase (extends Tool)
    ├── SandboxFilesTool
    ├── SandboxShellTool
    └── ... (sandbox-enabled tools)
```

## Base Classes

### Tool (core/agentpress/tool.py)

The base class for all tools. Use this for tools that don't need sandbox access.

```python
from core.agentpress.tool import Tool, ToolResult, openapi_schema, usage_example

class MyTool(Tool):
    def __init__(self):
        super().__init__()
```

**Key features:**
- Schema registration system
- Standardized result handling with `success_response()` and `fail_response()`
- Automatic method discovery and registration

### SandboxToolsBase (core/sandbox/tool_base.py)

Use this for tools that need to interact with the project's sandbox environment (files, shell commands, etc.).

```python
from core.sandbox.tool_base import SandboxToolsBase
from core.agentpress.thread_manager import ThreadManager

class MySandboxTool(SandboxToolsBase):
    def __init__(self, project_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
```

**Key features:**
- Automatic sandbox management
- File system access within `/workspace`
- Project-scoped operations

## Creating Your First Tool

Let's create a simple calculator tool step by step:

### Step 1: Create the Tool Class

```python
from typing import Union
from core.agentpress.tool import Tool, ToolResult, openapi_schema, usage_example

class CalculatorTool(Tool):
    """A simple calculator tool for basic mathematical operations."""

    def __init__(self):
        super().__init__()
```

### Step 2: Add a Method with Schema

```python
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "add",
            "description": "Add two numbers together and return the result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {
                        "type": "number",
                        "description": "The first number to add"
                    },
                    "b": {
                        "type": "number",
                        "description": "The second number to add"
                    }
                },
                "required": ["a", "b"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="add">
        <parameter name="a">5</parameter>
        <parameter name="b">3</parameter>
        </invoke>
        </function_calls>
        ''')
    async def add(self, a: Union[int, float], b: Union[int, float]) -> ToolResult:
        """Add two numbers together."""
        try:
            result = a + b
            return self.success_response({
                "operation": "addition",
                "inputs": {"a": a, "b": b},
                "result": result
            })
        except Exception as e:
            return self.fail_response(f"Error performing addition: {str(e)}")
```

### Step 3: Complete Tool Example

Here's the complete calculator tool:

```python
from typing import Union
from core.agentpress.tool import Tool, ToolResult, openapi_schema, usage_example

class CalculatorTool(Tool):
    """A simple calculator tool for basic mathematical operations."""

    def __init__(self):
        super().__init__()

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "add",
            "description": "Add two numbers together and return the result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "The first number to add"},
                    "b": {"type": "number", "description": "The second number to add"}
                },
                "required": ["a", "b"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="add">
        <parameter name="a">5</parameter>
        <parameter name="b">3</parameter>
        </invoke>
        </function_calls>
        ''')
    async def add(self, a: Union[int, float], b: Union[int, float]) -> ToolResult:
        """Add two numbers together."""
        try:
            result = a + b
            return self.success_response({
                "operation": "addition",
                "inputs": {"a": a, "b": b},
                "result": result
            })
        except Exception as e:
            return self.fail_response(f"Error performing addition: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "multiply",
            "description": "Multiply two numbers together and return the result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "The first number to multiply"},
                    "b": {"type": "number", "description": "The second number to multiply"}
                },
                "required": ["a", "b"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="multiply">
        <parameter name="a">4</parameter>
        <parameter name="b">7</parameter>
        </invoke>
        </function_calls>
        ''')
    async def multiply(self, a: Union[int, float], b: Union[int, float]) -> ToolResult:
        """Multiply two numbers together."""
        try:
            result = a * b
            return self.success_response({
                "operation": "multiplication",
                "inputs": {"a": a, "b": b},
                "result": result
            })
        except Exception as e:
            return self.fail_response(f"Error performing multiplication: {str(e)}")
```

## Tool Components

### 1. OpenAPI Schema Decorator

The `@openapi_schema` decorator defines how the LLM should call your tool method:

```python
@openapi_schema({
    "type": "function",
    "function": {
        "name": "method_name",           # Must match the actual method name
        "description": "Clear description of what this method does",
        "parameters": {
            "type": "object",
            "properties": {
                "param_name": {
                    "type": "string|number|boolean|array|object",
                    "description": "What this parameter is for",
                    "enum": ["option1", "option2"],  # For limited choices
                    "default": "default_value"        # Optional default
                }
            },
            "required": ["param1", "param2"]  # List required parameters
        }
    }
})
```

**Parameter Types:**
- `string`: Text input
- `number`: Integer or float
- `boolean`: true/false
- `array`: List of values
- `object`: Nested object/dictionary

### 2. Usage Example Decorator

The `@usage_example` decorator provides examples that help the LLM understand how to use your tool:

```python
@usage_example('''
    <function_calls>
    <invoke name="method_name">
    <parameter name="param1">example_value</parameter>
    <parameter name="param2">another_value</parameter>
    </invoke>
    </function_calls>

    <!-- You can include multiple examples -->
    <function_calls>
    <invoke name="method_name">
    <parameter name="param1">different_value</parameter>
    </invoke>
    </function_calls>
    ''')
```

### 3. Method Implementation

All tool methods should:
- Be `async` functions
- Return `ToolResult` objects
- Handle exceptions gracefully
- Use type hints for parameters

```python
async def method_name(self, param1: str, param2: int = 10) -> ToolResult:
    """Method description for documentation."""
    try:
        # Your implementation here
        result = do_something(param1, param2)

        # Return success with data
        return self.success_response({
            "status": "completed",
            "result": result
        })
    except Exception as e:
        # Return failure with error message
        return self.fail_response(f"Operation failed: {str(e)}")
```

### 4. ToolResult Objects

Use the helper methods from the base class:

```python
# Success response with dictionary data
return self.success_response({"key": "value"})

# Success response with string data
return self.success_response("Operation completed successfully")

# Failure response
return self.fail_response("Error message describing what went wrong")
```

## Advanced Features

### Working with External APIs

```python
import httpx
from core.utils.config import config

class APITool(Tool):
    def __init__(self):
        super().__init__()
        self.api_key = config.YOUR_API_KEY

    async def call_api(self, query: str) -> ToolResult:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.example.com/search",
                    params={"q": query},
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()
                return self.success_response(response.json())
        except httpx.HTTPError as e:
            return self.fail_response(f"API request failed: {str(e)}")
```

### Sandbox File Operations

```python
from core.sandbox.tool_base import SandboxToolsBase

class FileTool(SandboxToolsBase):
    async def read_project_file(self, file_path: str) -> ToolResult:
        try:
            await self._ensure_sandbox()  # Ensure sandbox is ready

            # Clean the path to be relative to /workspace
            clean_file_path = self.clean_path(file_path)

            # Read file from sandbox
            result = await self.sandbox.exec(f"cat {clean_file_path}")

            if result.exit_code == 0:
                return self.success_response({
                    "file_path": clean_file_path,
                    "content": result.stdout
                })
            else:
                return self.fail_response(f"Failed to read file: {result.stderr}")
        except Exception as e:
            return self.fail_response(f"Error reading file: {str(e)}")
```

### Complex Parameter Validation

```python
from typing import List, Dict, Any, Optional

@openapi_schema({
    "type": "function",
    "function": {
        "name": "complex_operation",
        "parameters": {
            "type": "object",
            "properties": {
                "config": {
                    "type": "object",
                    "properties": {
                        "mode": {"type": "string", "enum": ["fast", "thorough"]},
                        "options": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["mode"]
                },
                "files": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 1
                }
            },
            "required": ["config", "files"]
        }
    }
})
async def complex_operation(
    self,
    config: Dict[str, Any],
    files: List[str],
    optional_param: Optional[str] = None
) -> ToolResult:
    try:
        # Validate config structure
        if "mode" not in config:
            return self.fail_response("Config must include 'mode' field")

        if config["mode"] not in ["fast", "thorough"]:
            return self.fail_response("Mode must be 'fast' or 'thorough'")

        # Process the operation
        # ...

        return self.success_response({"processed": len(files)})
    except Exception as e:
        return self.fail_response(f"Processing failed: {str(e)}")
```

## Testing Tools

### Unit Testing Example

```python
import pytest
from your_tool import CalculatorTool

@pytest.mark.asyncio
async def test_calculator_add():
    calc = CalculatorTool()

    # Test successful addition
    result = await calc.add(5, 3)
    assert result.success is True

    # Parse the result
    import json
    data = json.loads(result.output)
    assert data["result"] == 8
    assert data["operation"] == "addition"

@pytest.mark.asyncio
async def test_calculator_error_handling():
    calc = CalculatorTool()

    # Test with invalid input (this would depend on your validation)
    result = await calc.add("invalid", 3)
    assert result.success is False
    assert "error" in result.output.lower()
```

### Manual Testing

```python
# Create a simple test script
import asyncio

async def test_tool():
    tool = CalculatorTool()

    # Test addition
    result = await tool.add(10, 5)
    print("Add result:", result.success, result.output)

    # Test multiplication
    result = await tool.multiply(4, 7)
    print("Multiply result:", result.success, result.output)

if __name__ == "__main__":
    asyncio.run(test_tool())
```

## Common Patterns

### 1. Input Validation Pattern

```python
async def my_method(self, input_value: str) -> ToolResult:
    # Validate input
    if not input_value or not isinstance(input_value, str):
        return self.fail_response("Input value must be a non-empty string")

    if len(input_value) > 1000:
        return self.fail_response("Input value too long (max 1000 characters)")

    # Continue with processing...
```

### 2. External Service Pattern

```python
async def call_service(self, query: str) -> ToolResult:
    try:
        # Make API call
        result = await some_external_service(query)

        # Transform response for agent
        return self.success_response({
            "query": query,
            "results": result,
            "timestamp": datetime.now().isoformat()
        })

    except ServiceUnavailableError:
        return self.fail_response("External service is currently unavailable")
    except RateLimitError:
        return self.fail_response("Rate limit exceeded, please try again later")
    except Exception as e:
        return self.fail_response(f"Unexpected error: {str(e)}")
```

### 3. Batch Operations Pattern

```python
async def process_batch(self, items: List[str]) -> ToolResult:
    results = []
    errors = []

    for i, item in enumerate(items):
        try:
            result = await process_single_item(item)
            results.append({"item": item, "result": result})
        except Exception as e:
            errors.append({"item": item, "error": str(e)})

    return self.success_response({
        "total_items": len(items),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors if errors else None
    })
```

### 4. File Processing Pattern (Sandbox Tools)

```python
async def process_file(self, file_path: str) -> ToolResult:
    try:
        await self._ensure_sandbox()

        # Clean and validate path
        clean_path = self.clean_path(file_path)

        # Check if file exists
        check_result = await self.sandbox.exec(f"test -f {clean_path}")
        if check_result.exit_code != 0:
            return self.fail_response(f"File not found: {clean_path}")

        # Process the file
        result = await self.sandbox.exec(f"your_command {clean_path}")

        if result.exit_code == 0:
            return self.success_response({
                "file": clean_path,
                "output": result.stdout
            })
        else:
            return self.fail_response(f"Processing failed: {result.stderr}")

    except Exception as e:
        return self.fail_response(f"Error processing file: {str(e)}")
```

## Next Steps

1. See [examples/simple_tool_example.py](examples/simple_tool_example.py) for a complete simple tool
2. See [examples/sandbox_tool_example.py](examples/sandbox_tool_example.py) for a sandbox tool example
3. Read [TOOL_REGISTRATION.md](TOOL_REGISTRATION.md) to learn how to register your tool
4. Check [TOOL_BEST_PRACTICES.md](TOOL_BEST_PRACTICES.md) for advanced tips and patterns

For questions or issues, refer to the existing tools in `backend/core/tools/` for real-world examples.