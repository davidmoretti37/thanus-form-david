from typing import Optional, Any
from core.agentpress.tool import ToolResult, openapi_schema, usage_example
from core.sandbox.tool_base import SandboxToolsBase
from core.agentpress.thread_manager import ThreadManager
import httpx
from io import BytesIO
import uuid
import os
import asyncio
import tempfile

# FAL AI client (requires dependency: fal-client; env var FAL_KEY must be set)
# Usage is synchronous; we wrap calls with asyncio.to_thread to avoid blocking.
try:
    from fal_client import submit, upload
    _FAL_AVAILABLE = True
except Exception:
    _FAL_AVAILABLE = False


class SandboxImageEditTool(SandboxToolsBase):
    """
    Tool for generating or editing images using Fal AI models.

    This replaces the previous GPT Image 1 integration and routes generation/edit
    to Fal AI models via fal-client. It supports:
    - Generate: prompt-only image generation
    - Edit (img2img): uses an initial image (URL or /workspace path) plus prompt

    Notes:
    - Requires env var FAL_KEY to be configured (already present in backend/.env).
    - Depends on package 'fal-client' in backend/pyproject.toml.
    - Saves the resulting PNG into the sandbox /workspace and returns the filename.
    """

    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self.thread_id = thread_id
        self.thread_manager = thread_manager

    @openapi_schema(
        {
            "type": "function",
            "function": {
                "name": "image_edit_or_generate",
                "description": "Generate a new image from a prompt, or edit an existing image (img2img) using Fal AI models (fal.ai). Stores the result in the thread context.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "mode": {
                            "type": "string",
                            "enum": ["generate", "edit"],
                            "description": "'generate' to create a new image from a prompt, 'edit' to edit an existing image (img2img).",
                        },
                        "prompt": {
                            "type": "string",
                            "description": "Text prompt describing the desired image or edit.",
                        },
                        "image_path": {
                            "type": "string",
                            "description": "(edit mode only) Path to the image file to edit. Can be: 1) Relative path to /workspace (e.g., 'generated_image_abc123.png'), or 2) Full URL (e.g., 'https://example.com/image.png'). Required when mode='edit'.",
                        },
                        "fal_model": {
                            "type": "string",
                            "description": "Fal model identifier to use (e.g., 'fal-ai/flux-pro', 'fal-ai/stable-diffusion-xl').",
                            "default": "fal-ai/flux-pro"
                        },
                        "image_size": {
                            "type": "string",
                            "description": "Requested output size. Accepted by many Fal models as 'image_size' (e.g., '1024x1024').",
                            "default": "1024x1024"
                        },
                        "strength": {
                            "type": "number",
                            "description": "(edit mode) Strength for img2img (0..1). Higher means closer to prompt, lower stays closer to source image.",
                            "default": 0.7
                        }
                    },
                    "required": ["mode", "prompt"],
                },
            },
        }
    )
    @usage_example("""
        Generate mode example (Fal AI):
        <function_calls>
        <invoke name="image_edit_or_generate">
        <parameter name="mode">generate</parameter>
        <parameter name="prompt">A futuristic cityscape at sunset, ultra-detailed</parameter>
        <parameter name="fal_model">fal-ai/flux-pro</parameter>
        </invoke>
        </function_calls>
        
        Edit mode example (Fal AI img2img):
        <function_calls>
        <invoke name="image_edit_or_generate">
        <parameter name="mode">edit</parameter>
        <parameter name="prompt">Add a red hat to the person in the image</parameter>
        <parameter name="image_path">generated_image_abc123.png</parameter>
        <parameter name="fal_model">fal-ai/stable-diffusion-xl</parameter>
        <parameter name="strength">0.6</parameter>
        </invoke>
        </function_calls>
        """)
    async def image_edit_or_generate(
        self,
        mode: str,
        prompt: str,
        image_path: Optional[str] = None,
        fal_model: str = "",
        image_size: str = "1024x1024",
        strength: float = 0.7,
    ) -> ToolResult:
        """Generate or edit images using Fal AI models."""
        try:
            # Ensure sandbox can save files
            await self._ensure_sandbox()

            # Check Fal SDK availability and API key
            if not _FAL_AVAILABLE:
                return self.fail_response(
                    "Fal client not available. Please ensure 'fal-client' is installed in backend and restart the server."
                )
            if not os.getenv("FAL_KEY"):
                return self.fail_response(
                    "FAL_KEY was not found in environment. Please set FAL_KEY in backend/.env and restart the server."
                )

            # Resolve model to use: explicit param > agent config default (per mode) > hard default
            model_to_use = fal_model or self._get_default_fal_model(mode) or "fal-ai/flux-pro"

            if mode == "generate":
                # Prompt-only generation
                image_url = await self._fal_generate_image(
                    prompt=prompt, fal_model=model_to_use, image_size=image_size
                )
                if isinstance(image_url, ToolResult):
                    return image_url

                image_filename = await self._save_image_from_url(image_url)
                if isinstance(image_filename, ToolResult):
                    return image_filename

                return self.success_response(
                    f"Successfully generated image using Fal model '{model_to_use}'. Image saved as: {image_filename}. You can use the ask tool to display the image."
                )

            elif mode == "edit":
                # Img2img: need initial image
                if not image_path:
                    return self.fail_response("'image_path' is required for edit mode.")

                # Get bytes from URL or /workspace, upload to Fal, then run img2img
                image_bytes = await self._get_image_bytes(image_path)
                if isinstance(image_bytes, ToolResult):
                    return image_bytes

                init_image_url = await self._fal_upload_image(image_bytes)
                if isinstance(init_image_url, ToolResult):
                    return init_image_url

                image_url = await self._fal_edit_image(
                    prompt=prompt,
                    fal_model=model_to_use,
                    init_image_url=init_image_url,
                    image_size=image_size,
                    strength=strength,
                )
                if isinstance(image_url, ToolResult):
                    return image_url

                image_filename = await self._save_image_from_url(image_url)
                if isinstance(image_filename, ToolResult):
                    return image_filename

                return self.success_response(
                    f"Successfully edited image with Fal model '{model_to_use}'. Image saved as: {image_filename}. You can use the ask tool to display the image."
                )
            else:
                return self.fail_response("Invalid mode. Use 'generate' or 'edit'.")

        except Exception as e:
            return self.fail_response(
                f"An error occurred during Fal AI image generation/editing: {str(e)}"
            )

    def _get_default_fal_model(self, mode: Optional[str] = None) -> Optional[str]:
        """
        Read default Fal model from the agent configuration if set in frontend.

        Supported keys in settings:
          - fal_model_generate: model for 'generate' mode
          - fal_model_edit:     model for 'edit' (img2img) mode
          - fal_model:          legacy default (used when specific one is missing)
        Path:
          thread_manager.agent_config.agentpress_tools.sb_image_edit_tool.settings
        """
        try:
            cfg = getattr(self.thread_manager, "agent_config", None) or {}
            tools_cfg = (cfg.get("agentpress_tools") or cfg.get("agentpress") or {})
            tool_cfg = tools_cfg.get("sb_image_edit_tool") or {}
            settings = tool_cfg.get("settings") or {}

            # Prefer per-mode setting if provided
            if isinstance(mode, str):
                if mode == "generate" and isinstance(settings.get("fal_model_generate"), str):
                    val = settings.get("fal_model_generate", "").strip()
                    if val:
                        return val
                if mode == "edit" and isinstance(settings.get("fal_model_edit"), str):
                    val = settings.get("fal_model_edit", "").strip()
                    if val:
                        return val

            # Fallback to legacy single-model setting
            val = settings.get("fal_model")
            if isinstance(val, str):
                val = val.strip()
                if val:
                    return val
        except Exception:
            pass
        return None

    # ---------- Fal helpers ----------

    async def _fal_generate_image(
        self, prompt: str, fal_model: str, image_size: str = "1024x1024"
    ) -> str | ToolResult:
        """Call Fal AI model for pure text-to-image generation and return image URL."""
        try:
            # Some Fal models accept different argument keys. We provide common ones.
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
            # Many Fal img2img endpoints accept 'image_url' and 'strength'.
            args = {
                "prompt": prompt,
                "image_url": init_image_url,
                "strength": max(0.0, min(1.0, strength)),
                "image_size": image_size,
                "num_images": 1,
            }
            handler = await asyncio.to_thread(submit, fal_model, arguments=args)
            result = await asyncio.to_thread(handler.get)
            url = self._extract_first_image_url(result)
            if not url:
                return self.fail_response("Fal AI (edit) did not return an image URL.")
            return url
        except Exception as e:
            return self.fail_response(f"Fal AI edit failed: {str(e)}")

    async def _fal_upload_image(self, image_bytes: bytes) -> str | ToolResult:
        """
        Upload local bytes to Fal to obtain a temporary URL usable in arguments.
        """
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                tmp.write(image_bytes)
                tmp.flush()
                tmp_path = tmp.name

            try:
                uploaded_url = await asyncio.to_thread(upload, tmp_path)
            finally:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

            if not uploaded_url or not isinstance(uploaded_url, str):
                return self.fail_response("Failed to upload image to Fal.")
            return uploaded_url
        except Exception as e:
            return self.fail_response(f"Fal upload failed: {str(e)}")

    def _extract_first_image_url(self, response: Any) -> Optional[str]:
        """
        Try to extract the first image URL from Fal response, being defensive across models.
        Typical shapes:
          - {'images': [{'url': '...'}]}
          - {'image': {'url': '...'}}
          - {'output': [{'url': '...'}]}
        """
        # Depth-first search for a value that looks like an http(s) URL
        def _dfs(obj: Any) -> Optional[str]:
            if isinstance(obj, dict):
                # Try common keys first
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

    async def _save_image_from_url(self, url: str) -> str | ToolResult:
        """Download image from a URL and save into /workspace with random filename."""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, timeout=60)
                r.raise_for_status()
                data = r.content

            random_filename = f"generated_image_{uuid.uuid4().hex[:8]}.png"
            sandbox_path = f"{self.workspace_path}/{random_filename}"
            await self.sandbox.fs.upload_file(data, sandbox_path)
            return random_filename
        except Exception as e:
            return self.fail_response(f"Failed to download and save Fal image: {str(e)}")

    # ---------- Existing helpers for input handling ----------

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
        """Read image from sandbox filesystem."""
        try:
            cleaned_path = self.clean_path(image_path)
            full_path = f"{self.workspace_path}/{cleaned_path}"

            # Check if file exists and is not a directory
            file_info = await self.sandbox.fs.get_file_info(full_path)
            if file_info.is_dir:
                return self.fail_response(
                    f"Path '{cleaned_path}' is a directory, not an image file."
                )

            return await self.sandbox.fs.download_file(full_path)

        except Exception as e:
            return self.fail_response(
                f"Could not read image file from sandbox: {image_path} - {str(e)}"
            )
