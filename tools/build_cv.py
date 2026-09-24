#!/usr/bin/env python3
"""Render the CV HTML to PDF with headless Chrome.

    python3 tools/build_cv.py

Chrome prints real text, so the result stays selectable and therefore readable
by applicant tracking systems — unlike anything that rasterises the page.
Source lives in cv/ (gitignored: it holds a private address and phone number);
only the finished PDFs are committed, because the site links to them.
"""
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

JOBS = [("cv/lebenslauf.html", "cv.pdf"), ("cv/cv-english.html", "cv-en.pdf")]


def page_count(path):
    """Read /Count off the page tree.

    mdls was the obvious route and returns null for a file Spotlight has not
    indexed yet, which is every file this script has just written.
    """
    data = open(path, "rb").read()
    for pat in (rb"/Type\s*/Pages[^>]*?/Count\s+(\d+)", rb"/Count\s+(\d+)[^>]*?/Type\s*/Pages"):
        m = re.search(pat, data, re.S)
        if m:
            return int(m.group(1))
    return None


def main():
    if not os.path.exists(CHROME):
        sys.exit(f"Chrome not found at {CHROME}")
    for src, out in JOBS:
        src_path = os.path.join(ROOT, src)
        if not os.path.exists(src_path):
            print(f"skip {src} (missing)")
            continue
        tmp = os.path.join(ROOT, out + ".tmp.pdf")
        subprocess.run([
            CHROME, "--headless", "--disable-gpu", "--no-sandbox",
            "--no-pdf-header-footer",           # no "about:blank" / page URL furniture
            "--print-to-pdf-no-header",
            f"--print-to-pdf={tmp}",
            "file://" + src_path,
        ], check=True, capture_output=True, timeout=120)
        shutil.move(tmp, os.path.join(ROOT, out))
        dst = os.path.join(ROOT, out)
        size = os.path.getsize(dst) / 1024
        pages = page_count(dst)
        flag = "" if pages and pages <= 2 else "   <-- CHECK: a CV should be 1-2 pages"
        print(f"{src}  ->  {out}  ({size:.0f} KB, {pages} page(s)){flag}")


if __name__ == "__main__":
    main()
