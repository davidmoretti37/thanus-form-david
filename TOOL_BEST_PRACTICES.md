# Tool Development Best Practices

This guide covers advanced patterns, optimization techniques, security considerations, and best practices for developing robust tools in the AgentPress system.

## Table of Contents

1. [Design Principles](#design-principles)
2. [Performance Optimization](#performance-optimization)
3. [Security Best Practices](#security-best-practices)
4. [Error Handling Patterns](#error-handling-patterns)
5. [Testing Strategies](#testing-strategies)
6. [Documentation Guidelines](#documentation-guidelines)
7. [Code Organization](#code-organization)
8. [Advanced Patterns](#advanced-patterns)

## Design Principles

### 1. Single Responsibility Principle

Each tool should have a clear, focused purpose:

```python
# ✅ Good: Focused calculator tool
class CalculatorTool(Tool):
    """Mathematical operations tool."""

    async def add(self, a: float, b: float) -> ToolResult:
        # Implementation

# ❌ Bad: Mixed responsibilities
class UtilityTool(Tool):
    """Does math, file operations, and network requests."""

    async def add(self, a: float, b: float) -> ToolResult:
        # Math operation

    async def read_file(self, path: str) -> ToolResult:
        # File operation - should be separate tool

    async def fetch_url(self, url: str) -> ToolResult:
        # Network operation - should be separate tool
```

### 2. Clear Method Naming

Use descriptive, action-oriented names:

```python
# ✅ Good: Clear, descriptive names
async def search_files_by_pattern(self, pattern: str) -> ToolResult:
async def convert_image_format(self, source: str, target_format: str) -> ToolResult:
async def calculate_statistics(self, data: List[float]) -> ToolResult:

# ❌ Bad: Vague or unclear names
async def process(self, data: Any) -> ToolResult:
async def do_thing(self, input: str) -> ToolResult:
async def handle(self, request: dict) -> ToolResult:
```

### 3. Consistent Parameter Design

Use consistent patterns across methods:

```python
class TextProcessingTool(SandboxToolsBase):
    # ✅ Good: Consistent parameter patterns
    async def search_text(
        self,
        pattern: str,              # Main parameter first
        file_path: str,            # Target second
        case_sensitive: bool = False,  # Options with defaults
        max_results: int = 100
    ) -> ToolResult:
        pass

    async def replace_text(
        self,
        old_text: str,             # Main parameter first
        new_text: str,             # Secondary parameter
        file_path: str,            # Target
        case_sensitive: bool = False,  # Same option pattern
        replace_all: bool = True
    ) -> ToolResult:
        pass
```

## Performance Optimization

### 1. Async/Await Best Practices

Use async/await properly for I/O operations:

```python
# ✅ Good: Proper async usage
async def fetch_multiple_urls(self, urls: List[str]) -> ToolResult:
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        results = []
        for url, response in zip(urls, responses):
            if isinstance(response, Exception):
                results.append({"url": url, "error": str(response)})
            else:
                results.append({"url": url, "status": response.status_code})

        return self.success_response({"results": results})

# ❌ Bad: Blocking operations in async function
async def fetch_multiple_urls_bad(self, urls: List[str]) -> ToolResult:
    results = []
    for url in urls:
        response = requests.get(url)  # Blocking!
        results.append({"url": url, "status": response.status_code})
    return self.success_response({"results": results})
```

### 2. Efficient Resource Management

Use context managers and proper cleanup:

```python
# ✅ Good: Resource management
async def process_large_file(self, file_path: str) -> ToolResult:
    try:
        await self._ensure_sandbox()
        clean_path = self.clean_path(file_path)

        # Use streaming for large files
        result = await self.sandbox.exec(f"wc -l {clean_path}")
        if result.exit_code == 0:
            line_count = int(result.stdout.strip().split()[0])

            if line_count > 100000:  # Large file
                # Process in chunks
                return await self._process_file_in_chunks(clean_path)
            else:
                # Process normally
                return await self._process_file_direct(clean_path)

    except Exception as e:
        return self.fail_response(f"Processing failed: {str(e)}")

async def _process_file_in_chunks(self, file_path: str) -> ToolResult:
    """Process large files in chunks to avoid memory issues."""
    chunk_size = 10000
    processed_lines = 0

    result = await self.sandbox.exec(
        f"split -l {chunk_size} {file_path} /tmp/chunk_"
    )

    if result.exit_code != 0:
        return self.fail_response("Failed to split file")

    # Process each chunk
    chunk_files = await self.sandbox.exec("ls /tmp/chunk_*")
    # ... process chunks

    # Cleanup
    await self.sandbox.exec("rm -f /tmp/chunk_*")

    return self.success_response({"processed_lines": processed_lines})
```

### 3. Caching Strategies

Implement caching for expensive operations:

```python
from functools import lru_cache
from typing import Dict, Any
import time

class APITool(Tool):
    def __init__(self):
        super().__init__()
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 300  # 5 minutes

    def _get_cache_key(self, operation: str, **kwargs) -> str:
        """Generate cache key from operation and parameters."""
        key_parts = [operation] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
        return "|".join(key_parts)

    def _is_cache_valid(self, timestamp: float) -> bool:
        """Check if cache entry is still valid."""
        return time.time() - timestamp < self._cache_ttl

    async def expensive_api_call(self, query: str) -> ToolResult:
        """Example of cached API call."""
        cache_key = self._get_cache_key("api_call", query=query)

        # Check cache
        if cache_key in self._cache:
            cache_entry = self._cache[cache_key]
            if self._is_cache_valid(cache_entry["timestamp"]):
                return self.success_response({
                    "data": cache_entry["data"],
                    "cached": True
                })

        try:
            # Make API call
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://api.example.com/search?q={query}")
                response.raise_for_status()
                data = response.json()

            # Cache result
            self._cache[cache_key] = {
                "data": data,
                "timestamp": time.time()
            }

            return self.success_response({
                "data": data,
                "cached": False
            })

        except Exception as e:
            return self.fail_response(f"API call failed: {str(e)}")
```

## Security Best Practices

### 1. Input Validation and Sanitization

Always validate and sanitize inputs:

```python
import re
from pathlib import Path

class SecureTool(SandboxToolsBase):

    def _validate_file_path(self, path: str) -> bool:
        """Validate file path for security."""
        # Check for path traversal attempts
        if ".." in path or path.startswith("/"):
            return False

        # Check for dangerous characters
        if re.search(r'[;&|`$]', path):
            return False

        # Ensure path is within workspace bounds
        try:
            clean_path = self.clean_path(path)
            resolved = Path(clean_path).resolve()
            workspace = Path(self.workspace_path).resolve()
            return resolved.is_relative_to(workspace)
        except (ValueError, OSError):
            return False

    def _sanitize_command_input(self, input_text: str) -> str:
        """Sanitize input for shell commands."""
        # Remove dangerous characters
        sanitized = re.sub(r'[;&|`$(){}[\]<>]', '', input_text)
        # Limit length
        return sanitized[:1000]

    async def secure_file_operation(self, file_path: str, content: str) -> ToolResult:
        """Example of secure file operation."""
        try:
            # Validate inputs
            if not self._validate_file_path(file_path):
                return self.fail_response("Invalid file path")

            if len(content) > 1_000_000:  # 1MB limit
                return self.fail_response("Content too large")

            await self._ensure_sandbox()
            clean_path = self.clean_path(file_path)

            # Use safe file operations
            result = await self.sandbox.exec(f"cat > {clean_path}", input=content)

            if result.exit_code == 0:
                return self.success_response({"file_path": clean_path})
            else:
                return self.fail_response(f"Write failed: {result.stderr}")

        except Exception as e:
            return self.fail_response(f"Operation failed: {str(e)}")
```

### 2. API Key and Credential Management

Handle credentials securely:

```python
from core.utils.config import config

class APITool(Tool):
    def __init__(self):
        super().__init__()
        # Get API key from secure configuration
        self.api_key = config.get('YOUR_API_KEY')
        if not self.api_key:
            raise ValueError("API key not configured")

    async def api_call(self, query: str) -> ToolResult:
        """Secure API call with proper credential handling."""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "AgentPress/1.0"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.example.com/search",
                    params={"q": query},
                    headers=headers
                )
                response.raise_for_status()

                # Don't log response data that might contain sensitive info
                return self.success_response({
                    "status": "success",
                    "data": response.json()
                })

        except httpx.HTTPStatusError as e:
            # Don't expose detailed API errors to LLM
            if e.response.status_code == 401:
                return self.fail_response("Authentication failed")
            elif e.response.status_code == 429:
                return self.fail_response("Rate limit exceeded")
            else:
                return self.fail_response("API request failed")

        except Exception as e:
            return self.fail_response("Network error occurred")
```

### 3. Sandbox Security

For sandbox tools, ensure proper isolation:

```python
class SecureSandboxTool(SandboxToolsBase):

    ALLOWED_COMMANDS = {
        'ls', 'cat', 'head', 'tail', 'wc', 'grep', 'find', 'sort', 'uniq'
    }

    FORBIDDEN_PATTERNS = [
        r'rm\s+-rf',
        r'sudo',
        r'curl.*\|\s*sh',
        r'wget.*\|\s*sh',
        r'eval',
        r'exec',
        r'/dev/',
        r'/proc/',
        r'/sys/'
    ]

    def _validate_command(self, command: str) -> bool:
        """Validate command for security."""
        # Check against forbidden patterns
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                return False

        # Extract base command
        base_cmd = command.strip().split()[0]
        return base_cmd in self.ALLOWED_COMMANDS

    async def safe_shell_exec(self, command: str) -> ToolResult:
        """Execute shell command with security validation."""
        try:
            if not self._validate_command(command):
                return self.fail_response("Command not allowed for security reasons")

            await self._ensure_sandbox()
            result = await self.sandbox.exec(command)

            return self.success_response({
                "command": command,
                "exit_code": result.exit_code,
                "stdout": result.stdout,
                "stderr": result.stderr
            })

        except Exception as e:
            return self.fail_response(f"Command execution failed: {str(e)}")
```

## Error Handling Patterns

### 1. Comprehensive Error Handling

Handle different types of errors appropriately:

```python
class RobustTool(Tool):

    async def comprehensive_operation(self, data: Dict[str, Any]) -> ToolResult:
        """Example of comprehensive error handling."""
        try:
            # Input validation
            if not isinstance(data, dict):
                return self.fail_response("Input must be a dictionary")

            required_fields = ['operation', 'parameters']
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                return self.fail_response(f"Missing required fields: {missing_fields}")

            operation = data['operation']
            parameters = data['parameters']

            # Operation-specific handling
            if operation == 'calculate':
                return await self._handle_calculation(parameters)
            elif operation == 'transform':
                return await self._handle_transformation(parameters)
            else:
                return self.fail_response(f"Unknown operation: {operation}")

        except KeyError as e:
            return self.fail_response(f"Missing required parameter: {e}")
        except ValueError as e:
            return self.fail_response(f"Invalid parameter value: {e}")
        except TypeError as e:
            return self.fail_response(f"Invalid parameter type: {e}")
        except asyncio.TimeoutError:
            return self.fail_response("Operation timed out")
        except httpx.RequestError as e:
            return self.fail_response(f"Network error: {type(e).__name__}")
        except Exception as e:
            # Log unexpected errors for debugging
            logger.error(f"Unexpected error in {self.__class__.__name__}: {e}", exc_info=True)
            return self.fail_response("An unexpected error occurred")

    async def _handle_calculation(self, params: Dict[str, Any]) -> ToolResult:
        """Handle calculation operations with specific error handling."""
        try:
            if 'numbers' not in params:
                return self.fail_response("Calculation requires 'numbers' parameter")

            numbers = params['numbers']
            if not isinstance(numbers, list):
                return self.fail_response("Numbers must be a list")

            if not all(isinstance(n, (int, float)) for n in numbers):
                return self.fail_response("All numbers must be numeric")

            if len(numbers) == 0:
                return self.fail_response("At least one number is required")

            # Perform calculation
            result = sum(numbers) / len(numbers)

            return self.success_response({
                "operation": "average",
                "input_count": len(numbers),
                "result": result
            })

        except ZeroDivisionError:
            return self.fail_response("Division by zero")
        except OverflowError:
            return self.fail_response("Result too large to calculate")
```

### 2. Graceful Degradation

Handle partial failures gracefully:

```python
async def batch_process_files(self, file_paths: List[str]) -> ToolResult:
    """Process multiple files with graceful degradation."""
    results = []
    errors = []

    for file_path in file_paths:
        try:
            # Process individual file
            result = await self._process_single_file(file_path)
            results.append({
                "file": file_path,
                "status": "success",
                "data": result
            })
        except FileNotFoundError:
            errors.append({
                "file": file_path,
                "error": "File not found"
            })
        except PermissionError:
            errors.append({
                "file": file_path,
                "error": "Permission denied"
            })
        except Exception as e:
            errors.append({
                "file": file_path,
                "error": f"Processing failed: {str(e)}"
            })

    # Return partial success if any files were processed
    total_files = len(file_paths)
    successful_files = len(results)

    if successful_files > 0:
        return self.success_response({
            "summary": {
                "total_files": total_files,
                "successful": successful_files,
                "failed": len(errors),
                "success_rate": successful_files / total_files
            },
            "results": results,
            "errors": errors if errors else None
        })
    else:
        return self.fail_response(f"All {total_files} files failed to process")
```

## Testing Strategies

### 1. Unit Testing Tools

```python
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock

class TestCalculatorTool:

    @pytest.fixture
    def calculator_tool(self):
        """Fixture for calculator tool."""
        return CalculatorTool()

    @pytest.mark.asyncio
    async def test_add_success(self, calculator_tool):
        """Test successful addition."""
        result = await calculator_tool.add([5, 3, 2])

        assert result.success is True

        import json
        data = json.loads(result.output)
        assert data["result"] == 10
        assert data["operation"] == "addition"
        assert data["inputs"] == [5, 3, 2]

    @pytest.mark.asyncio
    async def test_add_validation_error(self, calculator_tool):
        """Test validation error handling."""
        result = await calculator_tool.add([])

        assert result.success is False
        assert "at least 2 numbers" in result.output.lower()

    @pytest.mark.asyncio
    async def test_add_type_error(self, calculator_tool):
        """Test type error handling."""
        result = await calculator_tool.add(["not", "numbers"])

        assert result.success is False
        assert "invalid input" in result.output.lower()

class TestSandboxTool:

    @pytest.fixture
    def mock_sandbox(self):
        """Mock sandbox for testing."""
        sandbox = Mock()
        sandbox.exec = AsyncMock()
        return sandbox

    @pytest.fixture
    def text_tool(self, mock_sandbox):
        """Fixture for text processing tool with mocked sandbox."""
        tool = TextProcessingTool("test-project", Mock())
        tool._sandbox = mock_sandbox
        tool._sandbox_id = "test-sandbox"
        return tool

    @pytest.mark.asyncio
    async def test_count_words_success(self, text_tool, mock_sandbox):
        """Test successful word counting."""
        # Mock sandbox responses
        mock_sandbox.exec.side_effect = [
            Mock(exit_code=0),  # file exists check
            Mock(exit_code=0, stdout="Hello world\nThis is a test\n"),  # file content
            Mock(exit_code=0, stdout="25 test.txt")  # file size
        ]

        result = await text_tool.count_words("test.txt")

        assert result.success is True

        import json
        data = json.loads(result.output)
        assert data["statistics"]["words"] == 6
        assert data["statistics"]["lines"] == 2

    @pytest.mark.asyncio
    async def test_count_words_file_not_found(self, text_tool, mock_sandbox):
        """Test file not found error."""
        mock_sandbox.exec.return_value = Mock(exit_code=1)

        result = await text_tool.count_words("nonexistent.txt")

        assert result.success is False
        assert "not found" in result.output.lower()
```

### 2. Integration Testing

```python
class TestToolIntegration:

    @pytest.mark.asyncio
    async def test_tool_registration(self):
        """Test tool registration and execution."""
        from core.agentpress.thread_manager import ThreadManager

        thread_manager = ThreadManager()
        thread_manager.add_tool(CalculatorTool)

        # Test tool is registered
        assert "add" in thread_manager.tool_registry.tools

        # Test schema is available
        schemas = thread_manager.tool_registry.get_openapi_schemas()
        schema_names = [s["function"]["name"] for s in schemas]
        assert "add" in schema_names

        # Test tool execution through registry
        available_functions = thread_manager.tool_registry.get_available_functions()
        add_function = available_functions["add"]

        result = await add_function([5, 3])
        assert result.success is True

    @pytest.mark.asyncio
    async def test_method_filtering(self):
        """Test selective method registration."""
        from core.agentpress.thread_manager import ThreadManager

        thread_manager = ThreadManager()
        thread_manager.add_tool(CalculatorTool, function_names=["add"])

        # Only specified method should be available
        assert "add" in thread_manager.tool_registry.tools
        assert "multiply" not in thread_manager.tool_registry.tools
```

### 3. Performance Testing

```python
import time
import pytest

class TestToolPerformance:

    @pytest.mark.asyncio
    async def test_response_time(self):
        """Test tool response time."""
        tool = CalculatorTool()

        start_time = time.time()
        result = await tool.add([1, 2, 3, 4, 5])
        end_time = time.time()

        response_time = end_time - start_time
        assert response_time < 1.0  # Should complete in under 1 second
        assert result.success is True

    @pytest.mark.asyncio
    async def test_large_input_handling(self):
        """Test tool with large inputs."""
        tool = CalculatorTool()

        # Test with 10,000 numbers
        large_numbers = list(range(10000))

        start_time = time.time()
        result = await tool.add(large_numbers)
        end_time = time.time()

        response_time = end_time - start_time
        assert response_time < 5.0  # Should complete in under 5 seconds
        assert result.success is True

    @pytest.mark.asyncio
    async def test_concurrent_execution(self):
        """Test concurrent tool execution."""
        tool = CalculatorTool()

        # Run 10 concurrent operations
        tasks = [
            tool.add([i, i+1, i+2])
            for i in range(10)
        ]

        start_time = time.time()
        results = await asyncio.gather(*tasks)
        end_time = time.time()

        total_time = end_time - start_time
        assert total_time < 2.0  # Should complete in under 2 seconds
        assert all(result.success for result in results)
```

## Documentation Guidelines

### 1. Tool Documentation Standards

```python
class ExampleTool(Tool):
    """A comprehensive example tool demonstrating documentation standards.

    This tool provides mathematical operations with detailed error handling
    and validation. It serves as a reference implementation for tool
    development patterns in the AgentPress system.

    Features:
    - Basic arithmetic operations (add, subtract, multiply, divide)
    - Input validation and type checking
    - Comprehensive error handling
    - Performance optimization for large datasets

    Usage:
        tool = ExampleTool()
        result = await tool.add([1, 2, 3, 4, 5])

    Note:
        All operations return ToolResult objects with success/failure status
        and detailed output information.
    """

    def __init__(self):
        """Initialize the example tool.

        Sets up internal state and validates any required configuration.
        """
        super().__init__()

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "add",
            "description": "Add multiple numbers together. Supports integers and floating-point numbers. Returns the sum along with calculation details and input validation information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "numbers": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "Array of numbers to add together. Must contain at least 2 numbers. Supports both integers and floating-point values.",
                        "minItems": 2,
                        "maxItems": 1000
                    }
                },
                "required": ["numbers"]
            }
        }
    })
    @usage_example('''
        <!-- Simple addition -->
        <function_calls>
        <invoke name="add">
        <parameter name="numbers">[5, 3]</parameter>
        </invoke>
        </function_calls>

        <!-- Addition with multiple numbers -->
        <function_calls>
        <invoke name="add">
        <parameter name="numbers">[10, 5, 2.5, 1.5, 7]</parameter>
        </invoke>
        </function_calls>

        <!-- Addition with decimals -->
        <function_calls>
        <invoke name="add">
        <parameter name="numbers">[3.14, 2.71, 1.41]</parameter>
        </invoke>
        </function_calls>
        ''')
    async def add(self, numbers: List[Union[int, float]]) -> ToolResult:
        """Add multiple numbers together.

        Performs addition on a list of numbers with comprehensive validation
        and error handling. Supports both integers and floating-point numbers.

        Args:
            numbers: List of numbers to add. Must contain at least 2 numbers
                    and no more than 1000 numbers.

        Returns:
            ToolResult: Success result containing:
                - operation: "addition"
                - inputs: Original input numbers
                - result: Sum of all input numbers
                - calculation: Human-readable calculation string

            Or failure result with specific error message.

        Raises:
            No exceptions are raised; all errors are returned as ToolResult
            with success=False.

        Examples:
            >>> result = await tool.add([5, 3, 2])
            >>> # Returns: {"operation": "addition", "result": 10, ...}

            >>> result = await tool.add([1.5, 2.5])
            >>> # Returns: {"operation": "addition", "result": 4.0, ...}
        """
        try:
            # Detailed implementation with validation
            # ... (implementation details)
            pass
        except Exception as e:
            return self.fail_response(f"Addition failed: {str(e)}")
