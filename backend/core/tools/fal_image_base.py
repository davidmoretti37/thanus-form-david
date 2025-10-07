"""
Base class for Fal AI image generation and editing tools.
Provides shared functionality for all image tools using Fal AI.
"""

from typing import Optional, Any
from core.agentpress.tool import ToolResult
from core.sandbox.tool_base import SandboxToolsBase
from core.agentpress.thread_manager import ThreadManager
import httpx
import uuid
import os
import asyncio
import tempfile
import json
from datetime import datetime, timezone

# FAL AI client (requires dependency: fal-client; env var FAL_KEY must be set)
try:
    from fal_client import submit, upload
    _FAL_AVAILABLE = True
except Exception:
    _FAL_AVAILABLE = False


class FalImageToolBase(SandboxToolsBase):
    """
    Base class providing shared Fal AI functionality for image tools.
    
    This class implements all common operations for Fal AI image generation and editing:
    - Image generation (text-to-image)
    - Image editing (img2img)
    - Image upload to Fal
    - Image download and saving
    - Model configuration resolution
    
    Child classes should inherit from this and implement their specific tool methods.
    """
    
    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self.thread_id = thread_id
        self.thread_manager = thread_manager
        self.designs_dir = "/workspace/designs"
    
    async def _ensure_designs_directory(self):
        """Ensure the designs directory exists in the sandbox."""
        await self._ensure_sandbox()
        try:
            await self.sandbox.fs.make_dir(self.designs_dir)
        except Exception:
            # Ignore if directory already exists
            pass
    
    def _get_default_fal_model(self, mode: Optional[str] = None, tool_name: str = "sb_image_edit_tool") -> Optional[str]:
        """
        Resolve default Fal model from agent configuration.
        
        Args:
            mode: Operation mode ('create'/'generate' or 'edit')
            tool_name: Tool name to check in config (defaults to sb_image_edit_tool)
        
        Checks tool settings for:
          - fal_model_generate (for 'create'/'generate' mode)
          - fal_model_edit (for 'edit' mode)
          - fal_model (legacy fallback)
        """
        try:
            from core.utils.logger import logger
            
            cfg = getattr(self.thread_manager, "agent_config", None) or {}
            tools_cfg = (cfg.get("agentpress_tools") or cfg.get("agentpress") or {}) or {}
            
            logger.debug(f"[FAL MODEL CONFIG] Mode: {mode}, Tool: {tool_name}")
            logger.debug(f"[FAL MODEL CONFIG] Full agentpress_tools config: {tools_cfg}")
            
            # Check both designer and image_edit tool settings
            tool_cfg = tools_cfg.get(tool_name) or tools_cfg.get("sb_image_edit_tool") or tools_cfg.get("sb_designer_tool") or {}
            settings = tool_cfg.get("settings") or {}
            
            logger.debug(f"[FAL MODEL CONFIG] Tool config for {tool_name}: {tool_cfg}")
            logger.debug(f"[FAL MODEL CONFIG] Settings: {settings}")
            
            if isinstance(mode, str):
                # Normalize mode names
                normalized_mode = "generate" if mode in ("create", "generate") else "edit"
                
                if normalized_mode == "generate" and isinstance(settings.get("fal_model_generate"), str):
                    val = settings.get("fal_model_generate", "").strip()
                    if val:
                        logger.info(f"[FAL MODEL CONFIG] Using fal_model_generate: {val}")
                        return val
                if normalized_mode == "edit" and isinstance(settings.get("fal_model_edit"), str):
                    val = settings.get("fal_model_edit", "").strip()
                    if val:
                        logger.info(f"[FAL MODEL CONFIG] Using fal_model_edit: {val}")
                        return val
            
            # Fallback to legacy single-model setting
            val = settings.get("fal_model")
            if isinstance(val, str):
                val = val.strip()
                if val:
                    logger.info(f"[FAL MODEL CONFIG] Using fallback fal_model: {val}")
                    return val
            
            logger.debug(f"[FAL MODEL CONFIG] No model found in config, will use default")
        except Exception as e:
            from core.utils.logger import logger
            logger.error(f"[FAL MODEL CONFIG] Error reading config: {str(e)}")
        return None
    
    async def _fal_generate_image(
        self, prompt: str, fal_model: str, image_size: str = "1024x1024"
    ) -> str | ToolResult:
        """Call Fal AI model for pure text-to-image generation and return image URL."""
        try:
            args = {
                "prompt": prompt,
                "image_size": image_size,
                "num_images": 1,
            }
            handler = await asyncio.to_thread(submit, fal_model, arguments=args)
            result = await asyncio.to_thread(handler.get)
            url = self._extract_first_image_url(result)
            if not url:
                return self.fail_response("Fal AI did not return an image URL.")
            return url
        except Exception as e:
            return self.fail_response(f"Fal AI generation failed: {str(e)}")
    
    def _build_model_specific_payload(self, fal_model: str, prompt: str, init_image_url: str, image_size: str, strength: float, num_images: int = 1) -> dict:
        """Build model-specific payload for Fal AI edit operations.
        
        Different models have different parameter requirements:
        - nano-banana/edit expects: prompt, image_urls (array), num_images, output_format
        - Standard models expect: prompt, image_url (string), strength, image_size, num_images
        """
        # Normalize model name for matching
        model_lower = fal_model.lower()
        
        # nano-banana/edit model family
        if "nano-banana" in model_lower and "/edit" in model_lower:
            return {
                "prompt": prompt,
                "image_urls": [init_image_url],  # Array of URLs
                "num_images": num_images,
                "output_format": "jpeg"  # or "png"
            }
        
        # Add other model-specific payloads here as needed
        # Example for future models:
        # elif "some-other-model" in model_lower:
        #     return { ... }
        
        # Default payload structure for standard models (flux, stable-diffusion, etc.)
        return {
            "prompt": prompt,
            "image_url": init_image_url,
            "strength": max(0.0, min(1.0, strength)),
            "image_size": image_size,
            "num_images": num_images,
        }
    
    async def _fal_edit_image(
        self,
        prompt: str,
        fal_model: str,
        init_image_url: str,
        image_size: str = "1024x1024",
        strength: float = 0.7,
    ) -> str | ToolResult:
        """Call Fal AI model for img2img (edit) and return image URL."""
        try:
            # Build model-specific payload
            args = self._build_model_specific_payload(
                fal_model=fal_model,
                prompt=prompt,
                init_image_url=init_image_url,
                image_size=image_size,
                strength=strength,
                num_images=1
            )
            
            handler = await asyncio.to_thread(submit, fal_model, arguments=args)
            result = await asyncio.to_thread(handler.get)
            url = self._extract_first_image_url(result)
            if not url:
                return self.fail_response("Fal AI (edit) did not return an image URL.")
            return url
        except Exception as e:
            return self.fail_response(f"Fal AI edit failed: {str(e)}")
    
    async def _fal_upload_image_with_retry(self, image_bytes: bytes, max_retries: int = 3) -> str | ToolResult:
        """Upload image and wait for URL to become accessible with retry logic."""
        try:
            from core.utils.logger import logger
            import mimetypes
            
            logger.info(f"[FAL UPLOAD] Starting upload of {len(image_bytes)} bytes to Fal AI")
            
            # Create temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                tmp.write(image_bytes)
                tmp.flush()
                tmp_path = tmp.name
            
            try:
                content_type = mimetypes.guess_type(tmp_path)[0] or "image/png"
                logger.debug(f"[FAL UPLOAD] Uploading temp file: {tmp_path}")
                
                # Upload to Fal
                uploaded_url = await asyncio.to_thread(upload, tmp_path, content_type=content_type)
                logger.info(f"[FAL UPLOAD] Upload complete. URL: {uploaded_url}")
                
                # Wait and verify URL is accessible
                for attempt in range(max_retries):
                    try:
                        logger.debug(f"[FAL UPLOAD] Attempt {attempt + 1}/{max_retries}: Verifying URL accessibility...")
                        async with httpx.AsyncClient() as client:
                            response = await client.head(uploaded_url, timeout=10)
                            if response.status_code == 200:
                                logger.info(f"[FAL UPLOAD] URL is accessible after {attempt + 1} attempts")
                                return uploaded_url
                    except Exception as e:
                        logger.debug(f"[FAL UPLOAD] Attempt {attempt + 1} failed: {str(e)}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2)  # Wait 2 seconds before retry
                
                # If retries exhausted, return URL anyway (it might work)
                logger.warning(f"[FAL UPLOAD] URL not verified but returning anyway: {uploaded_url}")
                return uploaded_url
                
            finally:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
                    
        except Exception as e:
            from core.utils.logger import logger
            logger.error(f"[FAL UPLOAD] Upload failed: {str(e)}")
            return self.fail_response(f"Fal upload failed: {str(e)}")
    
    async def _fal_upload_image(self, image_bytes: bytes) -> str | ToolResult:
        """Upload local bytes to Fal (legacy method - calls retry version)."""
        return await self._fal_upload_image_with_retry(image_bytes)
    
    def _extract_first_image_url(self, response: Any) -> Optional[str]:
        """
        Extract the first image URL from Fal response.
        Typical response shapes:
          - {'images': [{'url': '...'}]}
          - {'image': {'url': '...'}}
          - {'output': [{'url': '...'}]}
        """
        def _dfs(obj: Any) -> Optional[str]:
            if isinstance(obj, dict):
                for k in ("url", "signed_url", "uri"):
                    v = obj.get(k)
                    if isinstance(v, str) and v.startswith("http"):
                        return v
                for v in obj.values():
                    found = _dfs(v)
                    if found:
                        return found
            elif isinstance(obj, list):
                for item in obj:
                    found = _dfs(item)
                    if found:
                        return found
            elif isinstance(obj, str):
                if obj.startswith("http"):
                    return obj
            return None
        
        return _dfs(response)
    
    async def _save_image_from_url(self, url: str, width: Optional[int] = None, height: Optional[int] = None) -> str | ToolResult:
        """Download image from a URL and save into /workspace/designs/ with random filename and a metadata JSON alongside containing the original Fal URL."""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, timeout=60)
                r.raise_for_status()
                data = r.content
            
            # Generate filename with dimensions if provided
            if width and height:
                random_filename = f"design_{width}x{height}_{uuid.uuid4().hex[:8]}.png"
            else:
                random_filename = f"design_1024x1024_{uuid.uuid4().hex[:8]}.png"
            
            full_path = f"{self.designs_dir}/{random_filename}"
            await self.sandbox.fs.upload_file(data, full_path)
            
            # Write sidecar metadata with the original Fal URL so agents can reuse it later
            meta_filename = random_filename.replace(".png", ".json")
            meta_path = f"{self.designs_dir}/{meta_filename}"
            metadata = {
                "provider": "fal",
                "source_url": url,
                "saved_path": full_path,
                "dimensions": {"width": width, "height": height},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await self.sandbox.fs.upload_file(json.dumps(metadata, indent=2).encode("utf-8"), meta_path)
            
            return full_path
        except Exception as e:
            return self.fail_response(f"Failed to download and save Fal image: {str(e)}")
    
    def _design_metadata_path(self, image_path: str) -> str:
        """Return the metadata sidecar path for a given design image path."""
        try:
            base, _ = os.path.splitext(image_path)
            return f"{base}.json"
        except Exception:
            if image_path.endswith(".png"):
                return image_path[:-4] + ".json"
            return image_path + ".json"
    
    async def _read_design_metadata(self, image_path: str) -> Optional[dict]:
        """Read JSON metadata sidecar for a design. Returns dict or None if missing."""
        try:
            meta_path = self._design_metadata_path(image_path)
            data = await self.sandbox.fs.download_file(meta_path)
            return json.loads(data.decode("utf-8"))
        except Exception:
            return None
    
    async def _resolve_design_full_path(self, image_path: str) -> Optional[str]:
        """Resolve a path or filename to an absolute path inside the sandbox workspace."""
        try:
            cleaned = self.clean_path(image_path)
            # Already absolute within workspace
            if cleaned.startswith("/workspace/"):
                return cleaned
            # Root-absolute path (e.g., /designs/foo.png)
            if cleaned.startswith("/"):
                return f"{self.workspace_path}{cleaned}"
            # If includes 'designs/' treat as relative to workspace
            if "designs/" in cleaned:
                return f"{self.workspace_path}/{cleaned}"
            # Otherwise assume it's a filename under /workspace/designs
            return f"{self.designs_dir}/{cleaned}"
        except Exception:
            return None
    
    async def _get_image_bytes(self, image_path: str) -> bytes | ToolResult:
        """Get image bytes from URL or local file path."""
        if image_path.startswith(("http://", "https://")):
            return await self._download_image_from_url(image_path)
        else:
            return await self._read_image_from_sandbox(image_path)
    
    async def _download_image_from_url(self, url: str) -> bytes | ToolResult:
        """Download image from URL."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=60)
                response.raise_for_status()
                return response.content
        except Exception:
            return self.fail_response(f"Could not download image from URL: {url}")
    
    async def _read_image_from_sandbox(self, image_path: str) -> bytes | ToolResult:
        """Read image from sandbox filesystem with intelligent path handling."""
        try:
            from core.utils.logger import logger
            
            cleaned_path = self.clean_path(image_path)
            
            # Try multiple path variations to find the image
            possible_paths = [
                f"{self.workspace_path}/{cleaned_path}",  # Standard path
                f"{self.workspace_path}/designs/{cleaned_path}",  # Designs folder
                f"{self.designs_dir}/{cleaned_path}",  # Designs direct
            ]
            
            # If path already includes designs, don't duplicate
            if 'designs/' in cleaned_path:
                possible_paths = [f"{self.workspace_path}/{cleaned_path}"]
            
            logger.debug(f"Searching for image: {image_path}")
            logger.debug(f"Cleaned path: {cleaned_path}")
            logger.debug(f"Trying paths: {possible_paths}")
            
            for full_path in possible_paths:
                try:
                    file_info = await self.sandbox.fs.get_file_info(full_path)
                    if file_info.is_dir:
                        continue
                    
                    logger.debug(f"Found image at: {full_path}")
                    return await self.sandbox.fs.download_file(full_path)
                except Exception:
                    continue
            
            return self.fail_response(
                f"Could not find image file: {image_path}. Tried paths: {', '.join(possible_paths)}"
            )
        except Exception as e:
            return self.fail_response(
                f"Could not read image file from sandbox: {image_path} - {str(e)}"
            )
    
    def _check_fal_availability(self) -> Optional[ToolResult]:
        """Check if Fal AI is available and configured. Returns error ToolResult if not, None if OK."""
        if not _FAL_AVAILABLE:
            return self.fail_response(
                "Fal client not available. Please ensure 'fal-client' is installed in backend and restart the server."
            )
        if not os.getenv("FAL_KEY"):
            return self.fail_response(
                "FAL_KEY was not found in environment. Please set FAL_KEY in backend/.env and restart the server."
            )
        return None
