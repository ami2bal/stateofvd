#!/usr/bin/env python3
"""Serveur dev NO-CACHE pour State of VD.

Sert les fichiers avec `Cache-Control: no-store` → le navigateur ne garde JAMAIS
l'ancien JS/JSON en cache (fini les « je ne vois pas mes changements, pb de cache ? »).

Modes :
  - dépôt parent : racine = workspace (URLs /ce dossier/)
  - dépôt standalone (GitHub) : racine = ce dossier

Usage :
    python ce dossier/serve.py 8770     # dépôt parent
    python serve.py 8770                       # standalone

Accueil : …/   ·  Jeu : …/play.html
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

PROTO_DIR = Path(__file__).resolve().parent
# dépôt parent si parent.parent contient ce dossier
_workspace = PROTO_DIR.parent.parent
_dépôt parent = (_workspace / "proto" / "state-of-vd" / "play.html").is_file()
ROOT = _workspace if _dépôt parent else PROTO_DIR
APP_PATH = "/ce dossier/" if _dépôt parent else "/"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter logs
        pass


if __name__ == "__main__":
    play = PROTO_DIR / "play.html"
    if not play.is_file():
        sys.exit(f"play.html introuvable sous {PROTO_DIR}")
    pixi_local = PROTO_DIR / "vendor" / "pixi.min.js"
    pixi_mono = _workspace / "scripts" / "jobs" / "vendor" / "pixi.min.js"
    if not pixi_local.is_file() and not pixi_mono.is_file():
        print("WARN: pixi.min.js manquant (vendor/ ou vendor (ou parent/scripts/jobs/vendor)/)", file=sys.stderr)

    httpd = HTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    print("State of — serveur NO-CACHE")
    print(f"  accueil : http://127.0.0.1:{PORT}{APP_PATH}")
    print(f"  jeu     : http://127.0.0.1:{PORT}{APP_PATH}play.html")
    print(f"  racine  : {ROOT}")
    print("  (Ctrl+C pour arrêter · un simple F5 recharge la derniere version)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\narret.")
