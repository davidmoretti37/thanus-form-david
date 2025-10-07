"""
Test upload with retry to verify URLs become accessible
"""
import os
import sys
from pathlib import Path
import asyncio
import time

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

async def test_upload_retry():
    """Test upload with retry logic"""
    print("=" * 80)
    print("🧪 TESTING UPLOAD WITH RETRY")
    print("=" * 80)
    
    try:
        from fal_client import upload, submit
        from PIL import Image
        import httpx
        import tempfile
        
        # Create test image
        print("\n📝 Creating test image...")
        img = Image.new('RGB', (512, 512), color='blue')
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            img.save(tmp.name)
            tmp_path = tmp.name
        
        print(f"✓ Created: {tmp_path}")
        
        # Upload
        print("\n📤 Uploading...")
        uploaded_url = upload(tmp_path, content_type="image/png")
        print(f"✓ URL: {uploaded_url}")
        
        # Try accessing with retries
        print("\n🔄 Testing URL accessibility with retries...")
        max_retries = 5
        
        for attempt in range(max_retries):
            try:
                print(f"\nAttempt {attempt + 1}/{max_retries}...")
                async with httpx.AsyncClient() as client:
                    response = await client.head(uploaded_url, timeout=10)
                    if response.status_code == 200:
                        print(f"✅ URL accessible after {attempt + 1} attempts!")
                        
                        # Now try with nano-banana/edit
                        print("\n🎨 Testing with nano-banana/edit...")
                        handler = submit("fal-ai/nano-banana/edit", arguments={
                            "prompt": "make it pink",
                            "image_urls": [uploaded_url],
                            "num_images": 1,
                            "output_format": "jpeg"
                        })
                        result = handler.get()
                        print("✅ EDIT SUCCESS!")
                        print(f"Result: {result}")
                        break
            except Exception as e:
                print(f"❌ Attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    print("Waiting 3 seconds before retry...")
                    await asyncio.sleep(3)
        
        # Clean up
        os.unlink(tmp_path)
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_upload_retry())
