from typing import Optional, Dict, Any
from core.agentpress.tool import ToolResult, openapi_schema
from core.tools.fal_video_base import FalVideoToolBase
from core.agentpress.thread_manager import ThreadManager


class SandboxVideoTool(FalVideoToolBase):
    """
    Tool for generating or editing videos using Fal AI models.

    Inherits all Fal AI functionality from FalVideoToolBase.
    Provides video generation (text-to-video) and video editing (vid2vid; optional img2vid if URL provided).

    Notes:
    - Saves videos to /workspace/videos/
    - Returns structured data compatible with a dedicated VideoToolView
    """

    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_id, thread_manager)

    # Aliases for frontend capability separation
    async def generate_video(
        self,
        prompt: str,
        fal_model: str = "",
        duration_s: int = 5,
        aspect_ratio: str = "16:9",
        resolution: Optional[str] = None,
        fps: Optional[int] = None,
        negative_prompt: Optional[str] = None,
        cfg_scale: Optional[float] = None,
        extra_args: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> ToolResult:
        """Alias for video_generate_or_edit in 'generate' mode."""
        return await self.video_generate_or_edit(
            mode="generate",
            prompt=prompt,
            fal_model=fal_model,
            duration_s=duration_s,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            fps=fps,
            negative_prompt=negative_prompt,
            cfg_scale=cfg_scale,
            extra_args=extra_args or {},
            **kwargs,
        )

    async def edit_video(
        self,
        prompt: str,
        video_path: Optional[str] = None,
        image_path: Optional[str] = None,
        fal_model: str = "",
        strength: float = 0.7,
        duration_s: Optional[int] = None,
        aspect_ratio: Optional[str] = None,
        resolution: Optional[str] = None,
        fps: Optional[int] = None,
        negative_prompt: Optional[str] = None,
        cfg_scale: Optional[float] = None,
        extra_args: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> ToolResult:
        """Alias for video_generate_or_edit in 'edit' mode."""
        return await self.video_generate_or_edit(
            mode="edit",
            prompt=prompt,
            video_path=video_path,
            image_path=image_path,
            fal_model=fal_model,
            strength=strength,
            duration_s=duration_s,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            fps=fps,
            negative_prompt=negative_prompt,
            cfg_scale=cfg_scale,
            extra_args=extra_args or {},
            **kwargs,
        )

    @openapi_schema(
        {
            "type": "function",
            "function": {
                "name": "video_generate_or_edit",
                "description": "Generate a new video from a prompt (text-to-video) or edit an existing video (vid2vid) using Fal AI models. Stores the result in the thread context.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "mode": {
                            "type": "string",
                            "enum": ["generate", "edit"],
                            "description": "'generate' to create a new video from a prompt, 'edit' to edit an existing video (vid2vid).",
                        },
                        "prompt": {
                            "type": "string",
                            "description": "Text prompt describing the desired video or edit.",
                        },
                        "video_path": {
                            "type": "string",
                            "description": "(edit mode) Path to the video file to edit, or a full URL to a video. If local path is provided and no Fal sidecar metadata exists, the file will be uploaded to Fal to obtain a temporary URL.",
                        },
                        "image_path": {
                            "type": "string",
                            "description": "(edit mode, optional) URL to an image to drive an image-to-video operation for models that support it. Currently, only URL is supported here.",
                        },
                        "fal_model": {
                            "type": "string",
                            "description": "Fal model identifier to use (e.g., 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video'). If not provided, uses the model configured in agent settings.",
                        },
                        "duration_s": {
                            "type": "number",
                            "description": "Requested output duration in seconds when applicable (default: 5). Some models expect a string (the tool handles conversion when needed).",
                            "default": 5
                        },
                        "aspect_ratio": {
                            "type": "string",
                            "description": "Desired aspect ratio when applicable (e.g., '16:9', '9:16', '1:1').",
                            "default": "16:9"
                        },
                        "resolution": {
                            "type": "string",
                            "description": "Optional resolution (e.g., '1280x720'). Some models may ignore this in favor of aspect_ratio.",
                        },
                        "fps": {
                            "type": "number",
                            "description": "Optional frames per second (e.g., 24, 30).",
                        },
                        "strength": {
                            "type": "number",
                            "description": "(edit mode) Edit strength (0..1). Higher means closer to prompt, lower stays closer to source.",
                            "default": 0.7
                        },
                        "negative_prompt": {
                            "type": "string",
                            "description": "Negative prompt to steer the model away from unwanted elements.",
                        },
                        "cfg_scale": {
                            "type": "number",
                            "description": "CFG scale / guidance parameter when supported by the model.",
                        },
                        "extra_args": {
                            "type": "object",
                            "description": "Additional model-specific arguments pass-through.",
                        }
                    },
                    "required": ["mode", "prompt"],
                },
            },
        }
    )
    async def video_generate_or_edit(
        self,
        mode: str,
        prompt: str,
        video_path: Optional[str] = None,
        image_path: Optional[str] = None,
        fal_model: str = "",
        duration_s: int = 5,
        aspect_ratio: str = "16:9",
        resolution: Optional[str] = None,
        fps: Optional[int] = None,
        strength: float = 0.7,
        negative_prompt: Optional[str] = None,
        cfg_scale: Optional[float] = None,
        extra_args: Optional[Dict[str, Any]] = None,
    ) -> ToolResult:
        """Generate or edit videos using Fal AI models."""
        try:
            # Ensure sandbox and videos directory exist
            await self._ensure_videos_directory()

            # Check Fal AI availability
            fal_check = self._check_fal_availability()
            if fal_check:
                return fal_check

            # Resolve model to use
            model_from_param = fal_model.strip() if fal_model else ""
            model_from_config = self._get_default_fal_model(mode, "sb_video_tool") or ""
            model_to_use = model_from_param or model_from_config

            from core.utils.logger import logger
            logger.info(f"[VIDEO TOOL] Mode: {mode}, Model from param: '{model_from_param}', Model from config: '{model_from_config}', Final model: '{model_to_use}'")

            if not model_to_use:
                return self.fail_response(
                    f"No Fal AI model configured for mode '{mode}'. Please configure 'fal_model_{'generate' if mode=='generate' else 'edit'}' in agent settings under Tools > Video > Individual Capabilities, "
                    f"or pass a model via the fal_model parameter."
                )

            if mode == "generate":
                # Text-to-video generation
                video_url = await self._fal_generate_video(
                    prompt=prompt,
                    fal_model=model_to_use,
                    duration_s=duration_s,
                    aspect_ratio=aspect_ratio,
                    resolution=resolution,
                    fps=fps,
                    negative_prompt=negative_prompt,
                    cfg_scale=cfg_scale,
                    extra_args=extra_args or {},
                )
                if isinstance(video_url, ToolResult):
                    return video_url

                # Save video
                full_path = await self._save_video_from_url(video_url)
                if isinstance(full_path, ToolResult):
                    return full_path

                relative_path = full_path.replace("/workspace/", "") if full_path.startswith("/workspace/") else full_path
                sandbox_file_url = f"/api/sandboxes/{self.sandbox_id}/files?path={relative_path}"

                return self.success_response({
                    "success": True,
                    "video_path": full_path,
                    "video_url": sandbox_file_url,
                    "sandbox_id": self.sandbox_id,
                    "mode": "generate",
                    "model": model_to_use,
                    "fal_video_url": video_url,
                    "message": f"Successfully generated video using Fal model '{model_to_use}'. Video saved at: {full_path}. Use fal_video_url for further processing."
                })

            elif mode == "edit":
                # Require a source
                if not video_path and not image_path:
                    return self.fail_response("For edit mode, provide 'video_path' (preferred) or an 'image_path' (URL only) for img2vid when supported by the chosen model.")

                init_video_url = None
                init_image_url = None

                # If video_path is provided, resolve vid2vid init URL
                if video_path:
                    if video_path.startswith(("http://", "https://")):
                        logger.info(f"[VIDEO EDIT] Using provided video URL: {video_path}")
                        init_video_url = video_path
                    else:
                        # Try to reuse stored Fal source URL from sidecar metadata
                        resolved_path = await self._resolve_video_full_path(video_path) or video_path
                        meta = await self._read_video_metadata(resolved_path)
                        if meta and isinstance(meta.get("source_url"), str) and meta["source_url"].startswith("http"):
                            init_video_url = meta["source_url"]
                            logger.info(f"[VIDEO EDIT] Reusing source_url from metadata: {init_video_url}")
                        else:
                            # Fallback: upload the local video to Fal to obtain a temporary URL
                            logger.info(f"[VIDEO EDIT] Uploading local video for edit...")
                            video_bytes = await self._get_video_bytes(video_path)
                            if isinstance(video_bytes, ToolResult):
                                return video_bytes
                            uploaded_url_or_err = await self._fal_upload_video(video_bytes)
                            if isinstance(uploaded_url_or_err, ToolResult):
                                return uploaded_url_or_err
                            init_video_url = uploaded_url_or_err
                            logger.info(f"[VIDEO EDIT] Uploaded video. URL: {init_video_url}")

                # If image_path is provided and model supports img2vid; currently only URL is supported here
                if image_path and image_path.startswith(("http://", "https://")):
                    init_image_url = image_path
                elif image_path:
                    logger.warning("[VIDEO EDIT] image_path provided but not a URL. Local image-to-video upload is not supported yet in this tool.")

                # Call Fal for edit
                edited_video_url = await self._fal_edit_video(
                    prompt=prompt,
                    fal_model=model_to_use,
                    init_video_url=init_video_url,
                    init_image_url=init_image_url,
                    duration_s=duration_s,
                    aspect_ratio=aspect_ratio,
                    resolution=resolution,
                    fps=fps,
                    strength=strength,
                    negative_prompt=negative_prompt,
                    cfg_scale=cfg_scale,
                    extra_args=extra_args or {},
                )
                if isinstance(edited_video_url, ToolResult):
                    return edited_video_url

                # Save result
                full_path = await self._save_video_from_url(edited_video_url)
                if isinstance(full_path, ToolResult):
                    return full_path

                relative_path = full_path.replace("/workspace/", "") if full_path.startswith("/workspace/") else full_path
                sandbox_file_url = f"/api/sandboxes/{self.sandbox_id}/files?path={relative_path}"

                return self.success_response({
                    "success": True,
                    "video_path": full_path,
                    "video_url": sandbox_file_url,
                    "sandbox_id": self.sandbox_id,
                    "mode": "edit",
                    "model": model_to_use,
                    "original_video": video_path,
                    "original_image": image_path,
                    "fal_init_video_url": init_video_url,
                    "fal_init_image_url": init_image_url,
                    "fal_video_url": edited_video_url,
                    "message": f"Successfully edited video with Fal model '{model_to_use}'. Video saved at: {full_path}"
                })

            else:
                return self.fail_response("Invalid mode. Use 'generate' or 'edit'.")

        except Exception as e:
            return self.fail_response(
                f"An error occurred during Fal AI video generation/editing: {str(e)}"
            )
