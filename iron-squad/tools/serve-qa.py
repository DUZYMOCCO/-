from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv)>1 else 8001), QuietHandler).serve_forever()
