import requests
import json
import time
from typing import Optional

class ThanusAPIClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def list_agents(self):
        """List all available agents"""
        url = f"{self.base_url}/api/user-api/agents"
        
        try:
            response = requests.get(url, headers=self.headers)
            
            print(f"Status Code: {response.status_code}")
            print(f"URL: {response.url}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Found {data['total']} agents")
                
                for agent in data['agents']:
                    print(f"  - {agent['name']} ({agent['agent_id']})")
                    print(f"    Default: {agent['is_default']}")
                    print(f"    Version: {agent.get('current_version_name', 'v1')}")
                    print()
                
                return data['agents']
            else:
                print(f"❌ Error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None
    
    def list_models(self):
        """List all available models"""
        url = f"{self.base_url}/api/user-api/models"
        
        try:
            response = requests.get(url, headers=self.headers)
            
            print(f"Status Code: {response.status_code}")
            print(f"URL: {response.url}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Found {data['total']} available models")
                print(f"Default model: {data['default_model']}")
                print()
                
                for model in data['models']:
                    print(f"  - {model['display_name']} ({model['name']})")
                    print(f"    Provider: {model['provider']}")
                    print(f"    Description: {model['description']}")
                    print(f"    Max tokens: {model.get('max_tokens', 'N/A')}")
                    print(f"    Supports thinking: {model['supports_thinking']}")
                    print(f"    Supports vision: {model['supports_vision']}")
                    print()
                
                return data['models']
            else:
                print(f"❌ Error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None
    
    def execute_agent(self, prompt: str, agent_id: Optional[str] = None, 
                     model_name: Optional[str] = None, enable_thinking: bool = False,
                     reasoning_effort: str = "low", stream: bool = True,
                     enable_context_manager: bool = False):
        """Execute an agent with the given prompt"""
        url = f"{self.base_url}/api/user-api/agents/execute"
        
        payload = {
            "prompt": prompt,
            "enable_thinking": enable_thinking,
            "reasoning_effort": reasoning_effort,
            "stream": stream,
            "enable_context_manager": enable_context_manager
        }
        
        if agent_id:
            payload["agent_id"] = agent_id
        if model_name:
            payload["model_name"] = model_name
        
        try:
            print(f"🚀 Executing agent...")
            print(f"Prompt: {prompt}")
            print(f"Agent ID: {agent_id or 'Default'}")
            print(f"Model: {model_name or 'Default'}")
            print()
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            print(f"Status Code: {response.status_code}")
            print(f"URL: {response.url}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Agent execution started successfully!")
                print(f"Thread ID: {data['thread_id']}")
                print(f"Agent Run ID: {data['agent_run_id']}")
                print(f"Project ID: {data['project_id']}")
                print(f"Status: {data['status']}")
                print(f"Message: {data['message']}")
                print(f"🔗 View URL: {data['view_url']}")
                return data
            else:
                print(f"❌ Error: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error details: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Error text: {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
            return None

def main():
    # Configuração
    BASE_URL = "http://localhost:8000"  # Altere para sua URL
    API_KEY = "thanus_51kgcJwFKHabqFaC1spSsCYIGhySsBuTLpjsUICGNyU"  # Substitua pela sua API key
    
    print("=== Thanus AI API Test ===")
    print(f"Base URL: {BASE_URL}")
    print(f"API Key: {API_KEY[:15]}...")
    print()
    
    # Inicializar cliente
    client = ThanusAPIClient(BASE_URL, API_KEY)
    
    # Teste 1: Listar modelos
    print("🧠 Test 1: Listing available models...")
    models = client.list_models()
    print("-" * 50)
    
    # Teste 2: Listar agentes
    print("📋 Test 2: Listing agents...")
    agents = client.list_agents()
    print("-" * 50)
    
    if not agents:
        print("❌ No agents found or error occurred. Cannot proceed with execution test.")
        return
    
    # Teste 3: Executar agente (usando agente padrão)
    print("🤖 Test 3: Executing agent with default settings...")
    
    prompt = "Create a simple Python function that calculates the factorial of a number"
    
    result = client.execute_agent(
        prompt=prompt,
        enable_thinking=False,
        reasoning_effort="low"
    )
    
    print("-" * 50)
    
    # Teste 4: Executar com modelo específico (se modelos disponíveis)
    if models and len(models) > 0:
        print("🎯 Test 4: Executing with specific model...")
        
        # Usar o primeiro modelo da lista
        specific_model = models[0]
        
        result3 = client.execute_agent(
            prompt="Write a simple HTML page with a greeting",
            model_name=specific_model['name'],
            enable_thinking=specific_model['supports_thinking'],
            reasoning_effort="low"
        )
        
        if result3:
            print(f"✅ Specific model execution started!")
            print(f"Used model: {specific_model['display_name']}")
        else:
            print("❌ Specific model execution failed")
        
        print("-" * 50)
    
    # Teste 5: Executar com agente específico (se disponível)
    if agents and len(agents) > 0:
        print("🎯 Test 5: Executing with specific agent...")
        
        # Usar o primeiro agente da lista
        specific_agent = agents[0]
        
        result2 = client.execute_agent(
            prompt="Explain what you are and what you can do",
            agent_id=specific_agent['agent_id'],
            enable_thinking=True,
            reasoning_effort="medium"
        )
        
        if result2:
            print(f"✅ Specific agent execution started!")
            print(f"Used agent: {specific_agent['name']}")
        else:
            print("❌ Specific agent execution failed")
    
    if result:
        print("\n✅ All tests completed successfully!")
        print(f"You can monitor the execution using:")
        print(f"- Thread ID: {result['thread_id']}")
        print(f"- Agent Run ID: {result['agent_run_id']}")
    else:
        print("\n❌ Agent execution test failed")

def test_error_cases():
    """Test error cases"""
    print("\n=== Error Cases Test ===")
    
    BASE_URL = "http://localhost:8000"
    INVALID_API_KEY = "thanus_invalid_key_for_testing"
    
    client = ThanusAPIClient(BASE_URL, INVALID_API_KEY)
    
    print("🔒 Testing with invalid API key...")
    result = client.list_agents()
    
    if result is None:
        print("✅ Invalid API key correctly rejected")
    else:
        print("❌ Invalid API key was accepted (unexpected)")

if __name__ == "__main__":
    try:
        main()
        test_error_cases()
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        import traceback
        traceback.print_exc()
