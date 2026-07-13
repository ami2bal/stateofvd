#!/usr/bin/env python3
"""Serveur dev no-cache pour state-of-vd-pixel."""
from __future__ import annotations

import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8771
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)
    handler = functools.partial(NoCacheHandler, directory=root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"State of VD Pixel → http://127.0.0.1:{port}/")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
