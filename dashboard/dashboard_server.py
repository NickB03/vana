#!/usr/bin/env python3
"""
Vana Server Dashboard - Management interface for frontend and backend servers
"""

import os
import sys
import json
import subprocess
import signal
import time
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import threading
import socket

# Try to import psutil, but work without it if needed
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("⚠️  psutil not installed. Some features may be limited.")
    print("   Install with: uv pip install psutil")

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

class ServerManager:
    """Manages the frontend and backend servers"""
    
    def __init__(self):
        self.project_root = PROJECT_ROOT
        self.processes = {
            'backend': None,
            'frontend': None
        }
        self.pids = {
            'backend': None,
            'frontend': None
        }
        self.ports = {
            'backend': {'default': 8000, 'current': None},
            'frontend': {'default': 5173, 'current': None}
        }
        self.output_buffers = {
            'backend': [],
            'frontend': []
        }
        # Common development ports to monitor
        self.common_ports = {
            'Frontend': [3000, 3001, 5173, 5174, 4173],
            'Backend': [8000, 8001, 8002, 8080, 8081, 5000],
            'Database': [5432, 3306, 27017, 6379],
            'Other': [4000, 9000, 9999]
        }
        
    def check_port(self, port):
        """Check if a port is in use"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        return result == 0
    
    def find_server_ports(self):
        """Find actual ports being used by servers"""
        # Check common ports for frontend (Vite/Next.js)
        frontend_ports = [5173, 5174, 3000, 3001, 4173]
        for port in frontend_ports:
            if self.check_port(port):
                pid = self.find_process_by_port(port)
                if pid:
                    # Try to verify it's actually our frontend
                    try:
                        if HAS_PSUTIL:
                            proc = psutil.Process(pid)
                            cmdline = ' '.join(proc.cmdline())
                            if 'next' in cmdline.lower() or 'vite' in cmdline.lower() or 'frontend' in cmdline.lower():
                                self.ports['frontend']['current'] = port
                                break
                        else:
                            # Fallback: assume it's our frontend if on expected ports
                            self.ports['frontend']['current'] = port
                            break
                    except:
                        pass
        
        # Check common ports for backend (FastAPI/Uvicorn)
        backend_ports = [8000, 8001, 8080, 8081]
        for port in backend_ports:
            if self.check_port(port):
                pid = self.find_process_by_port(port)
                if pid:
                    # Try to verify it's actually our backend
                    try:
                        if HAS_PSUTIL:
                            proc = psutil.Process(pid)
                            cmdline = ' '.join(proc.cmdline())
                            if 'uvicorn' in cmdline.lower() or 'fastapi' in cmdline.lower() or 'app.server' in cmdline.lower():
                                self.ports['backend']['current'] = port
                                break
                        else:
                            # Fallback: assume it's our backend if on expected ports
                            self.ports['backend']['current'] = port
                            break
                    except:
                        pass
    
    def parse_server_output(self, server, line):
        """Parse server output to detect actual port being used"""
        line = line.strip()
        
        if server == 'frontend':
            # Next.js patterns
            if 'ready started server on' in line.lower() and 'http' in line:
                # Extract port from URLs like http://localhost:3000
                import re
                match = re.search(r':(\d+)', line)
                if match:
                    self.ports['frontend']['current'] = int(match.group(1))
            # Vite patterns
            elif 'local:' in line.lower() and 'http' in line:
                import re
                match = re.search(r':(\d+)', line)
                if match:
                    self.ports['frontend']['current'] = int(match.group(1))
        
        elif server == 'backend':
            # Uvicorn/FastAPI patterns
            if 'uvicorn running on' in line.lower() or 'application startup complete' in line.lower():
                import re
                match = re.search(r':(\d+)', line)
                if match:
                    self.ports['backend']['current'] = int(match.group(1))
    
    def find_process_by_port(self, port):
        """Find process using a specific port"""
        if HAS_PSUTIL:
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    connections = proc.connections()
                    for conn in connections:
                        if conn.laddr.port == port:
                            return proc.pid
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        else:
            # Fallback to lsof command
            try:
                result = subprocess.run(
                    ['lsof', '-ti', f':{port}'],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0 and result.stdout.strip():
                    return int(result.stdout.strip().split('\n')[0])
            except:
                pass
        return None
    
    def get_status(self, server):
        """Get the status of a server"""
        # First, try to find servers on any port
        self.find_server_ports()
        
        # Use detected port or fall back to default
        port = self.ports[server].get('current') or self.ports[server]['default']
        
        # Check if port is in use
        is_running = self.check_port(port)
        pid = None
        
        if is_running:
            pid = self.find_process_by_port(port)
            if pid:
                self.pids[server] = pid
        
        return {
            'running': is_running,
            'pid': pid,
            'port': port if is_running else self.ports[server]['default']
        }
    
    def start_backend(self):
        """Start the backend server"""
        try:
            # Check if already running on any common port
            self.find_server_ports()
            if self.ports['backend']['current']:
                return {'success': False, 'error': f'Backend already running on port {self.ports["backend"]["current"]}'}
            
            # Start backend using make
            env = os.environ.copy()
            env['PYTHONUNBUFFERED'] = '1'
            
            process = subprocess.Popen(
                ['make', 'dev-backend'],
                cwd=self.project_root,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                text=True
            )
            
            self.processes['backend'] = process
            
            # Monitor output to detect actual port
            import threading
            def monitor_output():
                for line in process.stdout:
                    self.output_buffers['backend'].append(line)
                    self.parse_server_output('backend', line)
                    # Keep only last 100 lines
                    self.output_buffers['backend'] = self.output_buffers['backend'][-100:]
            
            thread = threading.Thread(target=monitor_output, daemon=True)
            thread.start()
            
            # Wait for startup and check multiple ports
            for _ in range(10):  # Try for 10 seconds
                time.sleep(1)
                self.find_server_ports()
                if self.ports['backend']['current']:
                    return {'success': True, 'port': self.ports['backend']['current']}
            
            return {'success': False, 'error': 'Backend failed to start within timeout'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def start_frontend(self):
        """Start the frontend server"""
        try:
            # Check if already running on any common port
            self.find_server_ports()
            if self.ports['frontend']['current']:
                return {'success': False, 'error': f'Frontend already running on port {self.ports["frontend"]["current"]}'}
            
            # Start frontend using make
            process = subprocess.Popen(
                ['make', 'dev-frontend'],
                cwd=self.project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                text=True
            )
            
            self.processes['frontend'] = process
            
            # Monitor output to detect actual port
            import threading
            def monitor_output():
                for line in process.stdout:
                    self.output_buffers['frontend'].append(line)
                    self.parse_server_output('frontend', line)
                    # Keep only last 100 lines
                    self.output_buffers['frontend'] = self.output_buffers['frontend'][-100:]
            
            thread = threading.Thread(target=monitor_output, daemon=True)
            thread.start()
            
            # Wait for startup and check multiple ports
            for _ in range(15):  # Try for 15 seconds (frontend takes longer)
                time.sleep(1)
                self.find_server_ports()
                if self.ports['frontend']['current']:
                    return {'success': True, 'port': self.ports['frontend']['current']}
            
            return {'success': False, 'error': 'Frontend failed to start within timeout'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def stop_backend(self):
        """Stop the backend server"""
        try:
            # Find the actual port being used
            self.find_server_ports()
            port = self.ports['backend']['current'] or self.ports['backend']['default']
            
            # Find and kill process on that port
            pid = self.find_process_by_port(port)
            if pid:
                os.kill(pid, signal.SIGTERM)
                time.sleep(1)
                
                # Force kill if still running
                if self.check_port(port):
                    os.kill(pid, signal.SIGKILL)
                
                self.ports['backend']['current'] = None
                return {'success': True}
            else:
                return {'success': False, 'error': 'Backend not running'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def stop_frontend(self):
        """Stop the frontend server"""
        try:
            # Find the actual port being used
            self.find_server_ports()
            port = self.ports['frontend']['current'] or self.ports['frontend']['default']
            
            # Find and kill process on that port
            pid = self.find_process_by_port(port)
            if pid:
                os.kill(pid, signal.SIGTERM)
                time.sleep(1)
                
                # Force kill if still running
                if self.check_port(port):
                    os.kill(pid, signal.SIGKILL)
                
                self.ports['frontend']['current'] = None
                return {'success': True}
            else:
                return {'success': False, 'error': 'Frontend not running'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def restart_backend(self):
        """Restart the backend server"""
        stop_result = self.stop_backend()
        time.sleep(2)
        return self.start_backend()
    
    def restart_frontend(self):
        """Restart the frontend server"""
        stop_result = self.stop_frontend()
        time.sleep(2)
        return self.start_frontend()
    
    def scan_ports(self):
        """Scan common ports and return their status"""
        port_status = {}
        
        for category, ports in self.common_ports.items():
            port_status[category] = []
            for port in ports:
                status = {
                    'port': port,
                    'in_use': self.check_port(port),
                    'pid': None,
                    'process': None
                }
                
                if status['in_use']:
                    pid = self.find_process_by_port(port)
                    if pid:
                        status['pid'] = pid
                        # Try to get process name
                        if HAS_PSUTIL:
                            try:
                                proc = psutil.Process(pid)
                                status['process'] = proc.name()
                            except:
                                status['process'] = 'Unknown'
                        else:
                            # Use ps command as fallback
                            try:
                                result = subprocess.run(
                                    ['ps', '-p', str(pid), '-o', 'comm='],
                                    capture_output=True,
                                    text=True
                                )
                                if result.returncode == 0:
                                    status['process'] = result.stdout.strip().split('/')[-1]
                            except:
                                status['process'] = 'Unknown'
                
                port_status[category].append(status)
        
        return port_status
    
    def kill_port(self, port):
        """Kill process running on a specific port"""
        try:
            pid = self.find_process_by_port(port)
            if pid:
                # Try graceful termination first
                os.kill(pid, signal.SIGTERM)
                time.sleep(1)
                
                # Force kill if still running
                if self.check_port(port):
                    os.kill(pid, signal.SIGKILL)
                    time.sleep(0.5)
                
                # Check if successfully killed
                if not self.check_port(port):
                    return {'success': True, 'message': f'Killed process {pid} on port {port}'}
                else:
                    return {'success': False, 'error': f'Failed to kill process on port {port}'}
            else:
                return {'success': False, 'error': f'No process found on port {port}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}


class DashboardHandler(SimpleHTTPRequestHandler):
    """HTTP request handler for the dashboard"""
    
    server_manager = ServerManager()
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/':
            # Serve the dashboard HTML
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            dashboard_path = Path(__file__).parent / 'dashboard.html'
            with open(dashboard_path, 'rb') as f:
                self.wfile.write(f.read())
                
        elif parsed_path.path == '/api/status':
            # Return server status
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            status = {
                'backend': self.server_manager.get_status('backend'),
                'frontend': self.server_manager.get_status('frontend')
            }
            
            self.wfile.write(json.dumps(status).encode())
            
        elif parsed_path.path == '/api/ports':
            # Return port scan results
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            port_status = self.server_manager.scan_ports()
            self.wfile.write(json.dumps(port_status).encode())
            
        else:
            self.send_error(404)
    
    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/control/'):
            parts = parsed_path.path.split('/')
            if len(parts) == 5:
                server = parts[3]
                action = parts[4]
                
                result = self.handle_control(server, action)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
            else:
                self.send_error(400)
        elif parsed_path.path.startswith('/api/kill-port/'):
            parts = parsed_path.path.split('/')
            if len(parts) == 4:
                try:
                    port = int(parts[3])
                    result = self.server_manager.kill_port(port)
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                except ValueError:
                    self.send_error(400, 'Invalid port number')
            else:
                self.send_error(400)
        else:
            self.send_error(404)
    
    def handle_control(self, server, action):
        """Handle server control actions"""
        if server == 'backend':
            if action == 'start':
                return self.server_manager.start_backend()
            elif action == 'stop':
                return self.server_manager.stop_backend()
            elif action == 'restart':
                return self.server_manager.restart_backend()
                
        elif server == 'frontend':
            if action == 'start':
                return self.server_manager.start_frontend()
            elif action == 'stop':
                return self.server_manager.stop_frontend()
            elif action == 'restart':
                return self.server_manager.restart_frontend()
        
        return {'success': False, 'error': 'Invalid server or action'}
    
    def log_message(self, format, *args):
        """Override to suppress default logging"""
        pass


def main():
    """Main entry point"""
    port = 9999
    server_address = ('', port)
    
    print(f"🚀 Vana Dashboard Server")
    print(f"📊 Starting dashboard on http://localhost:{port}")
    print(f"📁 Project root: {PROJECT_ROOT}")
    print(f"✨ Dashboard ready!")
    print(f"\nOpen http://localhost:{port} in your browser")
    print("\nPress Ctrl+C to stop the dashboard server")
    
    httpd = HTTPServer(server_address, DashboardHandler)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Dashboard server stopped")
        sys.exit(0)


if __name__ == '__main__':
    main()