(function () {
    "use strict";
    if (!window.C3_IsSupported) {
        if (window.__devicesLinuxLog) {
            window.__devicesLinuxLog("warn", "supportcheck bloqueou o boot; tentando iniciar o runtime Linux");
        }
        window.C3_IsSupported = true;
    }
})();
