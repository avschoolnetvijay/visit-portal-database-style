import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import webbrowser
import ssl

# --- CONFIGURATION ---
PORT = 8000
JHPMS_HOST = "jhpms.schoolnetindia.com"

# Global Cookie Storage
SESSION_COOKIE = ""

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global SESSION_COOKIE
        
        # Handle CORS Preflight (for safety, though GET handles it)
        if self.path.startswith('/sync'):
            self.handle_sync()
        elif self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"<h1>JHPMS Proxy is Running</h1><p>You can now use the 'Sync from JHPMS' button in your Portal.</p>")
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def handle_sync(self):
        # 1. Parse Parameters
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        
        start_date = params.get('startDate', [''])[0]
        end_date = params.get('endDate', [''])[0]

        if not start_date or not end_date:
            self.respond_error("Missing startDate or endDate parameters.")
            return

        if not SESSION_COOKIE:
            self.respond_error("Session Cookie not set. Please restart script and paste the cookie.")
            return

        print(f"[*] Requesting Report for: {start_date} to {end_date}")

        try:
            # 2. Step 1: Generate Report URL
            # Url provided by user: GetLabVisitReportList_IN...
            gen_path = f"/SmartClassVisit/GetLabVisitReportList_IN?isExcel=true&VisitType=0&UserID=0&S_DATE={start_date}&E_Date={end_date}&AgencyID=0&ProjectID=0&VAgencyID=1&VProjectID=0&District=0&Block=0&UDISE_Code=0&Designation=0&is_in=true"
            gen_url = f"https://{JHPMS_HOST}{gen_path}"

            headers = {
                "Cookie": SESSION_COOKIE,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }

            # Create SSL Context with standard CA verification
            ctx = ssl.create_default_context()

            req = urllib.request.Request(gen_url, headers=headers)
            with urllib.request.urlopen(req, context=ctx) as response:
                gen_text = response.read().decode('utf-8')
            
            print(f"[*] Generation Response: {gen_text[:50]}...")

            # 3. Extract Filename
            file_name = ""
            try:
                # Try JSON
                data = json.loads(gen_text)
                file_name = data.get("fileName") or data.get("File")
            except:
                # Try Raw Text check
                if "Data_" in gen_text:
                    file_name = gen_text.strip().replace('"', '')
            
            if not file_name:
                self.respond_error(f"Could not extract filename from response: {gen_text}")
                return

            print(f"[*] Report Generated: {file_name}")

            # 4. Step 2: Download File
            dl_path = f"/Download/Download/?fileName={urllib.parse.quote(file_name)}"
            dl_url = f"https://{JHPMS_HOST}{dl_path}"
            
            req_dl = urllib.request.Request(dl_url, headers=headers)
            with urllib.request.urlopen(req_dl, context=ctx) as response:
                file_data = response.read()

            print(f"[*] Downloaded {len(file_data)} bytes.")

            # 5. Send back to Browser
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            self.send_header('Content-Disposition', f'attachment; filename="{file_name}"')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(file_data)

        except Exception as e:
            print(f"[!] Error: {e}")
            self.respond_error(str(e))

    def respond_error(self, msg):
        self.send_response(500)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode('utf-8'))

if __name__ == "__main__":
    print("----------------------------------------------------------------")
    print("   JHPMS LOCAL PROXY SERVER For Schoolnet Portal")
    print("----------------------------------------------------------------")
    print("1. Please Login to https://jhpms.schoolnetindia.com in Chrome.")
    print("2. Press F12 -> Application Tab -> Cookies.")
    print("3. Copy the VALUE of the cookie named 'ASP.NET_SessionId'.")
    print("----------------------------------------------------------------")
    
    val = input("PASTE SessonId HERE (Right-Click to Paste) > ").strip()
    if val:
        SESSION_COOKIE = f"ASP.NET_SessionId={val}"
        print(f"[*] Cookie Configured: {SESSION_COOKIE}")
        
        print(f"[*] Starting Server on http://localhost:{PORT}")
        print("[*] You can now click 'Sync from JHPMS' in your Portal.")
        
        with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n[*] Stopping Server.")
    else:
        print("[!] No Cookie provided. Exiting.")
