import os
import httpx
import json
import zipfile
import io
from typing import Optional, Dict, Any, List
from core.agentpress.tool import ToolResult, ToolSchema, SchemaType, openapi_schema, usage_example
from core.agentpress.thread_manager import ThreadManager
from core.sandbox.tool_base import SandboxToolsBase
from core.utils.logger import logger
from core.utils.config import config

class WhatsAppTool(SandboxToolsBase):
    """Tool for sending files and messages via WhatsApp.
    
    This tool provides functionality to:
    - Send text messages to users via WhatsApp
    - Send files from the sandbox to users via WhatsApp
    - Handle file compression and uploads
    
    Attributes:
        thread_manager: The thread manager instance
        project_id: The project ID for this tool instance
        whatsapp_base_url: Base URL for the WhatsApp API
        auth_token: Authentication token for the WhatsApp API
        workspace_path: Path to the workspace directory
    """

    def __init__(self, thread_manager: ThreadManager, project_id: str = None):
        """Initialize the WhatsAppTool.
        
        Args:
            thread_manager: The thread manager instance
            project_id: Optional project ID
            
        Raises:
            ValueError: If required configuration is missing
        """
        super().__init__(project_id=project_id, thread_manager=thread_manager)
        self.thread_manager = thread_manager
        self.project_id = project_id
        self.whatsapp_base_url = config.get("WHATSAPP_API_URL", "http://localhost:3005")
        self.auth_token = config.get("WHATSAPP_API_TOKEN", "thanus_whats_GVpcu6z9ipOt5FtL8lZ0aL8ds05Vo6khJLsB2AlCw3o2QHvjTHCdqQjxJS9UrgbWi3ULDbhiEU2BUMFAjqbO347")
        self.workspace_path = "/workspace"  # Ensure we're always operating in /workspace
        
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "send_text_via_whatsapp",
            "description": "Sends a text message to the user via WhatsApp.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "The text message to send"
                    }
                },
                "required": ["message"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="send_text_via_whatsapp">
        <parameter name="message">Hello, this is a test message from the agent</parameter>
        </invoke>
        </function_calls>
    ''')
    async def send_text_via_whatsapp(self, message: str) -> ToolResult:
        """Send a text message via WhatsApp."""
        try:
            phone_number = await self._get_user_phone_number()
            if not phone_number:
                return self.fail_response("Could not find user's phone number")
                
            response = await self._send_whatsapp_text(phone_number, message)
            if response.get('success'):
                return self.success_response(f"Message sent successfully to {phone_number}")
            else:
                return self.fail_response(f"Failed to send message: {response.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {str(e)}", exc_info=True)
            return self.fail_response(f"Failed to send message: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "send_files_via_whatsapp",
            "description": "Sends files from the sandbox to the user via WhatsApp. IMPORTANT: The 'file_paths' parameter must be a JSON array of strings, not a comma-separated string.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_paths": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of file paths to send (relative to /workspace). Must be a JSON array of strings, not a comma-separated string.",
                        "examples": [
                            ["index.html", "style.css", "script.js"],
                            ["report.pdf", "data.csv"]
                        ]
                    },
                    "message": {
                        "type": "string",
                        "description": "Optional message to include with the files"
                    }
                },
                "required": ["file_paths"]
            }
        }
    })
    @usage_example('''
        <function_calls>
        <invoke name="send_files_via_whatsapp">
        <parameter name="file_paths">["report.pdf", "data.csv"]</parameter>
        <parameter name="message">Here are the files you requested</parameter>
        </invoke>
        </function_calls>
    ''')
    async def send_files_via_whatsapp(self, file_paths: List[str], message: str = "") -> ToolResult:
        """Send files via WhatsApp."""
        try:
            phone_number = await self._get_user_phone_number()
            if not phone_number:
                return self.fail_response("Could not find user's phone number")
                
            # Implementation for sending files would go here
            # This is a placeholder - you'll need to implement the actual file sending logic
            return self.success_response(f"Files {', '.join(file_paths)} would be sent to {phone_number} with message: {message}")
            
        except Exception as e:
            logger.error(f"Error sending files via WhatsApp: {str(e)}", exc_info=True)
            return self.fail_response(f"Failed to send files: {str(e)}")

    async def _get_user_phone_number(self) -> Optional[str]:
        """Get the user's WhatsApp phone number from the database using the project_id.
        
        Returns:
            The user's phone number if found, None otherwise
        """
        try:
            if not self.project_id:
                logger.warning("[WhatsAppTool] No project_id provided")
                return None
                
            # Get the project details to get the account_id
            client = await self.thread_manager.db.client
            project_data = await client.table('projects').select('account_id').eq('project_id', self.project_id).single().execute()
            
            if not project_data.data:
                logger.warning(f"[WhatsAppTool] No project found with ID: {self.project_id}")
                return None
                
            account_id = project_data.data.get('account_id')
            logger.debug(f"[WhatsAppTool] Getting phone number for account_id: {account_id}")
            if not account_id:
                logger.warning("[WhatsAppTool] No account_id found in project data")
                return None

            # Get user's phone number from the database
            logger.debug("[WhatsAppTool] Querying database for phone number")
            
            # Query the usuario_celular table directly
            phone_data = await client.table('usuario_celular') \
                .select('celular') \
                .eq('account_id', account_id) \
                .single() \
                .execute()

            logger.debug(f"[WhatsAppTool] Database query result: {phone_data}")
            
            if phone_data.data:
                phone_number = phone_data.data.get('celular')
                if phone_number:
                    logger.debug(f"[WhatsAppTool] Found phone number: {phone_number}")
                    return phone_number
                
            logger.warning(f"[WhatsAppTool] No phone number found for account_id: {account_id}")
            return None
            
        except Exception as e:
            logger.error(f"[WhatsAppTool] Error getting user phone number: {str(e)}", exc_info=True)
            return None

    async def _ensure_sandbox_initialized(self):
        """Ensure sandbox is properly initialized."""
        if not hasattr(self, '_sandbox') or self._sandbox is None:
            await self._ensure_sandbox()
            
    async def _zip_files(self, file_paths: List[str]) -> Optional[bytes]:
        """Zip multiple files into a single archive."""
        if not file_paths:
            logger.warning("[WhatsAppTool] No file paths provided for zipping")
            return None
            
        # Ensure sandbox is initialized
        try:
            await self._ensure_sandbox_initialized()
        except Exception as e:
            logger.error(f"[WhatsAppTool] Failed to initialize sandbox: {str(e)}", exc_info=True)
            return None
            
        logger.debug(f"[WhatsAppTool] Starting to zip files: {file_paths}")
        zip_buffer = io.BytesIO()
        files_added = 0
        
        try:
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in file_paths:
                    try:
                        # Clean and normalize the path
                        clean_path = self.clean_path(file_path)
                        full_path = f"{self.workspace_path}/{clean_path}"
                        
                        logger.debug(f"[WhatsAppTool] Attempting to download file: {full_path}")
                        
                        try:
                            # Ensure sandbox is still available
                            if not hasattr(self, '_sandbox') or self._sandbox is None:
                                await self._ensure_sandbox_initialized()
                                
                            # Download file content as bytes
                            file_content = await self._sandbox.fs.download_file(full_path)
                            
                            if not file_content:
                                logger.warning(f"[WhatsAppTool] File is empty: {full_path}")
                                continue
                                
                            # Add file to zip
                            file_name = os.path.basename(clean_path)
                            zipf.writestr(file_name, file_content)
                            files_added += 1
                            logger.debug(f"[WhatsAppTool] Added {file_name} to zip")
                            
                        except FileNotFoundError:
                            logger.error(f"[WhatsAppTool] File not found: {full_path}")
                        except Exception as e:
                            logger.error(f"[WhatsAppTool] Error reading {full_path}: {str(e)}", exc_info=True)
                             
                    except Exception as e:
                        logger.error(f"[WhatsAppTool] Error processing {file_path}: {str(e)}", exc_info=True)
                        continue
                
            # Check if any files were added
            if files_added == 0:
                logger.error("[WhatsAppTool] No files were added to the zip archive")
                return None
                
            # Get the zip content
            zip_data = zip_buffer.getvalue()
            if not zip_data or len(zip_data) == 0:
                logger.error("[WhatsAppTool] Generated zip file is empty")
                return None
                
            logger.debug(f"[WhatsAppTool] Successfully created zip with {files_added} files, size: {len(zip_data)} bytes")
            return zip_data
            
        except Exception as e:
            logger.error(f"[WhatsAppTool] Error creating zip file: {str(e)}", exc_info=True)
            return None

    async def _send_whatsapp_text(self, phone_number: str, message: str) -> Dict[str, Any]:
        """Send a text message via WhatsApp API.
        
        Args:
            phone_number: The recipient's phone number with country code (without +)
            message: The text message to send
            
        Returns:
            Dict containing success status and response data
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'numero': phone_number,
                'mensagem': message
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.whatsapp_base_url}/whatsapp/send-text",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return {"success": False, "error": f"API error: {response.text}"}
                    
                return {"success": True, "data": response.json()}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _send_whatsapp_file(self, phone_number: str, file_data: bytes, file_name: str, caption: str = "") -> Dict[str, Any]:
        """Send a file via WhatsApp API."""
        try:
            # Create a temporary file-like object for the zip data
            files = {
                'midia': (file_name, file_data, 'application/zip')
            }
            
            # Prepare form data
            data = {
                'numero': phone_number,
                'legenda': caption
            }
            
            # Note: Don't set Content-Type header, let httpx set it with the boundary
            headers = {
                'Authorization': f'Bearer {self.auth_token}'
            }
            
            # Use httpx's files parameter which will handle the multipart encoding
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.whatsapp_base_url}/whatsapp/send-file",
                    headers=headers,
                    data=data,
                    files=files,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    return {"success": False, "error": f"API error: {response.text}"}
                    
                return {"success": True, "message": "File sent successfully"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    @openapi_schema({
        "name": "send_text_via_whatsapp",
        "description": "Sends a text message to the user via WhatsApp",
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "The text message to send"
                }
            },
            "required": ["message"]
        }
    })
    async def send_text_via_whatsapp(self, message: str) -> ToolResult:
        """
        Send a text message to the user via WhatsApp.
        
        Args:
            message: The text message to send
        """
        try:
            logger.info("[WhatsAppTool] Starting to send text message")
            
            if not self.project_id:
                error_msg = "Project ID is required to send WhatsApp messages"
                logger.error(f"[WhatsAppTool] {error_msg}")
                return ToolResult(
                    success=False,
                    output=error_msg
                )
                
            # Get user's WhatsApp number
            logger.debug("[WhatsAppTool] Getting user's phone number")
            phone_number = await self._get_user_phone_number()
            if not phone_number:
                error_msg = "No WhatsApp number found for this project. Please set up your WhatsApp number in the settings first."
                logger.error(f"[WhatsAppTool] {error_msg}")
                return ToolResult(
                    success=False,
                    output=error_msg
                )
                
            logger.debug(f"[WhatsAppTool] Found phone number: {phone_number}")
            
            # Send the text message
            logger.debug("[WhatsAppTool] Sending text message via WhatsApp")
            result = await self._send_whatsapp_text(
                phone_number=phone_number,
                message=message
            )
            
            if not result.get("success"):
                error_msg = f"Failed to send message via WhatsApp: {result.get('error', 'Unknown error')}"
                logger.error(f"[WhatsAppTool] {error_msg}")
                return ToolResult(
                    success=False,
                    output=error_msg
                )
                
            success_msg = "Message has been successfully sent to your WhatsApp number."
            logger.info(f"[WhatsAppTool] {success_msg}")
            return ToolResult(
                success=True,
                output=success_msg
            )
            
        except Exception as e:
            error_msg = f"Unexpected error in send_text_via_whatsapp: {str(e)}"
            logger.error(f"[WhatsAppTool] {error_msg}", exc_info=True)
            return ToolResult(
                success=False,
                output=error_msg
            )

    @openapi_schema({
        "name": "send_files_via_whatsapp",
        "description": "Sends files from the sandbox to the user via WhatsApp",
        "parameters": {
            "type": "object",
            "properties": {
                "file_paths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of file paths to send (relative to /workspace)"
                },
                "message": {
                    "type": "string",
                    "description": "Optional message to include with the files"
                }
            },
            "required": ["file_paths"]
        }
    })
    async def send_files_via_whatsapp(self, file_paths: List[str], message: str = "") -> ToolResult:
        """
        Send one or more files from the sandbox to the user via WhatsApp.
        The files will be zipped and sent as a single attachment.
        
        Args:
            file_paths: List of file paths to send (relative to /workspace)
            message: Optional message to include with the files
        """
        try:
            logger.info(f"[WhatsAppTool] Starting to process files: {file_paths}")
            
            if not self.project_id:
                error_msg = "Project ID is required to send files via WhatsApp"
                logger.error(f"[WhatsAppTool] {error_msg}")
                return ToolResult(
                    success=False,
                    output=error_msg
                )
                
            # Get user's WhatsApp number
            logger.debug("[WhatsAppTool] Getting user's phone number")
            phone_number = await self._get_user_phone_number()
            if not phone_number:
                error_msg = "No WhatsApp number found for this project. Please set up your WhatsApp number in the settings first."
                logger.error(f"[WhatsAppTool] {error_msg}")
                return ToolResult(
                    success=False,
                    output=error_msg
                )
            logger.debug(f"[WhatsAppTool] Found phone number: {phone_number}")

            # Verify files exist before trying to zip
            logger.debug("[WhatsAppTool] Verifying files exist")
            
            # Ensure sandbox is initialized
            try:
                await self._ensure_sandbox_initialized()
            except Exception as e:
                error_msg = f"Failed to initialize sandbox: {str(e)}"
                logger.error(f"[WhatsAppTool] {error_msg}", exc_info=True)
                return ToolResult(
                    success=False,
                    output=error_msg
                )
            
            # Verify each file exists and is accessible
            verified_paths = []
            for file_path in file_paths:
                try:
                    clean_path = self.clean_path(file_path)
                    full_path = f"{self.workspace_path}/{clean_path}"
                    
                    # Try to access the file
                    file_content = await self._sandbox.fs.download_file(full_path)
                    if file_content:
                        verified_paths.append(file_path)
                        logger.debug(f"[WhatsAppTool] Verified file: {file_path} (size: {len(file_content)} bytes)")
                    else:
                        logger.warning(f"[WhatsAppTool] File is empty: {file_path}")
                except FileNotFoundError:
                    logger.error(f"[WhatsAppTool] File not found: {file_path}")
                except Exception as e:
                    logger.error(f"[WhatsAppTool] Error accessing {file_path}: {str(e)}")
            
            if not verified_paths:
                error_msg = "No valid files found to send. Please check if the files exist and are accessible."
                logger.error(f"[WhatsAppTool] {error_msg}")
                return ToolResult(
                    success=False,
                    output=error_msg
                )

            # Check if we should send files individually or as a zip
            if len(verified_paths) > 3:
                # More than 3 files - zip them
                logger.debug(f"[WhatsAppTool] More than 3 files detected, creating zip archive with {len(verified_paths)} files")
                zip_data = await self._zip_files(verified_paths)
                if not zip_data:
                    error_msg = "Could not create zip file. No valid files were found or an error occurred during zip creation."
                    logger.error(f"[WhatsAppTool] {error_msg}")
                    return ToolResult(
                        success=False,
                        output=error_msg
                    )
                
                logger.debug(f"[WhatsAppTool] Zip file created successfully, size: {len(zip_data)} bytes")

                # Send zip via WhatsApp
                logger.debug("[WhatsAppTool] Sending zip file via WhatsApp")
                result = await self._send_whatsapp_file(
                    phone_number=phone_number,
                    file_data=zip_data,
                    file_name="sandbox_files.zip",
                    caption=message or f"Here are the {len(verified_paths)} files you requested (sent as zip)."
                )
            else:
                # 3 or fewer files - send individually
                logger.debug(f"[WhatsAppTool] {len(verified_paths)} files detected, sending files individually")
                success_count = 0
                error_messages = []
                
                for file_path in verified_paths:
                    try:
                        clean_path = self.clean_path(file_path)
                        full_path = f"{self.workspace_path}/{clean_path}"
                        file_name = os.path.basename(clean_path)
                        
                        # Download file content
                        file_content = await self._sandbox.fs.download_file(full_path)
                        if not file_content:
                            error_messages.append(f"File is empty: {file_name}")
                            continue
                            
                        # Send file
                        file_result = await self._send_whatsapp_file(
                            phone_number=phone_number,
                            file_data=file_content,
                            file_name=file_name,
                            caption=message if success_count == 0 else None  # Only include message with first file
                        )
                        
                        if file_result.get("success"):
                            success_count += 1
                        else:
                            error_messages.append(f"Failed to send {file_name}: {file_result.get('error', 'Unknown error')}")
                            
                    except Exception as e:
                        error_messages.append(f"Error processing {file_path}: {str(e)}")
                        logger.error(f"[WhatsAppTool] Error sending file {file_path}: {str(e)}", exc_info=True)
                
                # Prepare result based on how many files were sent successfully
                if success_count == len(verified_paths):
                    result = {"success": True, "message": f"Successfully sent all {success_count} files."}
                elif success_count > 0:
                    result = {
                        "success": True, 
                        "message": f"Sent {success_count} out of {len(verified_paths)} files.",
                        "errors": error_messages
                    }
                else:
                    result = {
                        "success": False, 
                        "error": f"Failed to send any files. {', '.join(error_messages)}"
                    }

            if not result.get("success"):
                error_msg = f"Failed to send files via WhatsApp: {result.get('error', 'Unknown error')}"
                logger.error(f"[WhatsAppTool] {error_msg}")
                return ToolResult(
                    success=False,
                    output=f"{error_msg}, whatsapp_base_url: {self.whatsapp_base_url}"
                )

            success_msg = "Files have been successfully sent to your WhatsApp number."
            logger.info(f"[WhatsAppTool] {success_msg}")
            return ToolResult(
                success=True,
                output=success_msg
            )

        except Exception as e:
            error_msg = f"Unexpected error in send_files_via_whatsapp: {str(e)}"
            logger.error(f"[WhatsAppTool] {error_msg}", exc_info=True)
            return ToolResult(
                success=False,
                output=error_msg
            )

    @usage_example(
        '''{
            "tool_name": "send_files_via_whatsapp",
            "example": {
                "file_paths": ["/workspace/results/data.csv", "/workspace/results/analysis.txt"],
                "message": "Here are the analysis results you requested."
            }
        }'''
    )
    async def example_usage(self):
        """Example usage of the WhatsApp file sending tool."""
        pass
