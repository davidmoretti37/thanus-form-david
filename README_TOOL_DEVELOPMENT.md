# Tool Development Documentation

This repository now includes comprehensive documentation for creating new tools for agents in the AgentPress system.

## 📚 Documentation Overview

### Core Documentation

1. **[TOOL_DEVELOPMENT.md](TOOL_DEVELOPMENT.md)** - Main development guide
   - Tool architecture overview
   - Step-by-step tool creation
   - Base class explanations (`Tool` vs `SandboxToolsBase`)
   - Schema definition with `@openapi_schema`
   - Usage examples with `@usage_example`
   - Common patterns and testing

2. **[TOOL_REGISTRATION.md](TOOL_REGISTRATION.md)** - Registration and configuration
   - How to register tools with agents
   - Tool groups configuration
   - Granular method control
   - Agent configuration patterns
   - Debugging and troubleshooting

3. **[TOOL_BEST_PRACTICES.md](TOOL_BEST_PRACTICES.md)** - Advanced patterns and optimization
   - Design principles
   - Performance optimization
   - Security best practices
   - Error handling patterns
   - Testing strategies
   - Advanced patterns (composition, streaming, middleware)

### Examples

1. **[examples/simple_tool_example.py](examples/simple_tool_example.py)** - Calculator Tool
   - Complete implementation of a basic tool
   - Inherits from `Tool` base class
   - Multiple mathematical operations
   - Comprehensive error handling
   - Full test examples

2. **[examples/sandbox_tool_example.py](examples/sandbox_tool_example.py)** - Text Processing Tool
   - Complete implementation of a sandbox tool
   - Inherits from `SandboxToolsBase`
   - File operations within sandbox
   - Path validation and security
   - Advanced text processing features

## 🚀 Quick Start

### 1. Create a Simple Tool

```python
from core.agentpress.tool import Tool, ToolResult, openapi_schema, usage_example

class MyTool(Tool):
    def __init__(self):
        super().__init__()

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "my_method",
            "description": "Description of what this method does",
            "parameters": {
                "type": "object",
                "properties": {
                    "input": {"type": "string", "description": "Input parameter"}
                },
                "required": ["input"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="my_method">
        <parameter name="input">example value</parameter>
        </invoke>
        </function_calls>
        ''')
    async def my_method(self, input: str) -> ToolResult:
        try:
            # Your implementation here
            result = f"Processed: {input}"
            return self.success_response({"result": result})
        except Exception as e:
            return self.fail_response(f"Error: {str(e)}")
```

### 2. Register Your Tool

```python
from core.agentpress.thread_manager import ThreadManager

# Create thread manager
thread_manager = ThreadManager()

# Register tool
thread_manager.add_tool(MyTool)

# Register with parameters (for sandbox tools)
thread_manager.add_tool(
    MySandboxTool,
    project_id=project_id,
    thread_manager=thread_manager
)
```

### 3. Add to Tool Groups (Optional)

```python
# In backend/core/utils/tool_groups.py
TOOL_GROUPS["my_tool"] = ToolGroup(
    name="my_tool",
    display_name="My Tool",
    description="What my tool does",
    tool_class="MyTool",
    methods=[
        ToolMethod(
            name="my_method",
            display_name="My Method",
            description="What this method does",
            enabled=True
        )
    ],
    enabled=True
)
```

## 🏗️ Tool Architecture

```
Tool Hierarchy:
├── Tool (base class)
│   ├── MessageTool
│   ├── CalculatorTool (example)
│   └── ... (other simple tools)
└── SandboxToolsBase (extends Tool)
    ├── SandboxFilesTool
    ├── TextProcessingTool (example)
    └── ... (sandbox-enabled tools)
```

## 🔧 Key Components

### Base Classes

- **`Tool`** - For tools that don't need sandbox access
- **`SandboxToolsBase`** - For tools that interact with project files/environment

### Decorators

- **`@openapi_schema`** - Defines LLM function calling schema
- **`@usage_example`** - Provides examples for better LLM understanding

### Response Objects

- **`ToolResult`** - Standardized response container
- **`success_response(data)`** - Create successful result
- **`fail_response(message)`** - Create failed result

## 📖 Documentation Sections

### [TOOL_DEVELOPMENT.md](TOOL_DEVELOPMENT.md)
- **Getting Started**: Tool creation basics
- **Tool Components**: Schemas, examples, methods
- **Advanced Features**: API integration, file operations
- **Testing**: Unit and integration testing
- **Common Patterns**: Validation, batch operations, error handling