```

### 2. Schema Documentation Best Practices

```python
# ✅ Good: Detailed, specific descriptions
@openapi_schema({
    "type": "function",
    "function": {
        "name": "search_files",
        "description": "Search for files in the workspace using glob patterns. Supports recursive directory traversal and multiple file type filters. Returns file paths, sizes, and modification times.",
        "parameters": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Glob pattern to match files (e.g., '*.py', '**/*.txt', 'src/**/*.{js,ts}'). Use ** for recursive directory search."
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of files to return (1-1000). Default is 100.",
                    "minimum": 1,
                    "maximum": 1000,
                    "default": 100
                }
            },
            "required": ["pattern"]
        }
    }
})

# ❌ Bad: Vague, minimal descriptions
@openapi_schema({
    "type": "function",
    "function": {
        "name": "search_files",
        "description": "Search files",
        "parameters": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Pattern"},
                "max_results": {"type": "integer", "description": "Max results"}
            },
            "required": ["pattern"]
        }
    }
})
```

## Code Organization

### 1. File Structure

Organize tool files logically:

```
backend/core/tools/
├── __init__.py
├── base/
│   ├── __init__.py
│   ├── math_tools.py          # Mathematical operations
│   ├── text_tools.py          # Text processing
│   └── network_tools.py       # Network operations
├── integrations/
│   ├── __init__.py
│   ├── github_tool.py         # GitHub integration
│   ├── slack_tool.py          # Slack integration
│   └── database_tool.py       # Database operations
├── sandbox/
│   ├── __init__.py
│   ├── file_operations.py     # File system tools
│   ├── shell_tools.py         # Shell command tools
│   └── development_tools.py   # Development-specific tools
└── utilities/
    ├── __init__.py
    ├── validation.py          # Input validation utilities
    ├── formatting.py          # Output formatting utilities
    └── caching.py             # Caching utilities
