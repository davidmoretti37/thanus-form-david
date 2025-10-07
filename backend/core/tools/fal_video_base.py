"""
Base class for Fal AI video generation and editing tools.
Provides shared functionality for all video tools using Fal AI.
"""

from typing import Optional, Any, Dict
from core.agentpress.tool import ToolResult
from core.sandbox.tool_base import SandboxToolsBase
from core.agentpress.thread_manager import ThreadManager
import httpx
import uuid
import os
import asyncio
import tempfile
import json
import mimetypes
from urllib.parse import urlparse
from datetime import datetime, timezone

# FAL AI client (requires dependency: fal-client; env var FAL_KEY must be set)
try:
    from fal_client import submit, upload
    _FAL_AVAILABLE = True
except Exception:
    _FAL_AVAILABLE = False


class FalVideoToolBase(SandboxToolsBase):
    """
    Base class providing shared Fal AI functionality for video tools.

    This class implements common operations for Fal AI video generation and editing:
    - Video generation (text-to-video)
    - Video editing (vid2vid or img2vid where supported)
    - Video upload to Fal
    - Video download and saving
    - Model configuration resolution

    Child classes should inherit from this and implement their specific tool methods.
    """

    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self.thread_id = thread_id
        self.thread_manager = thread_manager
        self.videos_dir = "/workspace/videos"

    async def _ensure_videos_directory(self):
        """Ensure the videos directory exists in the sandbox."""
        await self._ensure_sandbox()
        try:
            await self.sandbox.fs.make_dir(self.videos_dir)
        except Exception:
            # Ignore if directory already exists
            pass

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

    def _get_default_fal_model(self, mode: Optional[str] = None, tool_name: str = "sb_video_tool") -> Optional[str]:
        """
        Resolve default Fal model from agent configuration for video tools.

        Args:
            mode: Operation mode ('generate' or 'edit')
            tool_name: Tool name to check in config (defaults to sb_video_tool)

        Checks tool settings for:
          - fal_model_generate (for 'generate' mode)
          - fal_model_edit (for 'edit' mode)
          - fal_model (legacy fallback)
        """
        try:
            from core.utils.logger import logger

            cfg = getattr(self.thread_manager, "agent_config", None) or {}
            tools_cfg = (cfg.get("agentpress_tools") or cfg.get("agentpress") or {}) or {}

            logger.debug(f"[FAL VIDEO MODEL CONFIG] Mode: {mode}, Tool: {tool_name}")
            logger.debug(f"[FAL VIDEO MODEL CONFIG] Full agentpress_tools config: {tools_cfg}")

            tool_cfg = (
                tools_cfg.get(tool_name)
                or tools_cfg.get("sb_video_tool")
                or {}
            )
            settings = tool_cfg.get("settings") or {}

            logger.debug(f"[FAL VIDEO MODEL CONFIG] Tool config for {tool_name}: {tool_cfg}")
            logger.debug(f"[FAL VIDEO MODEL CONFIG] Settings: {settings}")

            if isinstance(mode, str):
                normalized_mode = "generate" if mode in ("create", "generate") else "edit"
                if normalized_mode == "generate" and isinstance(settings.get("fal_model_generate"), str):
                    val = settings.get("fal_model_generate", "").strip()
                    if val:
                        logger.info(f"[FAL VIDEO MODEL CONFIG] Using fal_model_generate: {val}")
                        return val
                if normalized_mode == "edit" and isinstance(settings.get("fal_model_edit"), str):
                    val = settings.get("fal_model_edit", "").strip()
                    if val:
                        logger.info(f"[FAL VIDEO MODEL CONFIG] Using fal_model_edit: {val}")
                        return val

            val = settings.get("fal_model")
            if isinstance(val, str):
                val = val.strip()
                if val:
                    logger.info(f"[FAL VIDEO MODEL CONFIG] Using fallback fal_model: {val}")
                    return val

            logger.debug(f"[FAL VIDEO MODEL CONFIG] No model found in config, will use default")
        except Exception as e:
            from core.utils.logger import logger
            logger.error(f"[FAL VIDEO MODEL CONFIG] Error reading config: {str(e)}")
        return None

    def _build_model_specific_payload_video(
        self,
        fal_model: str,
        prompt: str,
        *,
        duration_s: Optional[int] = None,
        aspect_ratio: Optional[str] = None,
        resolution: Optional[str] = None,
        fps: Optional[int] = None,
        negative_prompt: Optional[str] = None,
        cfg_scale: Optional[float] = None,
        init_video_url: Optional[str] = None,
        init_image_url: Optional[str] = None,
        strength: Optional[float] = None,
        extra_args: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """
        Build model-specific payload for Fal AI video operations.

        Examples:
        - fal-ai/kling-video/v2.5-turbo/pro/text-to-video expects:
          {
            "prompt": "...",
            "duration": "5",            # string
            "aspect_ratio": "16:9",
            "negative_prompt": "...",
            "cfg_scale": 0.5
          }

        - fal-ai/kling-video/v2.5-turbo/pro/image-to-video expects:
          {
            "prompt": "...",
            "image_url": "https://...",
            "duration": "5",            # string
            "negative_prompt": "...",
            "cfg_scale": 0.5
          }

        - Generic vid2vid:
          {
            "prompt": "...",
            "video_url": init_video_url,
            "strength": 0.7,
            "duration": 5,
            "aspect_ratio": "16:9",
            "fps": 24
          }

        - Generic img2vid:
          {
            "prompt": "...",
            "image_urls": [init_image_url],
            "duration": 5,
            "aspect_ratio": "16:9",
            "fps": 24
          }
        """
        args: Dict[str, Any] = {}
        model_lower = (fal_model or "").lower()

        # kling text-to-video
        if "kling-video" in model_lower and "text-to-video" in model_lower:
            args = {
                "prompt": prompt,
                "duration": str(duration_s or 5),
                "aspect_ratio": aspect_ratio or "16:9",
            }
            if negative_prompt:
                args["negative_prompt"] = negative_prompt
            if cfg_scale is not None:
                args["cfg_scale"] = cfg_scale
            # resolution/fps currently not required for this model, but allow override
            if resolution:
                args["resolution"] = resolution
            if fps is not None:
                args["fps"] = fps
            if extra_args:
                args.update(extra_args)
            return args

        # sora-2 text-to-video
        if "sora-2" in model_lower and "text-to-video" in model_lower:
            args = {
                "prompt": prompt,
                "duration": duration_s or 4,  # number, not string
                "resolution": resolution or "720p",
                "aspect_ratio": aspect_ratio or "16:9",
            }
            # Sora 2 doesn't use negative_prompt, cfg_scale, or fps typically, but allow override via extra_args
            if extra_args:
                args.update(extra_args)
            return args

        # kling image-to-video
        if "kling-video" in model_lower and "image-to-video" in model_lower:
            if not init_image_url:
                raise ValueError("kling image-to-video model requires init_image_url (image_url parameter)")
            args = {
                "prompt": prompt,
                "image_url": init_image_url,
                "duration": str(duration_s or 5),
            }
            if negative_prompt:
                args["negative_prompt"] = negative_prompt
            if cfg_scale is not None:
                args["cfg_scale"] = cfg_scale
            # aspect_ratio, resolution, fps not typically used for kling image-to-video, but allow override
            if aspect_ratio:
                args["aspect_ratio"] = aspect_ratio
            if resolution:
                args["resolution"] = resolution
            if fps is not None:
                args["fps"] = fps
            if extra_args:
                args.update(extra_args)
            return args

        # sora-2 image-to-video
        if "sora-2" in model_lower and "image-to-video" in model_lower:
            if not init_image_url:
                raise ValueError("sora-2 image-to-video model requires init_image_url (image_url parameter)")
            args = {
                "prompt": prompt,
                "image_url": init_image_url,
                "duration": duration_s or 4,  # number, not string
                "resolution": resolution or "auto",
                "aspect_ratio": aspect_ratio or "auto",
            }
            # Sora 2 doesn't use negative_prompt, cfg_scale, or fps typically, but allow override via extra_args
            if extra_args:
                args.update(extra_args)
            return args

        # Generic video-to-video
        if init_video_url:
            args = {
                "prompt": prompt,
                "video_url": init_video_url,
            }
            if strength is not None:
                args["strength"] = max(0.0, min(1.0, strength))
            if duration_s is not None:
                args["duration"] = duration_s
            if aspect_ratio:
                args["aspect_ratio"] = aspect_ratio
            if resolution:
                args["resolution"] = resolution
            if fps is not None:
                args["fps"] = fps
            if negative_prompt:
                args["negative_prompt"] = negative_prompt
            if cfg_scale is not None:
                args["cfg_scale"] = cfg_scale
            if extra_args:
                args.update(extra_args)
            return args

        # Generic image-to-video
        if init_image_url:
            args = {
                "prompt": prompt,
                "image_urls": [init_image_url],
            }
            if strength is not None:
                args["strength"] = max(0.0, min(1.0, strength))
            if duration_s is not None:
                args["duration"] = duration_s
            if aspect_ratio:
                args["aspect_ratio"] = aspect_ratio
            if resolution:
                args["resolution"] = resolution
            if fps is not None:
                args["fps"] = fps
            if negative_prompt:
                args["negative_prompt"] = negative_prompt
            if cfg_scale is not None:
                args["cfg_scale"] = cfg_scale
            if extra_args:
                args.update(extra_args)
            return args

        # Fallback: text-to-video generic
        args = {
            "prompt": prompt,
        }
        if duration_s is not None:
            args["duration"] = duration_s
        if aspect_ratio:
            args["aspect_ratio"] = aspect_ratio
        if resolution:
            args["resolution"] = resolution
        if fps is not None:
            args["fps"] = fps
        if negative_prompt:
            args["negative_prompt"] = negative_prompt
        if cfg_scale is not None:
            args["cfg_scale"] = cfg_scale
        if extra_args:
            args.update(extra_args)
        return args

    async def _fal_generate_video(
        self,
        *,
        prompt: str,
        fal_model: str,
        duration_s: int = 5,
        aspect_ratio: str = "16:9",
        resolution: Optional[str] = None,
        fps: Optional[int] = None,
        negative_prompt: Optional[str] = None,
        cfg_scale: Optional[float] = None,
        extra_args: Optional[Dict[str, Any]] = None,
    ) -> str | ToolResult:
        """Call Fal AI model for text-to-video generation and return video URL."""
        try:
            args = self._build_model_specific_payload_video(
                fal_model=fal_model,
                prompt=prompt,
                duration_s=duration_s,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                fps=fps,
                negative_prompt=negative_prompt,
                cfg_scale=cfg_scale,
                extra_args=extra_args,
            )
            handler = await asyncio.to_thread(submit, fal_model, arguments=args)
            result = await asyncio.to_thread(handler.get)
            url = self._extract_first_media_url(result)
            if not url:
                return self.fail_response("Fal AI did not return a video URL.")
            return url
        except Exception as e:
            return self.fail_response(f"Fal AI video generation failed: {str(e)}")

    async def _fal_edit_video(
        self,
        *,
        prompt: str,
        fal_model: str,
        init_video_url: Optional[str] = None,
        init_image_url: Optional[str] = None,
        duration_s: Optional[int] = None,
        aspect_ratio: Optional[str] = None,
        resolution: Optional[str] = None,
        fps: Optional[int] = None,
        strength: float = 0.7,
        negative_prompt: Optional[str] = None,
        cfg_scale: Optional[float] = None,
        extra_args: Optional[Dict[str, Any]] = None,
    ) -> str | ToolResult:
        """Call Fal AI model for video editing (vid2vid or img2vid) and return video URL."""
        try:
            args = self._build_model_specific_payload_video(
                fal_model=fal_model,
                prompt=prompt,
                init_video_url=init_video_url,
                init_image_url=init_image_url,
                duration_s=duration_s,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                fps=fps,
                strength=strength,
                negative_prompt=negative_prompt,
                cfg_scale=cfg_scale,
                extra_args=extra_args,
            )
            handler = await asyncio.to_thread(submit, fal_model, arguments=args)
            result = await asyncio.to_thread(handler.get)
            url = self._extract_first_media_url(result)
            if not url:
                return self.fail_response("Fal AI (video edit) did not return a video URL.")
            return url
        except Exception as e:
            return self.fail_response(f"Fal AI video edit failed: {str(e)}")

    async def _fal_upload_video_with_retry(self, video_bytes: bytes, max_retries: int = 3) -> str | ToolResult:
        """Upload video and wait for URL to become accessible with retry logic."""
        try:
            from core.utils.logger import logger

            logger.info(f"[FAL VIDEO UPLOAD] Starting upload of {len(video_bytes)} bytes to Fal AI")

            # Create temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                tmp.write(video_bytes)
                tmp.flush()
                tmp_path = tmp.name

            try:
                content_type = mimetypes.guess_type(tmp_path)[0] or "video/mp4"
                logger.debug(f"[FAL VIDEO UPLOAD] Uploading temp file: {tmp_path}")

                # Upload to Fal
                uploaded_url = await asyncio.to_thread(upload, tmp_path, content_type=content_type)
                logger.info(f"[FAL VIDEO UPLOAD] Upload complete. URL: {uploaded_url}")

                # Wait and verify URL is accessible
                for attempt in range(max_retries):
                    try:
                        logger.debug(f"[FAL VIDEO UPLOAD] Attempt {attempt + 1}/{max_retries}: Verifying URL accessibility...")
                        async with httpx.AsyncClient() as client:
                            response = await client.head(uploaded_url, timeout=10)
                            if response.status_code == 200:
                                logger.info(f"[FAL VIDEO UPLOAD] URL is accessible after {attempt + 1} attempts")
                                return uploaded_url
                    except Exception as e:
                        logger.debug(f"[FAL VIDEO UPLOAD] Attempt {attempt + 1} failed: {str(e)}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2)  # Wait 2 seconds before retry

                # If retries exhausted, return URL anyway (it might work)
                logger.warning(f"[FAL VIDEO UPLOAD] URL not verified but returning anyway: {uploaded_url}")
                return uploaded_url

            finally:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

        except Exception as e:
            from core.utils.logger import logger
            logger.error(f"[FAL VIDEO UPLOAD] Upload failed: {str(e)}")
            return self.fail_response(f"Fal upload failed: {str(e)}")

    async def _fal_upload_video(self, video_bytes: bytes) -> str | ToolResult:
        """Upload local bytes to Fal (legacy method - calls retry version)."""
        return await self._fal_upload_video_with_retry(video_bytes)

    def _extract_first_media_url(self, response: Any) -> Optional[str]:
        """
        Extract the first media URL from Fal response (works for video or image).
        Typical response shapes:
          - {'videos': [{'url': '...'}]}
          - {'video': {'url': '...'}}
          - {'images': [{'url': '...'}]}
          - {'output': [{'url': '...'}]}
          - Nested structures with 'url'/'signed_url'/'uri'
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

    def _video_metadata_path(self, video_path: str) -> str:
        """Return the metadata sidecar path for a given video path."""
        try:
            base, _ = os.path.splitext(video_path)
            return f"{base}.json"
        except Exception:
            if video_path.endswith(".mp4"):
                return video_path[:-4] + ".json"
            return video_path + ".json"

    async def _save_video_from_url(
        self,
        url: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        fps: Optional[int] = None,
        duration: Optional[float] = None,
    ) -> str | ToolResult:
        """
        Download video from a URL and save into /workspace/videos/ with random filename and a metadata JSON alongside.
        """
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, timeout=None)
                r.raise_for_status()
                data = r.content
                content_type = r.headers.get("content-type", "").lower()
        except Exception as e:
            return self.fail_response(f"Failed to fetch Fal video URL: {str(e)}")

        # Determine extension
        ext = ".mp4"
        try:
            if "webm" in content_type:
                ext = ".webm"
            elif "ogg" in content_type or "ogv" in content_type:
                ext = ".ogv"
            else:
                # Try infer from URL path
                path = urlparse(url).path
                _, path_ext = os.path.splitext(path)
                if path_ext.lower() in (".mp4", ".webm", ".ogv", ".mov", ".mkv"):
                    ext = path_ext.lower()
        except Exception:
            pass

        # Generate filename with dimensions if provided
        if width and height:
            random_filename = f"video_{width}x{height}_{uuid.uuid4().hex[:8]}{ext}"
        else:
            random_filename = f"video_{uuid.uuid4().hex[:8]}{ext}"

        full_path = f"{self.videos_dir}/{random_filename}"

        try:
            await self.sandbox.fs.upload_file(data, full_path)
        except Exception as e:
            return self.fail_response(f"Failed to save Fal video into sandbox: {str(e)}")

        # Write sidecar metadata with the original Fal URL so agents can reuse it later
        meta_filename = random_filename.replace(ext, ".json")
        meta_path = f"{self.videos_dir}/{meta_filename}"
        metadata = {
            "provider": "fal",
            "source_url": url,
            "saved_path": full_path,
            "dimensions": {"width": width, "height": height},
            "fps": fps,
            "duration": duration,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            await self.sandbox.fs.upload_file(json.dumps(metadata, indent=2).encode("utf-8"), meta_path)
        except Exception as e:
            # Not fatal if metadata fails, but report
            from core.utils.logger import logger
            logger.warning(f"[FAL VIDEO METADATA] Failed to write sidecar: {str(e)}")

        return full_path

    async def _read_video_metadata(self, video_path: str) -> Optional[dict]:
        """Read JSON metadata sidecar for a video. Returns dict or None if missing."""
        try:
            meta_path = self._video_metadata_path(video_path)
            data = await self.sandbox.fs.download_file(meta_path)
            return json.loads(data.decode("utf-8"))
        except Exception:
            return None

    async def _resolve_video_full_path(self, video_path: str) -> Optional[str]:
        """Resolve a path or filename to an absolute path inside the sandbox workspace."""
        try:
            cleaned = self.clean_path(video_path)
            # Already absolute within workspace
            if cleaned.startswith("/workspace/"):
                return cleaned
            # Root-absolute path (e.g., /videos/foo.mp4)
            if cleaned.startswith("/"):
                return f"{self.workspace_path}{cleaned}"
            # If includes 'videos/' treat as relative to workspace
            if "videos/" in cleaned:
                return f"{self.workspace_path}/{cleaned}"
            # Otherwise assume it's a filename under /workspace/videos
            return f"{self.videos_dir}/{cleaned}"
        except Exception:
            return None

    async def _get_video_bytes(self, video_path_or_url: str) -> bytes | ToolResult:
        """Get video bytes from URL or local file path."""
        if video_path_or_url.startswith(("http://", "https://")):
            return await self._download_video_from_url(video_path_or_url)
        else:
            return await self._read_video_from_sandbox(video_path_or_url)

    async def _download_video_from_url(self, url: str) -> bytes | ToolResult:
        """Download video from URL."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=None)
                response.raise_for_status()
                return response.content
        except Exception:
            return self.fail_response(f"Could not download video from URL: {url}")

    async def _read_video_from_sandbox(self, video_path: str) -> bytes | ToolResult:
        """Read video from sandbox filesystem with intelligent path handling."""
        try:
            from core.utils.logger import logger

            cleaned_path = self.clean_path(video_path)

            # Try multiple path variations to find the video
            possible_paths = [
                f"{self.workspace_path}/{cleaned_path}",  # Standard path
                f"{self.workspace_path}/videos/{cleaned_path}",  # Videos folder
                f"{self.videos_dir}/{cleaned_path}",  # Videos direct
            ]

            # If path already includes videos, don't duplicate
            if "videos/" in cleaned_path:
                possible_paths = [f"{self.workspace_path}/{cleaned_path}"]

            logger.debug(f"Searching for video: {video_path}")
            logger.debug(f"Cleaned path: {cleaned_path}")
            logger.debug(f"Trying paths: {possible_paths}")

            for full_path in possible_paths:
                try:
                    file_info = await self.sandbox.fs.get_file_info(full_path)
                    if file_info.is_dir:
                        continue

                    logger.debug(f"Found video at: {full_path}")
                    return await self.sandbox.fs.download_file(full_path)
                except Exception:
                    continue

            return self.fail_response(
                f"Could not find video file: {video_path}. Tried paths: {', '.join(possible_paths)}"
            )
        except Exception as e:
            return self.fail_response(
                f"Could not read video file from sandbox: {video_path} - {str(e)}"
            )
