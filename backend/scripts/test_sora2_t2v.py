"""
Test script for text-to-video generation using Fal AI Sora 2 model.
"""
import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

async def test_sora2_text_to_video():
    """Test text-to-video generation with Sora 2 model."""
    try:
        from fal_client import submit
        
        # Test parameters from user
        model = "fal-ai/sora-2/text-to-video"
        
        args = {
            "prompt": "A dramatic Hollywood breakup scene at dusk on a quiet suburban street. A man and a woman in their 30s face each other, speaking softly but emotionally, lips syncing to breakup dialogue. Cinematic lighting, warm sunset tones, shallow depth of field, gentle breeze moving autumn leaves, realistic natural sound, no background music",
            "resolution": "720p",
            "aspect_ratio": "16:9",
            "duration": 4
        }
        
        print(f"🎬 Testing Sora 2 text-to-video with model: {model}")
        print(f"📝 Prompt: {args['prompt'][:80]}...")
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
            print("\n✨ Success! The Sora 2 text-to-video model is working correctly.")
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
    print("🎬 Fal AI Sora 2 Text-to-Video Test")
    print("="*60)
    print()
    
    asyncio.run(test_sora2_text_to_video())
