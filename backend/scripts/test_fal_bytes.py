"""
Test passing bytes directly to Fal (auto-upload feature)
According to Fal docs: "The client will auto-upload the file for you if you pass a binary object"
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def test_with_bytes():
    """Test nano-banana/edit with bytes (auto-upload)"""
    print("=" * 80)
    print("🧪 TESTING WITH BYTES (AUTO-UPLOAD)")
    print("=" * 80)
    
    try:
        from fal_client import submit
        from PIL import Image
        import io
        
        # Create test image
        print("\n📝 Creating test image...")
        img = Image.new('RGB', (512, 512), color='blue')
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes = img_bytes.getvalue()
        
        print(f"✓ Created {len(img_bytes)} bytes")
        
        # Try passing bytes directly
        print("\n📤 Passing bytes directly to nano-banana/edit...")
        print("(Fal client should auto-upload)")
        
        payload = {
            "prompt": "make it pink",
            "image_urls": [img_bytes],  # Pass bytes directly
            "num_images": 1,
            "output_format": "jpeg"
        }
        
        print(f"\nPayload:")
        print(f"  prompt: make it pink")
        print(f"  image_urls: [<{len(img_bytes)} bytes>]")
        print(f"  num_images: 1")
        print(f"  output_format: jpeg")
        
        print(f"\n📡 Submitting to fal-ai/nano-banana/edit...")
        handler = submit("fal-ai/nano-banana/edit", arguments=payload)
        result = handler.get()
        
        print("\n✅ SUCCESS WITH BYTES!")
        print(f"Result: {result}")
        
        print("\n🎉 AUTO-UPLOAD WORKS WITH BYTES!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_with_bytes()
