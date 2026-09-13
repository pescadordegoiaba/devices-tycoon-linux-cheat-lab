#!/usr/bin/env python3
"""Servidor local do launcher Linux de Devices Tycoon."""

from __future__ import annotations

import argparse
import http.server
import os
from pathlib import Path


class DevicesTycoonHandler(http.server.SimpleHTTPRequestHandler):
    page_log: Path
    main_script: Path

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/scripts/main-linux.js":
            source = self.main_script.read_text(encoding="utf-8")
            old = 'exportType:"cordova"'
            new = 'exportType:"html5"'
            if source.count(old) != 1:
                self.send_error(500, "Nao foi possivel gerar o runtime Linux")
                return

            source = source.replace(old, new, 1)
            mobile_dialog = 'this._isMobile=this.AreDOMDependenciesCleared(),this._isDebug=!0,this._Dialog=null'
            linux_dialog = 'this._isMobile=!0,this._isDebug=!0,this._Dialog=null'
            if source.count(mobile_dialog) != 1:
                self.send_error(500, "Backend de dialogo Linux nao encontrado no runtime")
                return
            payload = source.replace(mobile_dialog, linux_dialog, 1).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def do_POST(self) -> None:
        if self.path != "/__linuxlog":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        payload = self.rfile.read(min(length, 1_000_000))
        message = payload.decode("utf-8", errors="replace")
        with self.page_log.open("a", encoding="utf-8") as stream:
            stream.write(message)
            if message and not message.endswith("\n"):
                stream.write("\n")
        for line in message.splitlines():
            print(f"[JOGO] {line}", flush=True)
        self.send_response(204)
        self.end_headers()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="www")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8094)
    parser.add_argument("--log", default="linux_page.log")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not (root / "index_linux.html").is_file():
        parser.error(f"index_linux.html nao encontrado em {root}")

    log = Path(args.log).resolve()
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text("", encoding="utf-8")

    DevicesTycoonHandler.page_log = log
    DevicesTycoonHandler.main_script = root / "scripts/main.js"
    os.chdir(root)

    server = http.server.ThreadingHTTPServer((args.host, args.port), DevicesTycoonHandler)
    print(f"[INFO] Jogo: http://{args.host}:{args.port}/index_linux.html", flush=True)
    print(f"[INFO] Log: {log}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