```

### 2. Import Organization

Structure imports clearly:

```python
"""
Text Processing Tool

A comprehensive tool for text manipulation and analysis within the sandbox environment.
"""

# Standard library imports
import re
import json
import asyncio
from typing import List, Dict, Any, Optional, Union

# Third-party imports
import httpx
from pydantic import BaseModel, Field

# AgentPress imports
from core.agentpress.tool import ToolResult, openapi_schema, usage_example
from core.sandbox.tool_base import SandboxToolsBase
from core.agentpress.thread_manager import ThreadManager
from core.utils.logger import logger

# Local imports
from .utilities.validation import validate_file_path
from .utilities.formatting import format_file_stats
```

### 3. Configuration Management

Use consistent configuration patterns:

```python
from core.utils.config import config
from typing import Optional

class ConfigurableTool(Tool):
    """Tool with proper configuration management."""

    def __init__(self, custom_config: Optional[Dict[str, Any]] = None):
        super().__init__()

        # Load default configuration
        self.timeout = config.get('TOOL_TIMEOUT', 30)
        self.max_retries = config.get('TOOL_MAX_RETRIES', 3)
        self.cache_ttl = config.get('TOOL_CACHE_TTL', 300)

        # Override with custom config if provided
        if custom_config:
            self.timeout = custom_config.get('timeout', self.timeout)
            self.max_retries = custom_config.get('max_retries', self.max_retries)
            self.cache_ttl = custom_config.get('cache_ttl', self.cache_ttl)

        # Validate configuration
        self._validate_config()

    def _validate_config(self):
        """Validate configuration values."""
        if self.timeout <= 0:
            raise ValueError("Timeout must be positive")
        if self.max_retries < 0:
            raise ValueError("Max retries cannot be negative")
        if self.cache_ttl < 0:
            raise ValueError("Cache TTL cannot be negative")
