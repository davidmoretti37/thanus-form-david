"""
Complete test script for image generation and editing workflow
Tests: Generate image → Edit image with proper URL handling
"""
import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

async def test_complete_workflow():
    """Test complete image generation and editing workflow"""
    print("=" * 80)
    print("🧪 TESTING COMPLETE IMAGE WORKFLOW")
    print("=" * 80)
    
    try:
        # Import required modules
        from core.tools.sb_image_edit_tool import SandboxImageEditTool
        from core.agentpress.thread_manager import ThreadManager
        from unittest.mock import Mock
        
        # Check FAL_KEY
        fal_key = os.getenv("FAL_KEY")
        if not fal_key:
            print("\n❌ FAL_KEY not set in environment")
            print("Please set FAL_KEY in backend/.env")
            return
        
        print(f"\n✓ FAL_KEY found: {fal_key[:10]}...")
        
        # Create mock thread manager with agent config
        thread_manager = Mock()
        thread_manager.agent_config = {
            "agentpress_tools": {
                "sb_image_edit_tool": {
                    "enabled": True,
                    "settings": {
                        "fal_model_generate": "fal-ai/nano-banana",
                        "fal_model_edit": "fal-ai/nano-banana/edit"
                    }
                }
            }
        }
        
        print("\n✓ Mock thread manager created with config:")
        print(f"  - Generate model: fal-ai/nano-banana")
        print(f"  - Edit model: fal-ai/nano-banana/edit")
        
        # Create tool instance
        project_id = "test_project"
        thread_id = "test_thread"
        
        print(f"\n✓ Creating SandboxImageEditTool instance...")
        tool = SandboxImageEditTool(project_id, thread_id, thread_manager)
        
        # STEP 1: Generate Image
        print("\n" + "=" * 80)
        print("📸 STEP 1: GENERATING IMAGE")
        print("=" * 80)
        print("Prompt: 'gere uma foto de uma princesa com vestido azul'")
        
        generate_result = await tool.image_edit_or_generate(
            mode="generate",
            prompt="gere uma foto de uma princesa com vestido azul",
            fal_model="",  # Will use config
            image_size="1024x1024"
        )
        
        if not generate_result.success:
            print(f"\n❌ GENERATION FAILED:")
            print(f"Error: {generate_result.data}")
            return
        
        print(f"\n✅ GENERATION SUCCESS!")
        generated_image_path = generate_result.data.get("design_path")
        print(f"Image saved to: {generated_image_path}")
        print(f"Model used: {generate_result.data.get('model')}")
        print(f"Sandbox ID: {generate_result.data.get('sandbox_id')}")
        
        # STEP 2: Edit Image
        print("\n" + "=" * 80)
        print("🎨 STEP 2: EDITING IMAGE")
        print("=" * 80)
        print(f"Using image: {generated_image_path}")
        print("Edit prompt: 'troque a cor do vestido da princesa para rosa'")
        
        edit_result = await tool.image_edit_or_generate(
            mode="edit",
            prompt="troque a cor do vestido da princesa para rosa",
            image_path=generated_image_path,
            fal_model="",  # Will use config
            image_size="1024x1024",
            strength=0.7
        )
        
        if not edit_result.success:
            print(f"\n❌ EDIT FAILED:")
            print(f"Error: {edit_result.data}")
            return
        
        print(f"\n✅ EDIT SUCCESS!")
        edited_image_path = edit_result.data.get("design_path")
        print(f"Edited image saved to: {edited_image_path}")
        print(f"Model used: {edit_result.data.get('model')}")
        print(f"Original image: {edit_result.data.get('original_image')}")
        
        # Final Summary
        print("\n" + "=" * 80)
        print("🎉 WORKFLOW TEST COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print(f"Generated: {generated_image_path}")
        print(f"Edited: {edited_image_path}")
        print("\n✅ All steps completed without errors!")
        
    except ImportError as e:
        print(f"\n❌ IMPORT ERROR: {str(e)}")
        print("Make sure you're running from the backend directory")
        import traceback
        traceback.print_exc()
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("\n🚀 Starting complete image workflow test...")
    print("This will test: Generate → Edit with proper URL handling\n")
    asyncio.run(test_complete_workflow())
