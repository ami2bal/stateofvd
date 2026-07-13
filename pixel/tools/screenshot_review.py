#!/usr/bin/env python3
"""Serve app briefly + capture zoomed/unzoomed screenshots via Playwright."""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "assets" / "composed" / "shots"
PORT = 8773


def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(
        [sys.executable, str(ROOT / "serve.py"), str(PORT)],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(1.2)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2500)  # boot + intro fly
            # dismiss toast area - full page
            page.screenshot(path=str(SHOTS / "01_boot_overview.png"), full_page=False)
            # zoom in via wheel on canvas
            canvas = page.locator("canvas").first
            box = canvas.bounding_box()
            if box:
                cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
                page.mouse.move(cx, cy)
                for _ in range(8):
                    page.mouse.wheel(0, -120)
                    page.wait_for_timeout(80)
                page.wait_for_timeout(400)
                page.screenshot(path=str(SHOTS / "02_zoom_interiors.png"))
                # pan to parliament-ish left
                page.mouse.move(cx, cy)
                page.mouse.down()
                page.mouse.move(cx + 180, cy + 40, steps=12)
                page.mouse.up()
                page.wait_for_timeout(300)
                page.screenshot(path=str(SHOTS / "03_pan_parlement.png"))
                # zoom out
                for _ in range(10):
                    page.mouse.wheel(0, 120)
                    page.wait_for_timeout(60)
                page.wait_for_timeout(300)
                page.screenshot(path=str(SHOTS / "04_zoom_out.png"))
            # start a scenario
            page.locator(".sc-card").first.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=str(SHOTS / "05_scenario_running.png"))
            browser.close()
        print("OK shots in", SHOTS)
        for p in sorted(SHOTS.glob("*.png")):
            print(" ", p.name, p.stat().st_size)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
