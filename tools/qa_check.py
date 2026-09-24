#!/usr/bin/env python3
"""Crawl the live site and report anything broken.

    python3 tools/qa_check.py [https://sufyankadiwala.de]

Checks every page reachable from the homepage, plus the pages nothing links to
(the demos are linked only from JavaScript, and /german/ not at all), then every
href/src/meta URL found on them.

Two failure modes matter here and only one is obvious:
  * a hard 4xx/5xx
  * a "silent 404" — Cloudflare Pages used to answer any unknown path with the
    homepage and a 200, so a dead cv.pdf looked fine to curl. A top-level
    404.html fixed that, and this script guards against it coming back.
"""
import re
import ssl
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://sufyankadiwala.de").rstrip("/") + "/"
HOST = urlparse(BASE).netloc
CTX = ssl.create_default_context()
UA = {"User-Agent": "Mozilla/5.0 (compatible; portfolio-qa)"}
# Files whose content-type must not be text/html — an HTML body here means the
# file is missing and something served a page in its place.
ASSET_EXT = {"pdf", "png", "jpg", "jpeg", "svg", "webp", "json", "js", "css",
             "woff2", "ico", "txt", "xml"}
# LinkedIn answers 999 to anything that is not a browser; it is not a dead link.
TOLERATE = {"linkedin.com": {999, 403, 429}}


class _Redirect308(urllib.request.HTTPRedirectHandler):
    """urllib handles 301/302/303/307 but not 308, which is what Pages uses."""

    def http_error_308(self, req, fp, code, msg, headers):
        return self.http_error_301(req, fp, 301, msg, headers)


_OPENER = urllib.request.build_opener(_Redirect308)


def fetch(url, attempts=2):
    for i in range(attempts):
        try:
            r = _OPENER.open(urllib.request.Request(url, headers=UA), timeout=30)
            return r.status, r.headers.get("content-type", ""), r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers.get("content-type", ""), b""
        except Exception as e:
            if i == attempts - 1:      # a flaky connection is not a broken link
                return None, str(e), b""
    return None, "", b''


def crawl():
    pages, refs, seen = {}, {}, set()
    queue = [BASE, BASE + "german/"]
    attr = re.compile(r'(?<![\w-])(?:href|src|content)\s*=\s*["\']([^"\']+)["\']', re.I)
    comment = re.compile(r"<!--.*?-->", re.S)
    while queue:
        u = queue.pop()
        if u in seen:
            continue
        seen.add(u)
        st, ct, body = fetch(u)
        if st != 200 or "text/html" not in ct:
            continue
        pages[u] = True
        for m in attr.finditer(comment.sub("", body.decode("utf-8", "replace"))):
            v = m.group(1).strip()
            if v.startswith(("data:", "mailto:", "tel:", "javascript:", "#")) or "{" in v:
                continue
            if not re.match(r"^(https?:|/|\.|[\w-]+[./])", v):
                continue
            a = urljoin(u, v).split("#")[0]
            refs.setdefault(a, set()).add(u)
            p = urlparse(a)
            last = p.path.rsplit("/", 1)[-1]
            if p.netloc == HOST and (p.path.endswith((".html", "/")) or "." not in last):
                queue.append(a)
    # links the project cards render from JavaScript
    js = fetch(BASE + "js/script.js")[2].decode("utf-8", "replace")
    for m in re.finditer(r'(?:code|live|demo|file|verify):\s*"([^"]+)"', js):
        refs.setdefault(urljoin(BASE, m.group(1)), set()).add("js/script.js")
    return pages, refs


def main():
    pages, refs = crawl()
    print(f"pages crawled: {len(pages)}")

    def check(a):
        st, ct, _ = fetch(a)
        return a, st, ct.split(";")[0]

    with ThreadPoolExecutor(12) as ex:
        results = list(ex.map(check, sorted(refs)))

    hard, silent = [], []
    for a, st, ct in results:
        host = urlparse(a).netloc
        allowed = next((v for k, v in TOLERATE.items() if k in host), set())
        last = urlparse(a).path.rsplit("/", 1)[-1]
        ext = last.rsplit(".", 1)[-1].lower() if "." in last else ""
        if host == HOST and st == 200 and ct == "text/html" and ext in ASSET_EXT:
            silent.append((a, sorted(refs[a])))
        elif st is None or (st >= 400 and st not in allowed):
            hard.append((a, st, sorted(refs[a])))

    print(f"references checked: {len(results)}")
    for label, rows in (("BROKEN", hard), ("SILENT 404 (file missing, HTML served)", silent)):
        print(f"\n### {label}: {len(rows)}")
        for row in rows:
            print(f"  {row[0]}\n      status {row[1] if len(row) == 3 else '200/html'}  from {row[-1]}")

    # a missing path must be a real 404, not the homepage with a 200
    st, ct, body = fetch(BASE + "definitely-not-a-real-path-qa")
    print(f"\nunknown path -> {st} ({'ok' if st == 404 else 'EXPECTED 404'})")
    ok = not hard and not silent and st == 404
    print("\n" + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
