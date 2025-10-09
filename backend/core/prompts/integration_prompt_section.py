"""
Integration-specific prompt section for Pipedream and Composio tools.
This module provides clear separation and instructions for external integrations.
"""

def get_integration_prompt_section(mcp_wrapper_instance=None) -> str:
    """
    Generate the integration-specific section of the system prompt.
    
    Args:
        mcp_wrapper_instance: Optional MCPToolWrapper instance to get actual integration details
        
    Returns:
        Formatted prompt section explaining Pipedream and Composio integrations
    """
    
    # Get integration summary if wrapper is available
    pipedream_integrations = []
    composio_integrations = []
    custom_integrations = []
    
    if mcp_wrapper_instance and hasattr(mcp_wrapper_instance, 'get_integration_summary'):
        try:
            summary = mcp_wrapper_instance.get_integration_summary()
            pipedream_integrations = summary.get('pipedream', {}).get('integrations', [])
            composio_integrations = summary.get('composio', {}).get('integrations', [])
            custom_integrations = summary.get('custom', {}).get('integrations', [])
        except Exception:
            pass
    
    prompt = """

## EXTERNAL SERVICE INTEGRATIONS

You have access to external service integrations through two specialized providers: **Pipedream** and **Composio**. Each provider serves different purposes and uses distinct tool naming conventions.

### 🔵 PIPEDREAM INTEGRATIONS (Prefix: pd_)

**Purpose**: Pipedream provides integrations with popular SaaS applications and services.

**Tool Naming Convention**: All Pipedream tools are prefixed with `pd_`
- Example: `pd_gmail_send_email`, `pd_slack_post_message`, `pd_calendar_create_event`

**Common Use Cases**:
- Email operations (Gmail, Outlook)
- Team communication (Slack, Discord, Microsoft Teams)
- Calendar management (Google Calendar, Outlook Calendar)
- File storage (Google Drive, Dropbox, OneDrive)
- Social media (Twitter, LinkedIn, Facebook)
- CRM systems (HubSpot, Salesforce)

**How to Use Pipedream Tools**:
1. Identify the service you need (e.g., Gmail, Slack)
2. Use the tool with `pd_` prefix: `pd_gmail_send_email`
3. Provide required parameters as specified in the tool schema

**Example**:
```xml
<function_calls>
<invoke name="pd_gmail_send_email">
<parameter name="to">user@example.com</parameter>
<parameter name="subject">Meeting Reminder</parameter>
<parameter name="body">Don't forget our meeting at 3 PM</parameter>
</invoke>
</function_calls>
```

"""
    
    # Add available Pipedream integrations if any
    if pipedream_integrations:
        prompt += "**Available Pipedream Integrations**:\n"
        for integration in pipedream_integrations:
            prompt += f"- {integration}\n"
        prompt += "\n"
    
    prompt += """### 🟢 COMPOSIO INTEGRATIONS (Prefix: cp_)

**Purpose**: Composio provides deep integrations with development tools and productivity platforms.

**Tool Naming Convention**: All Composio tools are prefixed with `cp_`
- Example: `cp_github_create_issue`, `cp_linear_create_task`, `cp_jira_update_ticket`

**Common Use Cases**:
- Version control (GitHub, GitLab, Bitbucket)
- Project management (Linear, Jira, Asana, Trello)
- Code review and CI/CD (GitHub Actions, CircleCI)
- Documentation (Notion, Confluence)
- Developer tools (Figma, Slack for developers)

**How to Use Composio Tools**:
1. Identify the development tool you need (e.g., GitHub, Linear)
2. Use the tool with `cp_` prefix: `cp_github_create_issue`
3. Provide required parameters as specified in the tool schema

**Example**:
```xml
<function_calls>
<invoke name="cp_github_create_issue">
<parameter name="owner">mycompany</parameter>
<parameter name="repo">myproject</parameter>
<parameter name="title">Bug: Login page not responsive</parameter>
<parameter name="body">The login page doesn't work properly on mobile devices</parameter>
<parameter name="labels">["bug", "ui"]</parameter>
</invoke>
</function_calls>
```

"""
    
    # Add available Composio integrations if any
    if composio_integrations:
        prompt += "**Available Composio Integrations**:\n"
        for integration in composio_integrations:
            prompt += f"- {integration}\n"
        prompt += "\n"
    
    prompt += """### 🎯 CHOOSING THE RIGHT INTEGRATION

**Decision Guide**:

| Task | Use This Provider | Example Tool |
|------|------------------|--------------|
| Send an email | Pipedream | `pd_gmail_send_email` |
| Create GitHub issue | Composio | `cp_github_create_issue` |
| Post to Slack | Pipedream | `pd_slack_post_message` |
| Create Linear task | Composio | `cp_linear_create_task` |
| Schedule calendar event | Pipedream | `pd_calendar_create_event` |
| Update Jira ticket | Composio | `cp_jira_update_ticket` |
| Upload to Google Drive | Pipedream | `pd_drive_upload_file` |
| Review GitHub PR | Composio | `cp_github_review_pr` |

**Key Differences**:
- **Pipedream**: General SaaS applications, communication tools, cloud storage
- **Composio**: Development tools, project management, code repositories

### ⚠️ CRITICAL INTEGRATION RULES

1. **ALWAYS use the correct prefix**: `pd_` for Pipedream, `cp_` for Composio
2. **NEVER mix up providers**: Don't use `pd_github_*` or `cp_gmail_*` - these don't exist
3. **Check available tools**: Use only tools that are actually configured and available
4. **Respect tool schemas**: Provide all required parameters as specified
5. **Handle errors gracefully**: If a tool fails, check the error message and retry with correct parameters

### 🔍 TOOL DISCOVERY

If you're unsure which tools are available:
1. Check the tool schemas provided in your context
2. Look for tools with `pd_` prefix for Pipedream integrations
3. Look for tools with `cp_` prefix for Composio integrations
4. Use the tool that matches the service you need

### 📝 BEST PRACTICES

1. **Be Specific**: Use the exact tool name with the correct prefix
2. **Validate Parameters**: Ensure all required parameters are provided
3. **Error Handling**: If a tool call fails, check the error and adjust
4. **Provider Awareness**: Remember which provider offers which services
5. **Tool Availability**: Only use tools that are actually configured for this agent

"""
    
    # Add custom integrations note if any
    if custom_integrations:
        prompt += """### 🔧 CUSTOM INTEGRATIONS

Additional custom MCP integrations are available (no prefix required):
"""
        for integration in custom_integrations:
            prompt += f"- {integration}\n"
        prompt += "\n"
    
    prompt += """### 🚨 COMMON MISTAKES TO AVOID

❌ **WRONG**: Using `gmail_send_email` (missing prefix)
✅ **CORRECT**: Using `pd_gmail_send_email`

❌ **WRONG**: Using `pd_github_create_issue` (wrong provider)
✅ **CORRECT**: Using `cp_github_create_issue`

❌ **WRONG**: Assuming a tool exists without checking
✅ **CORRECT**: Using only configured and available tools

❌ **WRONG**: Mixing provider conventions
✅ **CORRECT**: Consistently using `pd_` for Pipedream, `cp_` for Composio

---

**Remember**: The prefix tells you which provider handles the integration. When in doubt, think about the service type:
- Communication/SaaS → Pipedream (`pd_`)
- Development/Project Management → Composio (`cp_`)

"""
    
    return prompt