```

## Advanced Patterns

### 1. Tool Composition

Create composite tools that use other tools:

```python
class AdvancedAnalysisTool(SandboxToolsBase):
    """Advanced analysis tool that composes multiple operations."""

    def __init__(self, project_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)

        # Initialize component tools
        self.text_processor = TextProcessingTool(project_id, thread_manager)
        self.file_analyzer = FileAnalysisTool(project_id, thread_manager)

    async def comprehensive_analysis(self, directory: str) -> ToolResult:
        """Perform comprehensive analysis using multiple tools."""
        try:
            results = {}

            # 1. Analyze file structure
            structure_result = await self.file_analyzer.analyze_structure(directory)
            if not structure_result.success:
                return structure_result

            results['structure'] = json.loads(structure_result.output)

            # 2. Process text files
            text_files = [
                f for f in results['structure']['files']
                if f.endswith(('.txt', '.md', '.py', '.js'))
            ]

            text_analysis = []
            for file_path in text_files[:10]:  # Limit to 10 files
                word_count_result = await self.text_processor.count_words(file_path)
                if word_count_result.success:
                    text_analysis.append(json.loads(word_count_result.output))

            results['text_analysis'] = text_analysis

            # 3. Generate summary
            total_files = len(results['structure']['files'])
            total_text_files = len(text_analysis)
            total_words = sum(ta['statistics']['words'] for ta in text_analysis)

            results['summary'] = {
                'total_files': total_files,
                'text_files_analyzed': total_text_files,
                'total_words': total_words,
                'average_words_per_file': total_words / total_text_files if total_text_files > 0 else 0
            }

            return self.success_response(results)

        except Exception as e:
            return self.fail_response(f"Comprehensive analysis failed: {str(e)}")
