import re
import sys
from pathlib import Path
import urllib.request

packs = [
    "rpg-urban-pack",
    "tiny-town",
    "tiny-dungeon",
    "pixel-platformer-farm-expansion",
    "roguelike-rpg-pack",
    "rpg-urban-kit",
]

for pack in packs:
    url = f"https://kenney.nl/assets/{pack}"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            html = r.read().decode("utf-8", "ignore")
    except Exception as e:
        print(pack, "FAIL page", e)
        continue
    zips = re.findall(r"https://kenney\.nl/media/pages/assets/[^\"']+\.zip", html)
    zips += re.findall(r"href=['\"]([^'\"]+\.zip)['\"]", html)
    zips = list(dict.fromkeys(zips))
    print("==", pack, url)
    for z in zips:
        print(" ", z)
    # also relative continue without donating pattern
    cont = re.findall(r"media/pages/assets/[^\s\"']+\.zip", html)
    for z in cont[:5]:
        print("  rel", z)