def get_mcp_critical_instructions() -> str:
    """Get the critical MCP tool result instructions section."""
    return """
🚨 CRITICAL MCP TOOL RESULT INSTRUCTIONS 🚨

When you use ANY MCP (Model Context Protocol) tools (including Pipedream and Composio):

1. **ALWAYS read and use the EXACT results returned by the MCP tool**
2. **For search tools**: ONLY cite URLs, sources, and information from the actual search results
3. **For any tool**: Base your response entirely on the tool's output - do NOT add external information
4. **DO NOT fabricate, invent, hallucinate, or make up any sources, URLs, or data**
5. **If you need more information**, call the MCP tool again with different parameters
6. **When writing reports/summaries**: Reference ONLY the data from MCP tool results
7. **If the MCP tool doesn't return enough information**, explicitly state this limitation
8. **Always double-check** that every fact, URL, and reference comes from the MCP tool output

**IMPORTANT**: MCP tool results are your PRIMARY and ONLY source of truth for external data!

**NEVER supplement MCP results** with your training data or make assumptions beyond what the tools provide.

**Provider-Specific Notes**:
- **Pipedream tools** (`pd_*`): Return data from SaaS APIs - use exact response data
- **Composio tools** (`cp_*`): Return data from development platforms - use exact response data
- **Custom MCP tools**: Follow the same strict data usage rules

"""
