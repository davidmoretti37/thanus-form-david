"""
Test script for image-to-video generation using Fal AI Sora 2 model.
"""
import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

async def test_sora2_image_to_video():
    """Test image-to-video generation with Sora 2 model."""
    try:
        from fal_client import submit
        
        # Test parameters from user
        model = "fal-ai/sora-2/image-to-video"
        
        args = {
            "prompt": "Front-facing 'invisible' action-cam on a skydiver in freefall above bright clouds; camera locked on his face. He speaks over the wind with clear lipsync: 'This is insanely fun! You've got to try it—book a tandem and go!' Natural wind roar, voice close-mic'd and slightly compressed so it's intelligible. Midday sun, goggles and jumpsuit flutter, altimeter visible, parachute rig on shoulders. Energetic but stable framing with subtle shake; brief horizon roll. End on first tug of canopy and wind noise dropping.",
            "resolution": "auto",
            "aspect_ratio": "auto",
            "duration": 4,
            "image_url": "https://storage.googleapis.com/falserverless/example_inputs/sora-2-i2v-input.png"
        }
        
        print(f"🎬 Testing Sora 2 image-to-video with model: {model}")
        print(f"📝 Prompt: {args['prompt'][:80]}...")
        print(f"🖼️  Image URL: {args['image_url']}")
        print(f"⏱️  Duration: {args['duration']}s")
        print(f"📐 Resolution: {args['resolution']}")
        print(f"📏 Aspect Ratio: {args['aspect_ratio']}")
        print("\n⏳ Submitting request to Fal AI...")
        print("⚠️  Note: Sora 2 generation can take several minutes...")
        
        # Submit to Fal AI
        handler = await asyncio.to_thread(submit, model, arguments=args)
        
        print("⏳ Waiting for video generation (this may take a while)...")
        result = await asyncio.to_thread(handler.get)
        
        print("\n✅ Video generation complete!")
        print(f"📦 Full response: {result}")
        
        # Extract video URL
        def extract_url(obj):
            if isinstance(obj, dict):
                for k in ("url", "signed_url", "uri"):
                    v = obj.get(k)
                    if isinstance(v, str) and v.startswith("http"):
                        return v
                for v in obj.values():
                    found = extract_url(v)
                    if found:
                        return found
            elif isinstance(obj, list):
                for item in obj:
                    found = extract_url(item)
                    if found:
                        return found
            return None
        
        video_url = extract_url(result)
        if video_url:
            print(f"\n🎥 Video URL: {video_url}")
            print("\n✨ Success! The Sora 2 image-to-video model is working correctly.")
        else:
            print("\n❌ Could not extract video URL from response")
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Check for FAL_KEY
    if not os.getenv("FAL_KEY"):
        print("❌ FAL_KEY not found in environment")
        print("Please set FAL_KEY in backend/.env")
        sys.exit(1)
    
    print("="*60)
    print("🎬 Fal AI Sora 2 Image-to-Video Test")
    print("="*60)
    print()
    
    asyncio.run(test_sora2_image_to_video())
