from typing import Optional
from core.agentpress.tool import ToolResult, openapi_schema, tool_metadata
from core.tools.fal_image_base import FalImageToolBase
from core.agentpress.thread_manager import ThreadManager
import httpx
from io import BytesIO
import uuid
from litellm import aimage_generation, aimage_edit
import base64

@tool_metadata(
    display_name="Design & Graphics",
    description="Generate images and graphics for social media, websites, and more",
    icon="Palette",
    color="bg-rose-100 dark:bg-rose-800/50",
    weight=210,
    visible=True
)
class SandboxDesignerTool(FalImageToolBase):
    def __init__(self, project_id: str, thread_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_id, thread_manager)
        
        # Platform-specific size presets
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

            # Resolve dimensions from preset
            if platform_preset == "custom":
                if width is None or height is None:
                    return self.fail_response("Width and height are required when using 'custom' platform preset.")
                actual_width, actual_height = width, height
            else:
                if platform_preset not in self.social_media_sizes:
                    return self.fail_response(f"Invalid platform preset: {platform_preset}")
                actual_width, actual_height = self.social_media_sizes[platform_preset]

            # Enhance prompt with professional design principles
            enhanced_prompt = self._enhance_design_prompt(prompt, design_style, platform_preset, actual_width, actual_height)

            # Check Fal availability (inherited method)
            fal_check = self._check_fal_availability()
            if fal_check:
                return fal_check

            # Prepare Fal AI parameters
            image_size = f"{max(256, min(4096, actual_width))}x{max(256, min(4096, actual_height))}"
            default_strength = 0.7
            model_to_use = self._get_default_fal_model("create" if mode == "create" else "edit", "sb_designer_tool")
            
            # Require model configuration - no default fallback
            if not model_to_use:
                return self.fail_response(
                    f"No Fal AI model configured for mode '{mode}'. Please configure 'fal_model_{mode}' in agent settings under Tools > Design Tool > Individual Capabilities, "
                    f"or configure a fallback model."
                )

            if mode == "create":
                # Generate image (inherited method)
                image_url_or_err = await self._fal_generate_image(
                    prompt=enhanced_prompt, fal_model=model_to_use, image_size=image_size
                )
                if isinstance(image_url_or_err, ToolResult):
                    return image_url_or_err
                fal_generated_url = image_url_or_err  # Raw Fal URL returned
                
                # Save design (inherited method with dimensions) - will also persist sidecar metadata with Fal URL
                design_path_or_err = await self._save_image_from_url(fal_generated_url, actual_width, actual_height)
                if isinstance(design_path_or_err, ToolResult):
                    return design_path_or_err
                design_path = design_path_or_err

            elif mode == "edit":
                # Edit mode requires image_path
                if not image_path:
                    return self.fail_response("'image_path' is required for edit mode.")
                
                # Determine init image URL for edit:
                # 1) If image_path is already an URL, use it
                # 2) Else try to read sidecar metadata (source_url) from sandbox
                # 3) Else upload local bytes to Fal to obtain a temporary URL
                if isinstance(image_path, str) and image_path.startswith(("http://", "https://")):
                    init_image_url = image_path
                else:
                    # Try sidecar metadata
                    resolved_path = await self._resolve_design_full_path(image_path) or image_path
                    meta = await self._read_design_metadata(resolved_path)
                    if meta and isinstance(meta.get("source_url"), str) and meta["source_url"].startswith("http"):
                        init_image_url = meta["source_url"]
                    else:
                        # Fallback to upload bytes
                        image_bytes = await self._get_image_bytes(image_path)
                        if isinstance(image_bytes, ToolResult):
                            return image_bytes
                        init_image_url_or_err = await self._fal_upload_image(image_bytes)
                        if isinstance(init_image_url_or_err, ToolResult):
                            return init_image_url_or_err
                        init_image_url = init_image_url_or_err

                # Edit image (inherited method)
                edited_image_url_or_err = await self._fal_edit_image(
                    prompt=enhanced_prompt,
                    fal_model=model_to_use,
                    init_image_url=init_image_url,
                    image_size=image_size,
                    strength=default_strength,
                )
                if isinstance(edited_image_url_or_err, ToolResult):
                    return edited_image_url_or_err
                fal_generated_url = edited_image_url_or_err

                # Save edited design (inherited method with dimensions) - also persists sidecar metadata
                design_path_or_err = await self._save_image_from_url(fal_generated_url, actual_width, actual_height)
                if isinstance(design_path_or_err, ToolResult):
                    return design_path_or_err
                design_path = design_path_or_err
            else:
                return self.fail_response("Invalid mode. Use 'create' or 'edit'.")

            # Build response with design metadata
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
                "fal_image_url": fal_generated_url if mode == "create" else fal_generated_url,
                **({"fal_init_image_url": init_image_url} if mode == "edit" else {}),
                "message": f"Successfully created professional design{platform_text} ({dimensions_text}){style_text}. Design saved at: {design_path}"
            })

        except Exception as e:
            return self.fail_response(
                f"An error occurred during design creation/editing: {str(e)}"
            )

    def _enhance_design_prompt(self, prompt: str, design_style: Optional[str] = None, platform: Optional[str] = None, width: int = 1024, height: int = 1024) -> str:
        """Enhance user prompt with professional design principles and platform optimizations."""
        
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

        # Start with professional design instruction
        base_enhancement = "Create a PROFESSIONAL, POLISHED design with EXPERT-LEVEL execution. "
        enhanced = base_enhancement + prompt

        # Add professional design principles
        enhanced += "\n\nAPPLY THESE PROFESSIONAL DESIGN PRINCIPLES:\n"
        for principle in professional_principles:
            enhanced += f"- {principle}\n"

        # Add aspect ratio specific guidance
        aspect_ratio = width / height
        if aspect_ratio > 1.5:
            enhanced += "\nFor this WIDE/LANDSCAPE format: Position key elements using horizontal rule of thirds, ensure text is readable across the width, create horizontal visual flow."
        elif aspect_ratio < 0.67:
            enhanced += "\nFor this TALL/PORTRAIT format: Stack elements vertically with clear hierarchy, use vertical rule of thirds, ensure content flows naturally from top to bottom."
        else:
            enhanced += "\nFor this SQUARE/BALANCED format: Center key elements, use symmetrical or asymmetrical balance, create strong focal point in the center or using rule of thirds."

        # Add platform-specific optimizations
        if platform and platform in platform_optimizations:
            enhanced += f"\n\nPLATFORM OPTIMIZATION: {platform_optimizations[platform]}"

        # Add style-specific enhancements
        if design_style and design_style in style_enhancements:
            enhanced += f"\n\nSTYLE DIRECTION: Apply {design_style} aesthetics - {style_enhancements[design_style]}"

        # Add final quality requirements
        enhanced += "\n\nENSURE: All text is perfectly legible, professionally placed with proper alignment, appropriate sizing for the format, and maintains clear hierarchy. If including text, use professional typography with proper kerning, leading, and tracking. Position text in safe zones away from edges."
        enhanced += "\n\nQUALITY: Deliver agency-quality, portfolio-worthy design with flawless execution, attention to detail, and professional finish."
        
        return enhanced