```

### 2. Streaming Results

Handle large results with streaming:

```python
from typing import AsyncGenerator

class StreamingTool(SandboxToolsBase):
    """Tool that can stream large results."""

    async def process_large_dataset(self, file_path: str) -> ToolResult:
        """Process large dataset with streaming results."""
        try:
            await self._ensure_sandbox()
            clean_path = self.clean_path(file_path)

            # Check file size
            size_result = await self.sandbox.exec(f"wc -c {clean_path}")
            if size_result.exit_code != 0:
                return self.fail_response("Cannot determine file size")

            file_size = int(size_result.stdout.split()[0])

            if file_size > 10_000_000:  # 10MB
                # Use streaming for large files
                return await self._stream_process_file(clean_path)
            else:
                # Use regular processing for small files
                return await self._regular_process_file(clean_path)

        except Exception as e:
            return self.fail_response(f"Processing failed: {str(e)}")

    async def _stream_process_file(self, file_path: str) -> ToolResult:
        """Stream process large file in chunks."""
        chunk_size = 1000  # Lines per chunk
        processed_chunks = 0
        total_lines = 0

        # Process file in chunks
        result = await self.sandbox.exec(
            f"split -l {chunk_size} {file_path} /tmp/chunk_"
        )

        if result.exit_code != 0:
            return self.fail_response("Failed to split file for streaming")

        # Get chunk files
        chunk_result = await self.sandbox.exec("ls /tmp/chunk_*")
        chunk_files = chunk_result.stdout.strip().split('\n')

        chunk_results = []
        for chunk_file in chunk_files:
            chunk_result = await self._process_chunk(chunk_file)
            if chunk_result:
                chunk_results.append(chunk_result)
                processed_chunks += 1
                total_lines += chunk_result.get('lines', 0)

        # Cleanup
        await self.sandbox.exec("rm -f /tmp/chunk_*")

        return self.success_response({
            "processing_method": "streaming",
            "chunks_processed": processed_chunks,
            "total_lines": total_lines,
            "chunk_results": chunk_results[:10]  # Return first 10 chunk summaries
        })

    async def _process_chunk(self, chunk_file: str) -> Optional[Dict[str, Any]]:
        """Process individual chunk."""
        try:
            # Count lines in chunk
            line_result = await self.sandbox.exec(f"wc -l {chunk_file}")
            if line_result.exit_code == 0:
                lines = int(line_result.stdout.split()[0])
                return {"file": chunk_file, "lines": lines}
        except Exception:
            pass
        return None
