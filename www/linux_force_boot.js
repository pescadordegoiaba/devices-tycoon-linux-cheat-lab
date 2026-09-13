(function () {
    "use strict";

    const tag = "[devices-linux]";

    function stringify(value) {
        if (value instanceof Error) return value.stack || value.message;
        if (typeof value === "object") {
            try { return JSON.stringify(value); } catch (_) {}
        }
        return String(value);
    }

    function log(level, ...values) {
        const line = `${tag} ${level} ${values.map(stringify).join(" ")}\n`;
        try { (console[level] || console.log).call(console, tag, ...values); } catch (_) {}
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon("/__linuxlog", new Blob([line], { type: "text/plain" }));
            } else {
                fetch("/__linuxlog", { method: "POST", body: line, keepalive: true }).catch(() => {});
            }
        } catch (_) {}
    }

    window.__devicesLinuxLog = log;
    window.addEventListener("error", event => {
        log("error", "window.error", event.message || "", event.filename || "", event.lineno || 0);
    }, true);
    window.addEventListener("unhandledrejection", event => {
        log("error", "unhandledrejection", event.reason || "sem motivo informado");
    });

    let webgl = null;
    try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (context) {
            const debug = context.getExtension("WEBGL_debug_renderer_info");
            webgl = {
                version: context.getParameter(context.VERSION),
                renderer: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "indisponivel"
            };
        }
    } catch (error) {
        webgl = { error: stringify(error) };
    }
    log("info", "boot", { webgl, userAgent: navigator.userAgent });

    window.addEventListener("load", () => {
        log("info", "window.load", { supported: window.C3_IsSupported === true });
        let checks = 0;
        const timer = setInterval(() => {
            checks += 1;
            const canvas = document.querySelector("canvas");
            if (window.c3_runtimeInterface && canvas) {
                log("info", "runtime ativo", { canvas: `${canvas.width}x${canvas.height}` });
                clearInterval(timer);
            } else if (checks >= 150) {
                log("error", "runtime nao ficou pronto em 30 segundos");
                clearInterval(timer);
            }
        }, 200);
    });
})();
