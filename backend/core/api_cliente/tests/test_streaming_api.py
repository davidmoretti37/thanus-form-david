#!/usr/bin/env python3
"""
Test script for the new streaming API endpoint
"""

import asyncio
import aiohttp
import json
import sys
import time

async def test_streaming_api():
    """Test the streaming API endpoint"""
    
    # Configuration
    base_url = "http://localhost:8000"
    api_key = "thanus_TMoLoJfa-vByLcNe-TX93oTBSjy1d6EdJUOPjkPN358"  # Use your actual API key
    
    print("=== Thanus AI Streaming API Test ===")
    print(f"Base URL: {base_url}")
    print(f"API Key: {api_key[:15]}...")
    print()
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Execute an agent to get an agent_run_id
            print("🚀 Step 1: Executing agent...")
            execute_data = {
                "prompt": "Write a simple Python function that prints 'Hello, World!'",
                "model_name": "anthropic/claude-3-5-sonnet-latest",
                "enable_thinking": False,
                "stream": True
            }
            
            async with session.post(
                f"{base_url}/api/user-api/agents/execute",
                headers=headers,
                json=execute_data
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to execute agent: {response.status} - {error_text}")
                    return
                
                result = await response.json()
                agent_run_id = result["agent_run_id"]
                thread_id = result["thread_id"]
                project_id = result["project_id"]
                
                print(f"✅ Agent execution started!")
                print(f"   Agent Run ID: {agent_run_id}")
                print(f"   Thread ID: {thread_id}")
                print(f"   Project ID: {project_id}")
                print(f"   View URL: {result['view_url']}")
                print()
            
            # Step 2: Wait a moment for the agent to start
            print("⏳ Waiting 2 seconds for agent to start...")
            await asyncio.sleep(2)
            
            # Step 3: Test the streaming endpoint
            print("📡 Step 2: Testing streaming endpoint...")
            stream_url = f"{base_url}/api/user-api/agents/runs/{agent_run_id}/stream"
            
            async with session.get(stream_url, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to start stream: {response.status} - {error_text}")
                    return
                
                print(f"✅ Stream started successfully!")
                print(f"   Content-Type: {response.headers.get('Content-Type')}")
                print(f"   Connection: {response.headers.get('Connection')}")
                print()
                
                print("📨 Streaming messages:")
                print("-" * 50)
                
                message_count = 0
                start_time = time.time()
                
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    
                    if line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])  # Remove 'data: ' prefix
                            message_count += 1
                            
                            # Print message info
                            msg_type = data.get('type', 'unknown')
                            timestamp = data.get('timestamp', 'no-timestamp')
                            
                            print(f"[{message_count:3d}] {msg_type.upper()}: ", end="")
                            
                            if msg_type == 'status':
                                status = data.get('status', 'unknown')
                                print(f"Status = {status}")
                                
                                # If completed, stop streaming
                                if status in ['completed', 'failed', 'stopped']:
                                    print(f"🏁 Agent execution {status}!")
                                    break
                                    
                            elif msg_type == 'message':
                                content = data.get('content', '')
                                role = data.get('role', 'unknown')
                                print(f"Role = {role}, Content = {content[:100]}{'...' if len(content) > 100 else ''}")
                                
                            elif msg_type == 'tool_use':
                                tool_name = data.get('tool_name', 'unknown')
                                print(f"Tool = {tool_name}")
                                
                            elif msg_type == 'tool_result':
                                tool_name = data.get('tool_name', 'unknown')
                                success = data.get('success', False)
                                print(f"Tool = {tool_name}, Success = {success}")
                                
                            else:
                                print(f"Data = {str(data)[:100]}{'...' if len(str(data)) > 100 else ''}")
                                
                        except json.JSONDecodeError as e:
                            print(f"❌ Failed to parse JSON: {e}")
                            print(f"   Raw line: {line}")
                    
                    elif line:
                        print(f"Non-data line: {line}")
                
                elapsed_time = time.time() - start_time
                print("-" * 50)
                print(f"✅ Streaming completed!")
                print(f"   Total messages: {message_count}")
                print(f"   Duration: {elapsed_time:.2f} seconds")
                print()
            
            # Step 4: Check final status
            print("📊 Step 3: Checking final agent run status...")
            status_url = f"{base_url}/api/user-api/agents/runs/{agent_run_id}/status"
            
            async with session.get(status_url, headers=headers) as response:
                if response.status == 200:
                    status_data = await response.json()
                    print(f"✅ Final status retrieved:")
                    print(f"   Status: {status_data['status']}")
                    print(f"   Started: {status_data['started_at']}")
                    print(f"   Completed: {status_data.get('completed_at', 'N/A')}")
                    if status_data.get('error'):
                        print(f"   Error: {status_data['error']}")
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to get status: {response.status} - {error_text}")
            
            # Step 5: Test the complete messages endpoint
            print()
            print("📋 Step 4: Testing complete messages endpoint...")
            messages_url = f"{base_url}/api/user-api/agents/runs/{agent_run_id}/messages"
            
            async with session.get(messages_url, headers=headers) as response:
                if response.status == 200:
                    messages_data = await response.json()
                    print(f"✅ Complete messages retrieved:")
                    print(f"   Total messages: {messages_data['summary']['total_messages']}")
                    print(f"   Total responses: {messages_data['summary']['total_responses']}")
                    print(f"   User messages: {messages_data['summary']['user_messages']}")
                    print(f"   Assistant messages: {messages_data['summary']['assistant_messages']}")
                    print(f"   Tool uses: {messages_data['summary']['tool_uses']}")
                    print(f"   Tool results: {messages_data['summary']['tool_results']}")
                    
                    if 'conversation' in messages_data:
                        print(f"   Formatted conversation: {len(messages_data['conversation'])} items")
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to get messages: {response.status} - {error_text}")
            
            # Step 6: Test the result endpoint
            print()
            print("🎯 Step 5: Testing result endpoint...")
            result_url = f"{base_url}/api/user-api/agents/runs/{agent_run_id}/result"
            
            async with session.get(result_url, headers=headers) as response:
                if response.status == 200:
                    result_data = await response.json()
                    print(f"✅ Final result retrieved:")
                    print(f"   Status: {result_data['status']}")
                    print(f"   Result length: {len(result_data.get('result', '')) if result_data.get('result') else 0} characters")
                    print(f"   Tool outputs: {len(result_data.get('tool_outputs', []))}")
                    print(f"   Files created: {len(result_data.get('files_created', []))}")
                    
                    if result_data.get('result'):
                        result_preview = result_data['result'][:200] + "..." if len(result_data['result']) > 200 else result_data['result']
                        print(f"   Result preview: {result_preview}")
                    
                    if result_data.get('files_created'):
                        print(f"   Created files: {', '.join(result_data['files_created'])}")
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to get result: {response.status} - {error_text}")
            
        except aiohttp.ClientError as e:
            print(f"❌ Network error: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    print("Starting streaming API test...")
    asyncio.run(test_streaming_api())
