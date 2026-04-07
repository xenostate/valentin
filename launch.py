#!/usr/bin/env python3
"""
Fallback launcher — use this if you don't have Node.js/Electron.
Opens the app in your default browser as a local server (localhost).
Ctrl+C to quit.
"""
import http.server
import socket
import threading
import webbrowser
import os
import signal
import sys

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    port = find_free_port()
    url = f'http://localhost:{port}'

    handler = http.server.SimpleHTTPRequestHandler
    handler.log_message = lambda *a: None  # silence request logs

    server = http.server.HTTPServer(('localhost', port), handler)

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    print(f'Korean Reading Practice running at {url}')
    print('Opening browser… (press Ctrl+C to quit)')

    webbrowser.open(url)

    try:
        signal.pause()  # wait indefinitely on Unix
    except (AttributeError, KeyboardInterrupt):
        # Windows doesn't have signal.pause
        try:
            while True:
                threading.Event().wait(1)
        except KeyboardInterrupt:
            pass

    print('\nShutting down.')
    server.shutdown()

if __name__ == '__main__':
    main()
