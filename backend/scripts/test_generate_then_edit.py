"""
Test correct workflow: Generate with nano-banana → Edit with nano-banana/edit using generated image URL
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def test_supabase_url_conversion():
    """Test: Convert Supabase URL → Fal URL → Edit workflow"""
    print("=" * 80)
    print("🧪 TESTING SUPABASE URL CONVERSION")
    print("=" * 80)

    try:
        from fal_client import upload
        import httpx
        import asyncio


        # Simulate a Supabase URL (we'll use a real image URL for testing)
        supabase_url = "https://picsum.photos/512/512"  # Sample image URL for testing

        print(f"📥 Testing with sample external URL: {supabase_url}")

        # STEP 1: Download image from external URL (like Supabase would provide)
        print("\n" + "=" * 50)
        print("📥 STEP 1: Download from external URL")
        print("=" * 50)

        async def download_and_upload():
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(supabase_url, timeout=30)
                response.raise_for_status()
                image_bytes = response.content
                print(f"✅ Downloaded {len(image_bytes)} bytes")

                # STEP 2: Upload to Fal to get Fal URL
                print("\n" + "=" * 50)
                print("⬆️ STEP 2: Upload to Fal AI")
                print("=" * 50)

                # Create temp file for upload
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                    tmp.write(image_bytes)
                    tmp.flush()
                    tmp_path = tmp.name

                try:
                    fal_url = await asyncio.to_thread(upload, tmp_path, content_type="image/jpeg")
                    print(f"✅ Uploaded to Fal. URL: {fal_url}")

                    # STEP 3: Verify Fal URL works with nano-banana/edit
                    print("\n" + "=" * 50)
                    print("🎨 STEP 3: Test edit with uploaded Fal URL")
                    print("=" * 50)

                    from fal_client import submit

                    edit_payload = {
                        "prompt": "make the image black and white",
                        "image_urls": [fal_url],
                        "num_images": 1,
                        "output_format": "jpeg"
                    }

                    edit_handler = submit("fal-ai/nano-banana/edit", arguments=edit_payload)
                    edit_result = edit_handler.get()

                    print(f"✅ Edit successful! Result: {edit_result}")

                    # Extract edited image URL
                    if 'images' in edit_result and len(edit_result['images']) > 0:
                        edited_url = edit_result['images'][0].get('url')
                        print(f"🎉 Final edited image URL: {edited_url}")
                        return True
                    else:
                        print("❌ No edited image URL found")
                        return False

                finally:
                    try:
                        os.unlink(tmp_path)
                    except:
                        pass

        # Run async test
        success = asyncio.run(download_and_upload())

        print("\n" + "=" * 80)
        if success:
            print("🎉 SUPABASE URL CONVERSION WORKFLOW SUCCESS!")
        else:
            print("❌ SUPABASE URL CONVERSION WORKFLOW FAILED!")
        print("=" * 80)

        return success

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_generate_then_edit():
    """Test: Generate image → Use that image's URL for editing"""
    print("=" * 80)
    print("🧪 CORRECT WORKFLOW: GENERATE → EDIT")
    print("=" * 80)
    
    try:
        from fal_client import submit
        
        # STEP 1: Generate image with nano-banana
        print("\n" + "=" * 80)
        print("📸 STEP 1: GENERATE with fal-ai/nano-banana")
        print("=" * 80)
        print("Prompt: 'uma princesa com vestido azul'")
        
        gen_payload = {
            "prompt": "uma princesa com vestido azul",
            "image_size": "square_hd",
            "num_images": 1,
            "output_format": "jpeg"
        }
        
        print("\nGenerating...")
        gen_handler = submit("fal-ai/nano-banana", arguments=gen_payload)
        gen_result = gen_handler.get()
        
        print("\n✅ GENERATION SUCCESS!")
        print(f"Full result: {gen_result}")
        
        # Extract generated image URL
        generated_url = None
        if 'images' in gen_result and len(gen_result['images']) > 0:
            generated_url = gen_result['images'][0].get('url')
        
        if not generated_url:
            print("❌ Could not extract image URL from generation result")
            return
        
        print(f"\n✓ Generated image URL: {generated_url}")
        
        # STEP 2: Edit with nano-banana/edit using the generated URL
        print("\n" + "=" * 80)
        print("🎨 STEP 2: EDIT with fal-ai/nano-banana/edit")
        print("=" * 80)
        print(f"Using generated URL: {generated_url}")
        print("Edit prompt: 'troque a cor do vestido para rosa'")
        
        edit_payload = {
            "prompt": "troque a cor do vestido da princesa para rosa",
            "image_urls": [generated_url],  # Use URL from generation
            "num_images": 1,
            "output_format": "jpeg"
        }
        
        print(f"\nPayload:")
        print(f"  prompt: troque a cor do vestido da princesa para rosa")
        print(f"  image_urls: [{generated_url}]")
        print(f"  num_images: 1")
        print(f"  output_format: jpeg")
        
        print(f"\nEditing...")
        edit_handler = submit("fal-ai/nano-banana/edit", arguments=edit_payload)
        edit_result = edit_handler.get()
        
        print("\n✅ EDIT SUCCESS!")
        print(f"Result: {edit_result}")
        
        # Extract edited image URL
        edited_url = None
        if 'images' in edit_result and len(edit_result['images']) > 0:
            edited_url = edit_result['images'][0].get('url')
        
        print("\n" + "=" * 80)
        print("🎉 COMPLETE WORKFLOW SUCCESS!")
        print("=" * 80)
        print(f"✓ Generated: {generated_url}")
        print(f"✓ Edited: {edited_url}")
        print("\n✅ The workflow works when using generated image URLs!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "test_supabase":
        test_supabase_url_conversion()
    else:
        test_generate_then_edit()
