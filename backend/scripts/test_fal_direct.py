"""
Test Fal AI with direct file object (auto-upload feature)
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def test_fal_direct():
    """Test with Fal's auto-upload feature"""
    print("=" * 80)
    print("🧪 TESTING FAL AI WITH AUTO-UPLOAD")
    print("=" * 80)
    
    try:
        from fal_client import submit
        from PIL import Image
        import tempfile
        import io
        
        # Create test image
        print("\n📝 Creating test image...")
        img = Image.new('RGB', (512, 512), color='blue')
        
        # Save to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        print(f"✓ Created image in memory ({len(img_bytes.getvalue())} bytes)")
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png", mode='wb') as tmp:
            tmp.write(img_bytes.getvalue())
            tmp_path = tmp.name
        
        print(f"✓ Saved to: {tmp_path}")
        
        # Test 1: With file path (Fal should auto-upload)
        print("\n📤 Test 1: Passing file path directly...")
        
        from fal_client import FalFile
        
        # Try using FalFile
        fal_file = FalFile.from_path(tmp_path)
        
        payload = {
            "prompt": "make it pink",
            "image_urls": [fal_file],
            "num_images": 1,
            "output_format": "jpeg"
        }
        
        print(f"\nPayload:")
        print(f"  prompt: make it pink")
        print(f"  image_urls: [FalFile object]")
        print(f"  num_images: 1")
        print(f"  output_format: jpeg")
        
        print(f"\n📡 Submitting to fal-ai/nano-banana/edit...")
        handler = submit("fal-ai/nano-banana/edit", arguments=payload)
        result = handler.get()
        
        print("\n✅ SUCCESS!")
        print(f"Result: {result}")
        
        # Clean up
        os.unlink(tmp_path)
        
        print("\n🎉 AUTO-UPLOAD WORKS!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Clean up
        try:
            os.unlink(tmp_path)
        except:
            pass

if __name__ == "__main__":
    test_fal_direct()
