"""
NFC Card Writer Studio - Local Dev Server
Serves static files + API to sync Arduino .ino source and upload to board.
Uses Arduino MCP Server (JSON-RPC over stdio) for compile & upload operations.
"""

import http.server
import json
import re
import os
import subprocess
import threading

PORT = 3001
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
INO_PATH = os.path.join(PROJECT_DIR, "nfc", "nfc.ino")
INO_DIR = os.path.join(PROJECT_DIR, "nfc")

# Arduino MCP Server binary
MCP_SERVER_BIN = r"C:\Users\corsair\tools\arduino-mcp-server\arduino-mcp-server.exe"

# Board configuration
BOARD_FQBN = "arduino:avr:nano:cpu=atmega328old"
BOARD_PORT = "COM4"


class ArduinoMCPClient:
    """Client that communicates with the Arduino MCP Server via JSON-RPC over stdio."""

    def __init__(self, mcp_binary):
        self.mcp_binary = mcp_binary
        self._request_id = 0
        self._lock = threading.Lock()

    def _next_id(self):
        with self._lock:
            self._request_id += 1
            return self._request_id

    def _call_mcp(self, method, params=None, timeout=120):
        """
        Spawn the MCP server, send initialize + tool call, return the result.
        Each call is a fresh process (stateless stdio MCP pattern).
        """
        env = os.environ.copy()
        # Refresh PATH from Windows registry to pick up newly installed tools
        try:
            import winreg
            machine_path = winreg.QueryValueEx(
                winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                               r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment"),
                "Path"
            )[0]
            user_path = winreg.QueryValueEx(
                winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment"),
                "Path"
            )[0]
            env["PATH"] = machine_path + ";" + user_path
        except Exception:
            pass
        env["ARDUINO_CLI_BIN"] = r"C:\Program Files\Arduino CLI\arduino-cli.exe"

        proc = subprocess.Popen(
            [self.mcp_binary],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )

        try:
            # Step 1: Send initialize request
            init_req = json.dumps({
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "nfc-studio", "version": "1.0"}
                }
            })

            # Step 2: Send the actual tool call
            tool_req = json.dumps({
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": method,
                "params": params or {}
            })

            # Send both requests, separated by newlines
            input_data = init_req + "\n" + tool_req + "\n"
            stdout, stderr = proc.communicate(input=input_data.encode(), timeout=timeout)

            # Parse responses (one per line)
            responses = []
            for line in stdout.decode("utf-8").strip().split("\n"):
                line = line.strip()
                if line:
                    try:
                        responses.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

            if len(responses) < 2:
                return {
                    "success": False,
                    "error": f"MCP server returned {len(responses)} response(s), expected 2",
                    "raw_stdout": stdout.decode("utf-8"),
                    "raw_stderr": stderr.decode("utf-8")
                }

            # The second response is our tool call result
            tool_response = responses[1]

            if "error" in tool_response:
                return {
                    "success": False,
                    "error": tool_response["error"].get("message", str(tool_response["error"]))
                }

            return {
                "success": True,
                "result": tool_response.get("result", {})
            }

        except subprocess.TimeoutExpired:
            proc.kill()
            return {"success": False, "error": f"MCP server timed out after {timeout}s"}
        except Exception as e:
            proc.kill()
            return {"success": False, "error": str(e)}

    def compile_and_upload(self, fqbn, port, sketch_path):
        """Use the MCP 'compile' tool with upload=true to compile and upload in one step."""
        return self._call_mcp("tools/call", {
            "name": "compile",
            "arguments": {
                "fqbn": fqbn,
                "sketch": sketch_path,
                "upload": True,
                "port": port
            }
        })

    def upload(self, fqbn, port, sketch_path):
        """Use the MCP 'upload' tool to upload a pre-compiled sketch."""
        return self._call_mcp("tools/call", {
            "name": "upload",
            "arguments": {
                "fqbn": fqbn,
                "port": port,
                "sketch": sketch_path
            }
        })

    def list_boards(self):
        """Use the MCP 'list_boards' tool to detect connected boards."""
        return self._call_mcp("tools/call", {
            "name": "list_boards",
            "arguments": {}
        })


# Global MCP client instance
mcp_client = ArduinoMCPClient(MCP_SERVER_BIN)


class NFCStudioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_DIR, **kwargs)

    def do_POST(self):
        if self.path == "/api/update-ino":
            self._handle_update_ino()
        elif self.path == "/api/upload":
            self._handle_upload()
        elif self.path == "/api/list-boards":
            self._handle_list_boards()
        else:
            self.send_error(404, "Not Found")

    def _handle_update_ino(self):
        """Update the .ino source file AND compile+upload to the Arduino via MCP."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)

            new_payload = data.get("payload", "")
            new_type = data.get("type", "URL")

            if not new_payload:
                self._send_json(400, {"error": "Missing payload"})
                return

            # Read current .ino file
            with open(INO_PATH, "r", encoding="utf-8") as f:
                ino_content = f.read()

            # Update pendingPayload default value
            ino_content = re.sub(
                r'String pendingPayload = ".*?";',
                f'String pendingPayload = "{new_payload}";',
                ino_content,
            )

            # Update pendingType default value
            ino_content = re.sub(
                r'String pendingType = ".*?";',
                f'String pendingType = "{new_type}";',
                ino_content,
            )

            # Write updated .ino file
            with open(INO_PATH, "w", encoding="utf-8") as f:
                f.write(ino_content)

            self._send_json(200, {
                "success": True,
                "payload": new_payload,
                "type": new_type,
                "message": f"nfc.ino updated. Compiling and uploading to {BOARD_FQBN} on {BOARD_PORT} via MCP..."
            })

        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _handle_upload(self):
        """Compile and upload the sketch to the Arduino board via MCP server."""
        try:
            print(f"[MCP] Compile+Upload: fqbn={BOARD_FQBN}, port={BOARD_PORT}, sketch={INO_DIR}")
            result = mcp_client.compile_and_upload(BOARD_FQBN, BOARD_PORT, INO_DIR)

            if result["success"]:
                self._send_json(200, {
                    "success": True,
                    "stage": "complete",
                    "message": "Sketch compiled and uploaded successfully!"
                })
            else:
                self._send_json(200, {
                    "success": False,
                    "stage": "mcp_error",
                    "error": result.get("error", "Unknown MCP error"),
                    "output": str(result)
                })

        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _handle_list_boards(self):
        """List connected boards via MCP server."""
        try:
            result = mcp_client.list_boards()
            if result["success"]:
                mcp_result = result.get("result", {})
                output_text = ""
                content_list = mcp_result.get("content", [])
                for item in content_list:
                    if item.get("type") == "text":
                        output_text += item.get("text", "")
                self._send_json(200, {"success": True, "boards": output_text})
            else:
                self._send_json(200, {"success": False, "error": result.get("error", "Unknown")})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def _send_json(self, code, data):
        response = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(response))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response)

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def end_headers(self):
        # Disable caching for dev
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    print(f"NFC Studio server running at http://localhost:{PORT}")
    print(f"Arduino source: {INO_PATH}")
    print(f"Arduino MCP Server: {MCP_SERVER_BIN}")
    print(f"Board: {BOARD_FQBN} on {BOARD_PORT}")
    print()

    # Verify MCP server is accessible
    if os.path.exists(MCP_SERVER_BIN):
        print("[OK] Arduino MCP server binary found")
    else:
        print(f"[WARNING] MCP server not found at: {MCP_SERVER_BIN}")

    print()

    with http.server.HTTPServer(("", PORT), NFCStudioHandler) as httpd:
        httpd.serve_forever()
