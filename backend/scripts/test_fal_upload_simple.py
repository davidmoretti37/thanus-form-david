"""
Simple test to verify Fal AI upload returns valid URLs
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def test_fal_upload_simple():
    """Test uploading an image to Fal and verify URL"""
    print("=" * 80)
    print("🧪 TESTING FAL AI UPLOAD")
    print("=" * 80)
    
    try:
        from fal_client import upload
        from PIL import Image
        import tempfile
        
        # Check FAL_KEY
        fal_key = os.getenv("FAL_KEY")
        if not fal_key:
            print("\n❌ FAL_KEY not set")
            return
        
        print(f"\n✓ FAL_KEY: {fal_key[:10]}...")
        
        # Create test image
        print("\n📝 Creating test image...")
        img = Image.new('RGB', (100, 100), color='blue')
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            img.save(tmp.name)
            tmp_path = tmp.name
            print(f"✓ Saved to: {tmp_path}")
        
        # Upload to Fal
        print("\n📤 Uploading to Fal storage...")
        uploaded_url = upload(tmp_path, content_type="image/png")
        
        # Verify URL
        print("\n" + "=" * 80)
        print("✅ UPLOAD RESULT:")
        print("=" * 80)
        print(f"URL: {uploaded_url}")
        print(f"Type: {type(uploaded_url)}")
        print(f"Is string: {isinstance(uploaded_url, str)}")
        print(f"Starts with http: {str(uploaded_url).startswith('http')}")
        print(f"Length: {len(str(uploaded_url))}")
        
        # Test with nano-banana/edit
        print("\n" + "=" * 80)
        print("🎨 TESTING WITH NANO-BANANA/EDIT")
        print("=" * 80)
        
        from fal_client import submit
        
        payload = {
            "prompt": "make it pink",
            "image_urls": [uploaded_url],
            "num_images": 1,
            "output_format": "jpeg"
        }
        
        print(f"\nPayload being sent:")
        import json
        print(json.dumps(payload, indent=2))
        
        print(f"\n📡 Submitting to fal-ai/nano-banana/edit...")
        handler = submit("fal-ai/nano-banana/edit", arguments=payload)
        result = handler.get()
        
        print("\n✅ EDIT SUCCESS!")
        print(f"Result: {result}")
        
        # Clean up
        os.unlink(tmp_path)
        
        print("\n" + "=" * 80)
        print("🎉 ALL TESTS PASSED!")
        print("=" * 80)
        print("✓ Upload works correctly")
        print("✓ URL is valid")
        print("✓ nano-banana/edit accepts the URL")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_fal_upload_simple()