```

### 3. Tool Middleware

Implement middleware patterns for cross-cutting concerns:

```python
from functools import wraps
from typing import Callable, Any
import time

def rate_limit(calls_per_minute: int = 60):
    """Rate limiting decorator for tool methods."""
    def decorator(func: Callable) -> Callable:
        func._call_times = []

        @wraps(func)
        async def wrapper(self, *args, **kwargs):
            now = time.time()

            # Clean old call times
            func._call_times = [t for t in func._call_times if now - t < 60]

            # Check rate limit
            if len(func._call_times) >= calls_per_minute:
                return self.fail_response(f"Rate limit exceeded: {calls_per_minute} calls per minute")

            # Record this call
            func._call_times.append(now)

            # Execute function
            return await func(self, *args, **kwargs)

        return wrapper
    return decorator

def log_execution(func: Callable) -> Callable:
    """Logging decorator for tool methods."""
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        start_time = time.time()
        method_name = f"{self.__class__.__name__}.{func.__name__}"

        logger.info(f"Starting {method_name}")

        try:
            result = await func(self, *args, **kwargs)
            end_time = time.time()
            duration = end_time - start_time

            logger.info(f"Completed {method_name} in {duration:.2f}s - Success: {result.success}")
            return result

        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time

            logger.error(f"Failed {method_name} in {duration:.2f}s - Error: {str(e)}")
            raise

    return wrapper

# Usage in tool
class MiddlewareTool(Tool):

    @rate_limit(calls_per_minute=30)
    @log_execution
    async def expensive_operation(self, data: str) -> ToolResult:
        """Expensive operation with rate limiting and logging."""
        # Implementation
        pass
```

This comprehensive guide covers the essential best practices for developing robust, secure, and performant tools in the AgentPress system. Follow these patterns to create tools that are maintainable, scalable, and provide excellent user experience.