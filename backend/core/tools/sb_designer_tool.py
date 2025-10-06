from typing import Optional
from core.agentpress.tool import ToolResult, openapi_schema
from core.sandbox.tool_base import SandboxToolsBase
from core.agentpress.thread_manager import ThreadManager
import httpx
import uuid
import os
import asyncio
import tempfile

# Fal AI client (requires dependency: fal-client; env var FAL_KEY must be set)
try:
    from fal_client import submit, upload
    _FAL_AVAILABLE = True
except Exception:
    _FAL_AVAILABLE = False


class SandboxDesignerTool(SandboxToolsBase):
    """
    Professional design tool migrated to Fal AI for image generation and editing.
    This replaces previous usage of OpenAI gpt-image-1 in this tool.

    Notes:
    - Requires env var FAL_KEY configured (backend/.env already includes this key).
    - Relies on 'fal-client' (present in backend/pyproject.toml).
    - Saves resulting PNGs under /workspace/designs and returns sandbox URL for viewing.
    """

    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)
        self.thread_id = thread_id
        self.thread_manager = thread_manager
        self.designs_dir = "/workspace/designs"

        self.social_media_sizes = {
            "instagram_square": (1080, 1080),
            "instagram_portrait": (1080, 1350),
            "instagram_story": (1080, 1920),
            "instagram_landscape": (1080, 566),
            "facebook_post": (1200, 630),
            "facebook_cover": (1640, 859),
            "facebook_story": (1080, 1920),
            "twitter_post": (1024, 512),
            "twitter_header": (1500, 500),
            "linkedin_post": (1200, 627),
            "linkedin_banner": (1584, 396),
            "linkedin_article": (1280, 1920),
            "youtube_thumbnail": (1280, 720),
            "youtube_banner": (2560, 1440),
            "pinterest_pin": (1000, 1500),
            "pinterest_square": (1000, 1000),
            "tiktok_video": (1080, 1920),
            "whatsapp_status": (1080, 1920),
            "google_ads_square": (250, 250),
            "google_ads_medium": (300, 250),
            "google_ads_large": (336, 280),
            "google_ads_banner": (728, 90),
            "google_ads_leaderboard": (970, 250),
            "google_ads_skyscraper": (160, 600),
            "facebook_ads_feed": (1080, 1080),
            "facebook_ads_story": (1080, 1920),
            "display_ad_billboard": (970, 250),
            "display_ad_square": (300, 300),
            "display_ad_vertical": (300, 600),
            "email_header": (600, 200),
            "blog_header": (1920, 1080),
            "presentation_16_9": (1920, 1080),
            "presentation_4_3": (1024, 768),
            "business_card": (1050, 600),
            "flyer_a4": (2480, 3508),
            "poster_a3": (3508, 4961),
        }

    async def _ensure_designs_directory(self):
        await self._ensure_sandbox()
        try:
            await self.sandbox.fs.make_dir(self.designs_dir)
        except Exception:
            # ignore if exists
            pass

    @openapi_schema(
        {
            "type": "function",
            "function": {
                "name": "designer_create_or_edit",
                "description": "Professional design tool for creating or editing high-quality graphics optimized for social media, advertising, and professional use. Automatically applies professional design principles for text placement, visual hierarchy, and composition.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "mode": {
                            "type": "string",
                            "enum": ["create", "edit"],
                            "description": "'create' for new designs from scratch, 'edit' to modify existing designs.",
                        },
                        "prompt": {
                            "type": "string",
                            "description": "Professional design prompt. The AI will automatically apply design principles like: rule of thirds, golden ratio, proper text hierarchy, contrast ratios, safe zones for text, and professional typography. Be specific about content and brand style.",
                        },
                        "platform_preset": {
                            "type": "string",
                            "enum": ["instagram_square", "instagram_portrait", "instagram_story", "instagram_landscape", "facebook_post", "facebook_cover", "facebook_story", "twitter_post", "twitter_header", "linkedin_post", "linkedin_banner", "linkedin_article", "youtube_thumbnail", "youtube_banner", "pinterest_pin", "pinterest_square", "tiktok_video", "whatsapp_status", "google_ads_square", "google_ads_medium", "google_ads_large", "google_ads_banner", "google_ads_leaderboard", "google_ads_skyscraper", "facebook_ads_feed", "facebook_ads_story", "display_ad_billboard", "display_ad_square", "display_ad_vertical", "email_header", "blog_header", "presentation_16_9", "presentation_4_3", "business_card", "flyer_a4", "poster_a3", "custom"],
                            "description": "Platform-specific size preset for optimal dimensions. Choose 'custom' to specify width/height manually. Each preset is optimized for its platform's requirements.",
                        },
                        "width": {
                            "type": "integer",
                            "description": "Custom width in pixels (only used if platform_preset is 'custom'). Range: 256-4096px",
                            "minimum": 256,
                            "maximum": 4096,
                        },
                        "height": {
                            "type": "integer",
                            "description": "Custom height in pixels (only used if platform_preset is 'custom'). Range: 256-4096px",
                            "minimum": 256,
                            "maximum": 4096,
                        },
                        "design_style": {
                            "type": "string",
                            "enum": ["modern", "minimalist", "material", "glassmorphism", "neomorphism", "flat", "skeuomorphic", "organic", "geometric", "abstract", "professional", "playful", "luxury", "tech", "vintage", "bold"],
                            "description": "Visual style preset that enhances the design with specific aesthetic principles.",
                        },
                        "image_path": {
                            "type": "string",
                            "description": "(edit mode only) Path to the design file to edit. Supports workspace files or URLs.",
                        },
                        "quality": {
                            "type": "string",
                            "enum": ["low", "medium", "high", "auto"],
                            "description": "Output quality. 'high' for best quality, 'auto' to let model decide. Default: 'auto'",
                        },
                    },
                    "required": ["mode", "prompt", "platform_preset"],
                },
            },
        }
    )
    async def designer_create_or_edit(
        self,
        mode: str,
        prompt: str,
        platform_preset: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        design_style: Optional[str] = None,
        image_path: Optional[str] = None,
        quality: str = "auto",
    ) -> ToolResult:
        try:
            await self._ensure_designs_directory()

            # Resolve dimensions
            if platform_preset == "custom":
                if width is None or height is None:
                    return self.fail_response("Width and height are required when using 'custom' platform preset.")
                actual_width, actual_height = width, height
            else:
                if platform_preset not in self.social_media_sizes:
                    return self.fail_response(f"Invalid platform preset: {platform_preset}")
                actual_width, actual_height = self.social_media_sizes[platform_preset]

            enhanced_prompt = self._enhance_design_prompt(prompt, design_style, platform_preset, actual_width, actual_height)

            # Fal settings
            if not _FAL_AVAILABLE:
                return self.fail_response("Fal client not available. Please ensure 'fal-client' is installed and restart the server.")
            if not os.getenv("FAL_KEY"):
                return self.fail_response("FAL_KEY was not found in environment. Please set FAL_KEY in backend/.env and restart the server.")

            image_size = f"{max(256, min(4096, actual_width))}x{max(256, min(4096, actual_height))}"
            default_strength = 0.7
            model_to_use = self._get_default_fal_model("create" if mode == "create" else "edit") or "fal-ai/flux-pro"

            if mode == "create":
                # Prompt-only generation with Fal
                image_url_or_err = await self._fal_generate_image(
                    prompt=enhanced_prompt, fal_model=model_to_use, image_size=image_size
                )
                if isinstance(image_url_or_err, ToolResult):
                    return image_url_or_err
                design_path_or_err = await self._save_design_from_url(image_url_or_err, actual_width, actual_height)
                if isinstance(design_path_or_err, ToolResult):
                    return design_path_or_err
                design_path = design_path_or_err

            elif mode == "edit":
                # Img2img with Fal
                if not image_path:
                    return self.fail_response("'image_path' is required for edit mode.")

                image_bytes = await self._get_image_bytes(image_path)
                if isinstance(image_bytes, ToolResult):
                    return image_bytes

                init_image_url_or_err = await self._fal_upload_image(image_bytes)
                if isinstance(init_image_url_or_err, ToolResult):
                    return init_image_url_or_err
                init_image_url = init_image_url_or_err

                image_url_or_err = await self._fal_edit_image(
                    prompt=enhanced_prompt,
                    fal_model=model_to_use,
                    init_image_url=init_image_url,
                    image_size=image_size,
                    strength=default_strength,
                )
                if isinstance(image_url_or_err, ToolResult):
                    return image_url_or_err

                design_path_or_err = await self._save_design_from_url(image_url_or_err, actual_width, actual_height)
                if isinstance(design_path_or_err, ToolResult):
                    return design_path_or_err
                design_path = design_path_or_err
            else:
                return self.fail_response("Invalid mode. Use 'create' or 'edit'.")

            # Build response and sandbox URL
            dimensions_text = f"{actual_width}x{actual_height}px"
            platform_text = f" for {platform_preset.replace('_', ' ').title()}" if platform_preset != "custom" else ""
            style_text = f" in {design_style} style" if design_style else ""

            await self._ensure_sandbox()
            sandbox_file_url = f"/api/sandboxes/{self.sandbox_id}/files?path={design_path.lstrip('/')}"

            return self.success_response({
                "success": True,
                "design_path": design_path,
                "design_url": sandbox_file_url,
                "sandbox_id": self.sandbox_id,
                "platform": platform_preset,
                "dimensions": {"width": actual_width, "height": actual_height},
                "style": design_style,
                "quality": quality,
                "message": f"Successfully created professional design{platform_text} ({dimensions_text}){style_text}. Design saved at: {design_path}"
            })

        except Exception as e:
            return self.fail_response(
                f"An error occurred during design creation/editing: {str(e)}"
            )

    def _enhance_design_prompt(self, prompt: str, design_style: Optional[str] = None, platform: Optional[str] = None, width: int = 1024, height: int = 1024) -> str:
        style_enhancements = {
            "modern": "with contemporary aesthetics, clean lines, bold typography, and current design trends",
            "minimalist": "with minimal elements, plenty of whitespace, simple color palette, and focus on essential components",
            "material": "following Material Design principles, with proper elevation, shadows, and material surfaces",
            "glassmorphism": "with frosted glass effect, transparency, vivid colors behind glass, and subtle borders",
            "neomorphism": "with soft UI elements, subtle shadows and highlights, creating a soft extruded plastic look",
            "flat": "with flat design principles, no shadows or gradients, bold colors, and simple shapes",
            "skeuomorphic": "with realistic textures, shadows, and three-dimensional appearance mimicking real objects",
            "organic": "with natural flowing shapes, soft curves, nature-inspired elements, and organic forms",
            "geometric": "with strong geometric shapes, patterns, precise angles, and mathematical precision",
            "abstract": "with abstract artistic elements, unconventional compositions, and creative interpretations",
            "professional": "with corporate aesthetics, business-appropriate design, polished and refined appearance",
            "playful": "with fun, vibrant elements, playful typography, bright colors, and whimsical design",
            "luxury": "with premium feel, elegant typography, sophisticated color palette, high-end aesthetic, and refined details",
            "tech": "with futuristic elements, tech-inspired graphics, digital aesthetics, and innovative visual language",
            "vintage": "with retro styling, nostalgic elements, classic typography, aged textures, and timeless appeal",
            "bold": "with high impact visuals, strong contrasts, attention-grabbing elements, and powerful composition",
        }

        platform_optimizations = {
            "instagram_square": "optimized for Instagram feed with centered composition, thumb-stopping visuals, and mobile-first design",
            "instagram_story": "vertical design with safe zones for UI elements, engaging full-screen layout",
            "youtube_thumbnail": "high-contrast design with large readable text, compelling visuals that work at small sizes",
            "linkedin_banner": "professional header design with text positioned for profile overlay considerations",
            "facebook_cover": "timeline-optimized design accounting for profile picture placement",
            "pinterest_pin": "vertical design optimized for Pinterest's grid layout with eye-catching top portion",
            "twitter_header": "wide banner format with important elements in the center safe zone",
            "google_ads_banner": "advertising-optimized with clear CTA, minimal text, and immediate visual impact",
        }

        professional_principles = [
            "Apply rule of thirds for balanced composition",
            "Use golden ratio proportions where applicable",
            "Implement proper visual hierarchy with clear focal points",
            "Ensure text has proper contrast ratio (WCAG AA standards minimum)",
            "Apply safe zones for text placement avoiding edges (10% margin)",
            "Use professional typography with appropriate font pairing",
            "Implement consistent spacing using 8px grid system",
            "Balance negative space for visual breathing room",
            "Create clear visual flow guiding the eye through the design",
            "Use color theory principles for harmonious palette",
            "Ensure scalability and clarity at different sizes",
            "Apply gestalt principles for visual grouping and organization",
        ]

        base_enhancement = "Create a PROFESSIONAL, POLISHED design with EXPERT-LEVEL execution. "
        enhanced = base_enhancement + prompt

        enhanced += "\n\nAPPLY THESE PROFESSIONAL DESIGN PRINCIPLES:\n"
        for principle in professional_principles:
            enhanced += f"- {principle}\n"

        aspect_ratio = width / height
        if aspect_ratio > 1.5:
            enhanced += "\nFor this WIDE/LANDSCAPE format: Position key elements using horizontal rule of thirds, ensure text is readable across the width, create horizontal visual flow."
        elif aspect_ratio < 0.67:
            enhanced += "\nFor this TALL/PORTRAIT format: Stack elements vertically with clear hierarchy, use vertical rule of thirds, ensure content flows naturally from top to bottom."
        else:
            enhanced += "\nFor this SQUARE/BALANCED format: Center key elements, use symmetrical or asymmetrical balance, create strong focal point in the center or using rule of thirds."

        if platform and platform in platform_optimizations:
            enhanced += f"\n\nPLATFORM OPTIMIZATION: {platform_optimizations[platform]}"

        if design_style and design_style in style_enhancements:
            enhanced += f"\n\nSTYLE DIRECTION: Apply {design_style} aesthetics - {style_enhancements[design_style]}"

        enhanced += "\n\nENSURE: All text is perfectly legible, professionally placed with proper alignment, appropriate sizing for the format, and maintains clear hierarchy. If including text, use professional typography with proper kerning, leading, and tracking. Position text in safe zones away from edges."
        enhanced += "\n\nQUALITY: Deliver agency-quality, portfolio-worthy design with flawless execution, attention to detail, and professional finish."
        return enhanced

    def _get_size_string(self, width: int, height: int) -> str:
        # No longer used; kept for backward compatibility with previous structure
        return "auto"

    async def _get_image_bytes(self, image_path: str) -> bytes | ToolResult:
        if image_path.startswith(("http://", "https://")):
            return await self._download_image_from_url(image_path)
        else:
            return await self._read_image_from_sandbox(image_path)

    async def _download_image_from_url(self, url: str) -> bytes | ToolResult:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.content
        except Exception:
            return self.fail_response(f"Could not download design from URL: {url}")

    async def _read_image_from_sandbox(self, image_path: str) -> bytes | ToolResult:
        try:
            cleaned_path = self.clean_path(image_path)
            full_path = f"{self.workspace_path}/{cleaned_path}"
            file_info = await self.sandbox.fs.get_file_info(full_path)
            if file_info.is_dir:
                return self.fail_response(f"Path '{cleaned_path}' is a directory, not a design file.")
            return await self.sandbox.fs.download_file(full_path)
        except Exception as e:
            return self.fail_response(f"Could not read design file from sandbox: {image_path} - {str(e)}")

    # ---------- Fal helpers and saving ----------

    def _get_default_fal_model(self, mode: Optional[str] = None) -> Optional[str]:
        """
        Resolve default Fal model from agent configuration.
        Checks designer tool settings first, then falls back to image_edit tool settings.

        Supported keys:
          - fal_model_generate (for 'create' mode)
          - fal_model_edit     (for 'edit' mode)
          - fal_model          (legacy fallback)
        """
        try:
            cfg = getattr(self.thread_manager, "agent_config", None) or {}
            tools_cfg = (cfg.get("agentpress_tools") or cfg.get("agentpress") or {}) or {}

            # Prefer designer tool settings if available
            tool_cfg = tools_cfg.get("sb_designer_tool") or tools_cfg.get("sb_image_edit_tool") or {}
            settings = tool_cfg.get("settings") or {}

            if isinstance(mode, str):
                if mode == "create" and isinstance(settings.get("fal_model_generate"), str):
                    val = settings.get("fal_model_generate", "").strip()
                    if val:
                        return val
                if mode == "edit" and isinstance(settings.get("fal_model_edit"), str):
                    val = settings.get("fal_model_edit", "").strip()
                    if val:
                        return val

            val = settings.get("fal_model")
            if isinstance(val, str):
                val = val.strip()
                if val:
                    return val
        except Exception:
            pass
        return None

    async def _fal_generate_image(self, prompt: str, fal_model: str, image_size: str = "1024x1024") -> str | ToolResult:
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

    async def _fal_edit_image(
        self,
        prompt: str,
        fal_model: str,
        init_image_url: str,
        image_size: str = "1024x1024",
        strength: float = 0.7,
    ) -> str | ToolResult:
        try:
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

    def _extract_first_image_url(self, response: object) -> Optional[str]:
        """
        Try to extract the first image URL from Fal response.
        Typical shapes:
          - {'images': [{'url': '...'}]}
          - {'image': {'url': '...'}}
          - {'output': [{'url': '...'}]}
        """
        def _dfs(obj: object) -> Optional[str]:
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

    async def _save_design_from_url(self, url: str, width: int, height: int) -> str | ToolResult:
        """Download image from URL and save into /workspace/designs with random filename; return the full path."""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(url, timeout=60)
                r.raise_for_status()
                data = r.content

            random_filename = f"design_{width}x{height}_{uuid.uuid4().hex[:8]}.png"
            full_path = f"{self.designs_dir}/{random_filename}"
            await self.sandbox.fs.upload_file(data, full_path)
            return full_path
        except Exception as e:
            return self.fail_response(f"Failed to download and save Fal image: {str(e)}")
