#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/www"
HOST="127.0.0.1"
PORT="${PORT:-8094}"
URL="http://${HOST}:${PORT}/index_linux.html"
DATA_BASE="${XDG_DATA_HOME:-$HOME/.local/share}"
PROFILE_DIR="${PROFILE_DIR:-$DATA_BASE/devices-tycoon-linux/chromium-profile}"
GPU_MODE="${GPU_MODE:-angle}"

pick_browser() {
  local candidate
  for candidate in brave brave-browser chromium google-chrome-stable google-chrome; do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done
  return 1
}

BROWSER_CMD="${BROWSER_CMD:-$(pick_browser || true)}"
if [[ -z "$BROWSER_CMD" ]]; then
  echo "[ERRO] Nenhum navegador Chromium compativel foi encontrado."
  echo "Instale Brave/Chromium ou use BROWSER_CMD=/caminho/do/navegador."
  exit 1
fi

if [[ ! -f "$APP/index_linux.html" ]]; then
  echo "[ERRO] Arquivos do jogo nao encontrados em: $APP"
  exit 1
fi

mkdir -p "$PROFILE_DIR"
unset MESA_LOADER_DRIVER_OVERRIDE
unset LIBGL_ALWAYS_SOFTWARE
unset GALLIUM_DRIVER

browser_flags=(
  --user-data-dir="$PROFILE_DIR"
  --app="$URL"
  --start-maximized
  --ozone-platform=x11
  --disable-vulkan
  --disable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan
  --ignore-gpu-blocklist
  --enable-webgl
  --enable-gpu-rasterization
)

case "$GPU_MODE" in
  angle)
    ;;
  nosandbox)
    browser_flags+=(--disable-gpu-sandbox)
    ;;
  swiftshader)
    browser_flags+=(--enable-unsafe-swiftshader --use-angle=swiftshader)
    ;;
  *)
    echo "[ERRO] GPU_MODE invalido: $GPU_MODE (use angle, nosandbox ou swiftshader)"
    exit 2
    ;;
esac

echo "[INFO] Devices Tycoon para Linux"
echo "[INFO] Navegador: $BROWSER_CMD"
echo "[INFO] Modo grafico: $GPU_MODE"
echo "[INFO] Saves/perfil: $PROFILE_DIR"
echo "[INFO] Log: $ROOT/linux_page.log"

python3 "$ROOT/devices_linux_server.py" \
  --root "$APP" --host "$HOST" --port "$PORT" --log "$ROOT/linux_page.log" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ready=0
for _attempt in {1..50}; do
  if curl --silent --fail --output /dev/null "$URL"; then
    ready=1
    break
  fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  echo "[ERRO] O servidor local nao iniciou na porta $PORT."
  exit 1
fi

"$BROWSER_CMD" "${browser_flags[@]}" "$@"
