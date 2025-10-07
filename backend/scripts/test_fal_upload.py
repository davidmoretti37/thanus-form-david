"""
Test script to verify Fal AI upload and edit workflow
"""
import os
import sys
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_fal_upload():
    """Test uploading an image to Fal and getting a valid URL"""
    try:
        from fal_client import upload
        
        # Check FAL_KEY
        fal_key = os.getenv("FAL_KEY")
        if not fal_key:
            print("❌ FAL_KEY not set in environment")
            return
        
        print(f"✓ FAL_KEY found: {fal_key[:10]}...")
        
        # Create a simple test image
        from PIL import Image
        import tempfile
        
        # Create a simple red square image
        img = Image.new('RGB', (100, 100), color='red')
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            img.save(tmp.name)
            tmp_path = tmp.name
        
        print(f"✓ Created test image: {tmp_path}")
        
        # Upload to Fal
        print("Uploading to Fal storage...")
        uploaded_url = upload(tmp_path, content_type="image/png")
        
        print(f"\n✅ UPLOAD SUCCESS!")
        print(f"URL: {uploaded_url}")
        print(f"URL type: {type(uploaded_url)}")
        print(f"URL starts with http: {str(uploaded_url).startswith('http')}")
        
        # Clean up
        os.unlink(tmp_path)
        
        # Test nano-banana/edit with this URL
        print(f"\n📤 Testing nano-banana/edit with uploaded URL...")
        from fal_client import submit
        
        result = await asyncio.to_thread(
            submit,
            "fal-ai/nano-banana/edit",
            arguments={
                "prompt": "make it blue instead of red",
                "image_urls": [uploaded_url],
                "num_images": 1,
                "output_format": "jpeg"
            }
        )
        
        final_result = await asyncio.to_thread(result.get)
        print(f"\n✅ EDIT SUCCESS!")
        print(f"Result: {final_result}")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_fal_upload())
