#!/usr/bin/env python3
"""
Test for the sandbox file download endpoint.
"""

import asyncio
import aiohttp
import json
import os
import time


async def test_sandbox_file_download():
    base_url = os.getenv("THANUS_BASE_URL", "http://localhost:8000")
    # Prefer environment variable, fallback to known working key used in other tests
    api_key = os.getenv(
        "THANUS_API_KEY",
        "thanus_TMoLoJfa-vByLcNe-TX93oTBSjy1d6EdJUOPjkPN358",
    )

    print("=== Thanus AI Sandbox File Download Test ===")
    print(f"Base URL: {base_url}")
    print(f"API Key: {api_key[:15]}...")
    print()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Execute an agent to create a simple website
            print("🚀 Step 1: Executing agent to create a simple website...")
            site_execute = {
                "prompt": "Create a simple website in /workspace with the following files: 1) index.html with a complete HTML page that says 'Welcome to Thanus AI' with some basic styling, 2) style.css with CSS styling including a blue background and centered text, 3) script.js with a simple JavaScript function that shows an alert when a button is clicked. Make sure to actually write these files to the filesystem and link them properly.",
                "model_name": "anthropic/claude-3-5-sonnet-latest",
                "enable_thinking": False,
                "stream": True
            }
            
            async with session.post(f"{base_url}/api/user-api/agents/execute", headers=headers, json=site_execute) as resp_site:
                if resp_site.status != 200:
                    err_site = await resp_site.text()
                    print(f"❌ Failed to execute file-creation agent: {resp_site.status} - {err_site}")
                    return
                
                site_data = await resp_site.json()
                agent_run_id = site_data['agent_run_id']
                project_id = site_data['project_id']
                print(f"✅ File-creation run started: run={agent_run_id}, project={project_id}")
                
                # Wait for the agent to create files
                print("⏳ Waiting 30 seconds for website files to be created...")
                await asyncio.sleep(30)

            # Step 2: List files to confirm they exist
            print("📂 Step 2: Listing files to confirm website creation...")
            async with session.get(
                f"{base_url}/api/user-api/sandbox/files",
                headers=headers,
                params={"project_id": project_id, "path": "/workspace"},
            ) as list_resp:
                if list_resp.status != 200:
                    list_err = await list_resp.text()
                    print(f"❌ Failed to list files: {list_resp.status} - {list_err}")
                    return
                
                list_data = await list_resp.json()
                files = list_data.get("files", [])
                file_paths = [f.get("path") for f in files if isinstance(f, dict)]
                
                print(f"✅ Found {len(files)} files:")
                for f in files[:10]:  # Show first 10 files
                    path = f.get("path") if isinstance(f, dict) else str(f)
                    size = f.get("size") if isinstance(f, dict) else None
                    print(f"   - {path} | size={size}")
                
                # Check for website files
                has_html = any(p.endswith('/index.html') or p.endswith('index.html') for p in file_paths)
                has_css = any(p.endswith('/style.css') or p.endswith('style.css') for p in file_paths)
                has_js = any(p.endswith('/script.js') or p.endswith('script.js') for p in file_paths)
                
                print(f"Website files found: HTML={has_html}, CSS={has_css}, JS={has_js}")
                
                if not has_html:
                    print("⚠️ Website files not found yet; agent may still be running or files weren't created.")
                    print("Proceeding with download test anyway...")

            # Step 3: Create download directory
            download_dir = "downloaded_website"
            os.makedirs(download_dir, exist_ok=True)
            print(f"📁 Created download directory: {download_dir}")
            
            # Step 4: Test downloading website files and save them
            website_files = ["/workspace/index.html", "/workspace/style.css", "/workspace/script.js"]
            downloaded_files = []
            
            for file_path in website_files:
                print(f"📥 Step 4: Testing download of {file_path}...")
                
                async with session.get(
                    f"{base_url}/api/user-api/sandbox/files/download",
                    headers=headers,
                    params={"project_id": project_id, "path": file_path},
                ) as download_resp:
                    if download_resp.status == 200:
                        # Get file content
                        content = await download_resp.read()
                        content_text = content.decode('utf-8', errors='ignore')
                        
                        # Check headers
                        content_disposition = download_resp.headers.get('Content-Disposition', '')
                        content_type = download_resp.headers.get('Content-Type', '')
                        
                        print(f"✅ Successfully downloaded {file_path}")
                        print(f"   Content-Type: {content_type}")
                        print(f"   Content-Disposition: {content_disposition}")
                        print(f"   Content size: {len(content)} bytes")
                        print(f"   Content preview: {content_text[:150]}{'...' if len(content_text) > 150 else ''}")
                        
                        # Basic validations
                        assert len(content) > 0, f"Downloaded file {file_path} is empty"
                        assert content_type == "application/octet-stream", f"Unexpected content type: {content_type}"
                        assert "filename" in content_disposition, f"Missing filename in Content-Disposition: {content_disposition}"
                        
                        # Save file to local directory
                        filename = os.path.basename(file_path)
                        local_path = os.path.join(download_dir, filename)
                        with open(local_path, 'wb') as f:
                            f.write(content)
                        downloaded_files.append(local_path)
                        print(f"💾 Saved to: {local_path}")
                        
                        # Content-specific validations
                        if file_path.endswith('index.html'):
                            assert "html" in content_text.lower(), f"Expected HTML content in index.html: {content_text[:100]}"
                            assert "Thanus" in content_text, f"Expected 'Thanus' in HTML content: {content_text[:200]}"
                        elif file_path.endswith('style.css'):
                            assert ("background" in content_text.lower() or "color" in content_text.lower()), f"Expected CSS styling in style.css: {content_text[:100]}"
                        elif file_path.endswith('script.js'):
                            assert ("function" in content_text.lower() or "alert" in content_text.lower()), f"Expected JavaScript in script.js: {content_text[:100]}"
                        
                    elif download_resp.status == 404:
                        download_err = await download_resp.text()
                        print(f"⚠️ File not found: {file_path} - {download_err}")
                    else:
                        download_err = await download_resp.text()
                        print(f"❌ Failed to download {file_path}: {download_resp.status} - {download_err}")
            
            # Summary of downloaded files
            print(f"\n📋 Downloaded {len(downloaded_files)} website files:")
            for file_path in downloaded_files:
                file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
                print(f"   - {file_path} ({file_size} bytes)")

            # Step 5: Test downloading non-existent file
            print("🚫 Step 5: Testing download of non-existent file...")
            async with session.get(
                f"{base_url}/api/user-api/sandbox/files/download",
                headers=headers,
                params={"project_id": project_id, "path": "/workspace/nonexistent.txt"},
            ) as not_found_resp:
                if not_found_resp.status == 404:
                    print("✅ Correctly returned 404 for non-existent file")
                else:
                    print(f"⚠️ Expected 404 for non-existent file, got {not_found_resp.status}")

            # Step 6: Test with agent_run_id instead of project_id
            print("🔄 Step 6: Testing download using agent_run_id...")
            async with session.get(
                f"{base_url}/api/user-api/sandbox/files/download",
                headers=headers,
                params={"agent_run_id": agent_run_id, "path": "/workspace/index.html"},
            ) as agent_run_resp:
                if agent_run_resp.status == 200:
                    content = await agent_run_resp.read()
                    print(f"✅ Successfully downloaded via agent_run_id: {len(content)} bytes")
                else:
                    err_text = await agent_run_resp.text()
                    print(f"❌ Failed to download via agent_run_id: {agent_run_resp.status} - {err_text}")

        except aiohttp.ClientError as e:
            print(f"❌ Network error: {e}")
        except AssertionError as e:
            print(f"❌ Assertion failed: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    print("Starting sandbox file download test...")
    asyncio.run(test_sandbox_file_download())
