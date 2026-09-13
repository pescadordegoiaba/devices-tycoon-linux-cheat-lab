/* Backend dos prompts do plugin CV_MobileDialog para o navegador Linux. */
(function () {
    "use strict";
    window.__devicesLinuxMobileDialog = true;
    const notification = {
        alert(message, callback) {
            window.alert(String(message));
            if (typeof callback === "function") callback();
        },
        confirm(message, callback) {
            const accepted = window.confirm(String(message));
            if (typeof callback === "function") callback(accepted ? 1 : 2);
        },
        prompt(message, callback, title, buttons, defaultText) {
            const value = window.prompt(String(message), defaultText == null ? "" : String(defaultText));
            if (typeof callback === "function") {
                callback({ buttonIndex: value === null ? 2 : 1, input1: value === null ? "" : value });
            }
        },
        beep() {}
    };
    try {
        Object.defineProperty(navigator, "notification", {
            configurable: true,
            enumerable: false,
            value: notification
        });
    } catch (_) {
        try { navigator.notification = notification; } catch (__) {}
    }
})();
