#!/usr/bin/env python3
"""
Test for the sandbox initialization and file listing endpoint.
"""

import asyncio
import aiohttp
import json
import os
import time


async def test_sandbox_init_and_list():
    base_url = os.getenv("THANUS_BASE_URL", "http://localhost:8000")
    # Prefer environment variable, fallback to known working key used in other tests
    api_key = os.getenv(
        "THANUS_API_KEY",
        "thanus_TMoLoJfa-vByLcNe-TX93oTBSjy1d6EdJUOPjkPN358",
    )

    print("=== Thanus AI Sandbox Init & List Test ===")
    print(f"Base URL: {base_url}")
    print(f"API Key: {api_key[:15]}...")
    print()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Execute an agent to get an agent_run_id and project_id
            print("🧾 Using provided IDs for context (no agent execution)...")
            agent_run_id = os.getenv("THANUS_AGENT_RUN_ID", "142f8e32-2199-4a43-8a56-fc17c5f9879c")
            thread_id = os.getenv("THANUS_THREAD_ID", "5ea040b2-5f65-4298-bde5-57e6dadfb71d")
            project_id = os.getenv("THANUS_PROJECT_ID", "c29fa07c-57ee-4940-a1d0-4a18af7e9238")

            print("✅ Using provided context!")
            print(f"   Agent Run ID: {agent_run_id}")
            print(f"   Thread ID:    {thread_id}")
            print(f"   Project ID:   {project_id}")
            print()

            # Step 2: Wait a moment to ensure project record is persisted
            print("⏳ Waiting 2 seconds before initializing sandbox...")
            await asyncio.sleep(2)

            # Step 3: Initialize or start sandbox and list files
            print("🧪 Step 2: Calling sandbox init-and-list (via agent_run_id)...")
            init_payload = {"agent_run_id": agent_run_id, "refresh": False}

            async with session.post(
                f"{base_url}/api/user-api/sandbox/init-and-list",
                headers=headers,
                json=init_payload,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to init/list sandbox: {response.status} - {error_text}")
                    return

                data = await response.json()

                # Basic validations
                assert "project_id" in data, "Missing project_id in response"
                assert "sandbox" in data and isinstance(data["sandbox"], dict), "Missing sandbox metadata"
                assert "files" in data and isinstance(data["files"], list), "Missing files list"

                sandbox_meta = data["sandbox"]
                print("✅ Sandbox init/list returned successfully!")
                print(f"   Project ID: {data['project_id']}")
                print(f"   Sandbox ID: {sandbox_meta.get('id')}")
                print(f"   VNC URL:    {sandbox_meta.get('vnc_preview')}")
                print(f"   Web URL:    {sandbox_meta.get('sandbox_url')}")
                print(f"   Files (init-and-list): {len(data['files'])}")

                # More validations on sandbox metadata
                assert sandbox_meta.get("id"), "Sandbox ID is missing"
                assert sandbox_meta.get("vnc_preview"), "VNC preview URL is missing"
                assert sandbox_meta.get("sandbox_url"), "Sandbox web URL is missing"

                # Additionally use the sandbox files API to list all files at /workspace
                print("📂 Using sandbox files API to list files at /workspace...")
                sandbox_id = sandbox_meta.get("id")
                files_api = []
                async with session.get(
                    f"{base_url}/api/user-api/sandbox/files",
                    headers=headers,
                    params={"project_id": data['project_id'], "path": "/workspace"},
                ) as list_resp:
                    if list_resp.status != 200:
                        list_err = await list_resp.text()
                        print(f"❌ Failed to list via files API: {list_resp.status} - {list_err}")
                    else:
                        list_payload = await list_resp.json()
                        files_api = list_payload.get("files", [])
                        print(f"   Files (files API): {len(files_api)}")

                # Print a preview of files if any (from files API preferred)
                files = files_api if files_api else data["files"]
                preview_count = min(len(files), 5)
                if files:
                    print("   Files (preview):")
                    for i in range(preview_count):
                        entry = files[i]
                        # files API entries are dicts with 'path' in our API
                        path = entry.get("path") if isinstance(entry, dict) else str(entry)
                        size = entry.get("size") if isinstance(entry, dict) else None
                        modified = entry.get("mod_time") or entry.get("modified") if isinstance(entry, dict) else None
                        print(f"     - {path} | size={size} | modified={modified}")

                # Optional: Try the same with project_id to ensure both paths work
                print("🧪 Step 3: Calling sandbox init-and-list (via project_id)...")
                async with session.post(
                    f"{base_url}/api/user-api/sandbox/init-and-list",
                    headers=headers,
                    json={"project_id": data["project_id"], "refresh": False},
                ) as response2:
                    if response2.status != 200:
                        error_text2 = await response2.text()
                        print(f"❌ Failed second init/list by project_id: {response2.status} - {error_text2}")
                    else:
                        data2 = await response2.json()
                        print(
                            f"✅ Second call OK. Files returned: {len(data2.get('files', []))}, "
                            f"Sandbox ID: {data2.get('sandbox', {}).get('id')}"
                        )

            # Step 4: Execute agent to create a simple website and list files for that run
            print()
            print("🚀 Step 4: Executing agent to create a simple website...")
            site_execute = {
                "prompt": "Create a simple static website. Create /workspace/index.html with a basic HTML that says 'Hello Thanus', and a /workspace/style.css with a blue background. Do not just simulate; actually write the files into the filesystem so they can be listed.",
                "model_name": "anthropic/claude-3-5-sonnet-latest",
                "enable_thinking": False,
                "stream": True
            }
            async with session.post(f"{base_url}/api/user-api/agents/execute", headers=headers, json=site_execute) as resp_site:
                if resp_site.status != 200:
                    err_site = await resp_site.text()
                    print(f"❌ Failed to execute site-creation agent: {resp_site.status} - {err_site}")
                else:
                    site_data = await resp_site.json()
                    new_agent_run_id = site_data['agent_run_id']
                    new_project_id = site_data['project_id']
                    print(f"✅ Site-creation run started: run={new_agent_run_id}, project={new_project_id}")
                    # Wait for the agent to create files
                    await asyncio.sleep(20)
                    # List files for this new run/project
                    print("🧪 Step 5: Listing files for the new run/project...")
                    async with session.post(
                        f"{base_url}/api/user-api/sandbox/init-and-list",
                        headers=headers,
                        json={"agent_run_id": new_agent_run_id, "refresh": False},
                    ) as resp_list:
                        if resp_list.status != 200:
                            err_list = await resp_list.text()
                            print(f"❌ Failed to init/list for new run: {resp_list.status} - {err_list}")
                        else:
                            list_data = await resp_list.json()
                            new_sandbox_id = list_data.get("sandbox", {}).get("id")
                            # Prefer the sandbox files API to list files at /workspace
                            files_api2 = []
                            async with session.get(
                                f"{base_url}/api/user-api/sandbox/files",
                                headers=headers,
                                params={"project_id": new_project_id, "path": "/workspace"},
                            ) as list2:
                                if list2.status != 200:
                                    list2_err = await list2.text()
                                    print(f"❌ Failed to list via files API for new run: {list2.status} - {list2_err}")
                                else:
                                    payload2 = await list2.json()
                                    files_api2 = payload2.get("files", [])
                            file_paths = [f.get("path") for f in files_api2 if isinstance(f, dict)]
                            has_index = any(p.endswith('/index.html') or p.endswith('index.html') for p in file_paths)
                            has_css = any(p.endswith('/style.css') or p.endswith('style.css') for p in file_paths)
                            print(f"✅ Files found for new run (files API): {len(file_paths)} | index.html={has_index} | style.css={has_css}")
                            if not has_index or not has_css:
                                print("⚠️ Expected website files not found yet; agent may still be running.")

        except aiohttp.ClientError as e:
            print(f"❌ Network error: {e}")
        except AssertionError as e:
            print(f"❌ Assertion failed: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            import traceback

            traceback.print_exc()


if __name__ == "__main__":
    print("Starting sandbox init & list test...")
    asyncio.run(test_sandbox_init_and_list())