### [TOOL_REGISTRATION.md](TOOL_REGISTRATION.md)
- **Basic Registration**: Simple tool registration
- **Tool Groups**: UI organization and configuration
- **Method Control**: Enable/disable specific methods
- **Agent Config**: Dynamic tool configuration
- **Debugging**: Troubleshooting registration issues

### [TOOL_BEST_PRACTICES.md](TOOL_BEST_PRACTICES.md)
- **Design Principles**: Single responsibility, naming conventions
- **Performance**: Async patterns, caching, resource management
- **Security**: Input validation, credential management, sandbox security
- **Error Handling**: Comprehensive error patterns
- **Testing**: Unit, integration, and performance testing
- **Advanced Patterns**: Composition, streaming, middleware

## 🛠️ Development Workflow

1. **Plan Your Tool**
   - Define clear purpose and scope
   - Choose appropriate base class
   - Design method signatures

2. **Implement Tool**
   - Follow examples in `examples/` directory
   - Use proper error handling patterns
   - Add comprehensive documentation

3. **Add Schemas and Examples**
   - Define OpenAPI schemas for each method
   - Provide usage examples
   - Test with actual LLM interactions

4. **Register and Test**
   - Register tool with agent
   - Test all methods thoroughly
   - Validate error handling

5. **Configure for Production**
   - Add to tool groups if needed
   - Configure method-level controls
   - Set up monitoring and logging

## 🔍 Examples Walkthrough

### Simple Tool Example (Calculator)
The calculator tool demonstrates:
- Basic `Tool` inheritance
- Multiple methods with different parameter types
- Input validation and error handling
- Proper schema definitions
- Comprehensive usage examples

### Sandbox Tool Example (Text Processing)
The text processing tool demonstrates:
- `SandboxToolsBase` inheritance
- File operations within sandbox
- Path validation and security
- Shell command execution
- Complex parameter validation

## 🚨 Security Considerations

- **Input Validation**: Always validate and sanitize inputs
- **Path Security**: Use `clean_path()` for file operations
- **Command Injection**: Validate shell commands carefully
- **API Keys**: Use secure configuration management
- **Error Disclosure**: Don't expose sensitive information in errors

## 📊 Performance Tips

- **Async Operations**: Use proper async/await patterns
- **Resource Management**: Clean up resources properly
- **Caching**: Cache expensive operations
- **Batch Processing**: Handle large datasets efficiently
- **Timeouts**: Set appropriate timeouts for operations

## 🐛 Debugging Tools

```python
# Debug tool registration
def debug_tools(thread_manager):
    registry = thread_manager.tool_registry
    print("Registered tools:", list(registry.tools.keys()))

    schemas = registry.get_openapi_schemas()
    print("Available methods:", [s['function']['name'] for s in schemas])

# Validate tool configuration
def validate_tool(tool_class, **kwargs):
    try:
        tool = tool_class(**kwargs)
        print(f"✅ {tool_class.__name__} valid")
        return True
    except Exception as e:
        print(f"❌ {tool_class.__name__} invalid: {e}")
        return False
```

## 📚 Further Reading

- Review existing tools in `backend/core/tools/` for real-world examples
- Check `backend/core/run.py` for tool registration patterns
- See `backend/core/utils/tool_groups.py` for tool organization
- Read AgentPress documentation for architecture details

## 🤝 Contributing

When contributing new tools:

1. Follow the patterns established in this documentation
2. Include comprehensive tests
3. Add to appropriate tool groups
4. Update documentation as needed
5. Ensure security best practices are followed

## 🎯 Common Use Cases

### API Integration Tools
```python
class APITool(Tool):
    # External service integration
    # Rate limiting and error handling
    # Response transformation
```

### File Processing Tools
```python
class FileProcessorTool(SandboxToolsBase):
    # File manipulation in sandbox
    # Batch processing capabilities
    # Format conversion
```

### Data Analysis Tools
```python
class AnalysisTool(SandboxToolsBase):
    # Statistical analysis
    # Data visualization
    # Report generation
```

### Development Tools
```python
class DevTool(SandboxToolsBase):
    # Code analysis
    # Build automation
    # Testing utilities
```

This documentation provides everything needed to understand, create, and deploy new tools in the AgentPress system. Start with the main guide and refer to specific sections as needed for your use case.