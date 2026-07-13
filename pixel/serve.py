#!/usr/bin/env python3
"""Serveur dev no-cache — racine = repo stateofvd (main + pixel/).

Ouvre : http://127.0.0.1:8771/pixel/
Les modules métier (flows, inspector, flow-engine) sont à la racine du repo.
"""
from __future__ import annotations

import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header(
            "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"
        )
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        if self.path in ("/", "/index.html", ""):
            self.send_response(302)
            self.send_header("Location", "/pixel/")
            self.end_headers()
            return
        return super().do_GET()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8771
    pixel_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(pixel_dir)  # .../stateofvd
    os.chdir(repo_root)
    handler = functools.partial(NoCacheHandler, directory=repo_root)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Repo root → http://127.0.0.1:{port}/")
        print(f"  Pixel    → http://127.0.0.1:{port}/pixel/")
        print(f"  Main     → http://127.0.0.1:{port}/")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
