from typing import Optional
from core.agentpress.tool import ToolResult, openapi_schema
from core.tools.fal_image_base import FalImageToolBase
from core.agentpress.thread_manager import ThreadManager
import httpx


class SandboxImageEditTool(FalImageToolBase):
    """
    Tool for generating or editing images using Fal AI models.
    
    Inherits all Fal AI functionality from FalImageToolBase.
    Provides simple image generation and editing without design enhancements.
    
    Use this for:
    - General image generation
    - Simple image editing
    - Artistic images without professional design requirements
    
    Notes:
    - Inherits from FalImageToolBase for all Fal AI operations
    - Saves images to /workspace/designs/ (shared with designer tool)
    - Returns structured data compatible with DesignerToolView
    """

    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_id, thread_manager)

    # Aliases for frontend capability separation
    async def generate_image(self, prompt: str, fal_model: str = "", image_size: str = "1024x1024", **kwargs) -> ToolResult:
        """Alias for image_edit_or_generate in 'generate' mode."""
        return await self.image_edit_or_generate(
            mode="generate",
            prompt=prompt,
            fal_model=fal_model,
            image_size=image_size,
            **kwargs
        )

    async def edit_image(self, prompt: str, image_path: str, fal_model: str = "", image_size: str = "1024x1024", strength: float = 0.7, **kwargs) -> ToolResult:
        """Alias for image_edit_or_generate in 'edit' mode."""
        return await self.image_edit_or_generate(
            mode="edit",
            prompt=prompt,
            image_path=image_path,
            fal_model=fal_model,
            image_size=image_size,
            strength=strength,
            **kwargs
        )

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
                            "description": "Fal model identifier to use (e.g., 'fal-ai/nano-banana', 'fal-ai/nano-banana/edit', 'fal-ai/stable-diffusion-xl'). If not provided, uses the model configured in agent settings."
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
            # Ensure sandbox and designs directory exist
            await self._ensure_designs_directory()

            # Check Fal AI availability (inherited method)
            fal_check = self._check_fal_availability()
            if fal_check:
                return fal_check

            # Resolve model to use (inherited method)
            # Treat empty string as no model specified
            model_from_param = fal_model.strip() if fal_model else ""
            model_from_config = self._get_default_fal_model(mode) or ""
            model_to_use = model_from_param or model_from_config
            
            from core.utils.logger import logger
            logger.info(f"[IMAGE TOOL] Mode: {mode}, Model from param: '{model_from_param}', Model from config: '{model_from_config}', Final model: '{model_to_use}'")
            
            # Require model configuration - no default fallback
            if not model_to_use:
                return self.fail_response(
                    f"No Fal AI model configured for mode '{mode}'. Please configure 'fal_model_{mode}' in agent settings under Tools > Image > Individual Capabilities, "
                    f"or pass a model via the fal_model parameter."
                )

            if mode == "generate":
                # Prompt-only generation (inherited method)
                image_url = await self._fal_generate_image(
                    prompt=prompt, fal_model=model_to_use, image_size=image_size
                )
                if isinstance(image_url, ToolResult):
                    return image_url

                # Save image (inherited method)
                full_path = await self._save_image_from_url(image_url)
                if isinstance(full_path, ToolResult):
                    return full_path

                # Build response
                relative_path = full_path.replace("/workspace/", "") if full_path.startswith("/workspace/") else full_path
                sandbox_file_url = f"/api/sandboxes/{self.sandbox_id}/files?path={relative_path}"

                return self.success_response({
                    "success": True,
                    "design_path": full_path,
                    "design_url": sandbox_file_url,
                    "sandbox_id": self.sandbox_id,
                    "mode": "generate",
                    "model": model_to_use,
                    "fal_image_url": image_url,  # Store original Fal URL for editing
                    "message": f"Successfully generated image using Fal model '{model_to_use}'. Image saved at: {full_path}. Use fal_image_url for edits."
                })

            elif mode == "edit":
                # Img2img: need initial image
                if not image_path:
                    return self.fail_response("'image_path' is required for edit mode.")

                from core.utils.logger import logger
                logger.info(f"[IMAGE EDIT] Starting edit with image_path: {image_path}")

                # Determine initial image URL for editing
                if image_path.startswith(("http://", "https://")):
                    logger.info(f"[IMAGE EDIT] Using provided URL: {image_path}")
                    init_image_url = image_path
                else:
                    # Try to reuse stored Fal source URL from sidecar metadata
                    resolved_path = await self._resolve_design_full_path(image_path) or image_path
                    meta = await self._read_design_metadata(resolved_path)
                    if meta and isinstance(meta.get("source_url"), str) and meta["source_url"].startswith("http"):
                        init_image_url = meta["source_url"]
                        logger.info(f"[IMAGE EDIT] Reusing source_url from metadata: {init_image_url}")
                    else:
                        # Fallback: upload the local image to Fal to obtain a temporary URL
                        logger.info(f"[IMAGE EDIT] Uploading local image for edit...")
                        image_bytes = await self._get_image_bytes(image_path)
                        if isinstance(image_bytes, ToolResult):
                            return image_bytes
                        uploaded_url_or_err = await self._fal_upload_image(image_bytes)
                        if isinstance(uploaded_url_or_err, ToolResult):
                            return uploaded_url_or_err
                        init_image_url = uploaded_url_or_err
                        logger.info(f"[IMAGE EDIT] Uploaded image. URL: {init_image_url}")

                logger.info(f"[IMAGE EDIT] Calling Fal model '{model_to_use}' for edit with URL: {init_image_url}")

                # Edit image (inherited method) - uses model-specific payload
                image_url = await self._fal_edit_image(
                    prompt=prompt,
                    fal_model=model_to_use,
                    init_image_url=init_image_url,
                    image_size=image_size,
                    strength=strength,
                )
                if isinstance(image_url, ToolResult):
                    return image_url
                
                logger.info(f"[IMAGE EDIT] Received edited image URL from Fal: {image_url}")

                # Save result (inherited method)
                full_path = await self._save_image_from_url(image_url)
                if isinstance(full_path, ToolResult):
                    return full_path
                
                logger.info(f"[IMAGE EDIT] Saved edited image to: {full_path}")

                # Build response
                relative_path = full_path.replace("/workspace/", "") if full_path.startswith("/workspace/") else full_path
                sandbox_file_url = f"/api/sandboxes/{self.sandbox_id}/files?path={relative_path}"

                return self.success_response({
                    "success": True,
                    "design_path": full_path,
                    "design_url": sandbox_file_url,
                    "sandbox_id": self.sandbox_id,
                    "mode": "edit",
                    "model": model_to_use,
                    "original_image": image_path,
                    "fal_init_image_url": init_image_url,
                    "fal_image_url": image_url,
                    "message": f"Successfully edited image with Fal model '{model_to_use}'. Image saved at: {full_path}"
                })
            else:
                return self.fail_response("Invalid mode. Use 'generate' or 'edit'.")

        except Exception as e:
            return self.fail_response(
                f"An error occurred during Fal AI image generation/editing: {str(e)}"
            )
