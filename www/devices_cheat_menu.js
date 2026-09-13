(function () {
    "use strict";

    const TAG = "[devices-cheats]";
    const STORE_KEY = "devices_tycoon_linux_cheats_v1";
    const MAX_MONEY = 9_000_000_000_000_000;
    const MAX_RESEARCH = 999_999_999;
    let runtime = null;
    let toastTimer = 0;
    const readyCallbacks = [];

    const state = loadState();

    function loadState() {
        const defaults = {
            infiniteMoney: true,
            infiniteResearch: true,
            sandbox: true,
            vip: false,
            osUpgradeMultiplier: 1,
            extendedHardware: {},
            overrides: {}
        };
        try { return Object.assign(defaults, JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); }
        catch (_) { return defaults; }
    }

    function saveState() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
    }

    function globals() {
        try { return runtime && runtime.globalVars || null; } catch (_) { return null; }
    }

    function layoutName() {
        try { return runtime && runtime.layout && runtime.layout.name || "carregando"; }
        catch (_) { return "carregando"; }
    }

    function setGlobal(name, value, quiet) {
        const vars = globals();
        if (!vars || !(name in vars)) return false;
        const current = vars[name];
        let parsed = value;
        if (typeof current === "number") {
            parsed = Number(value);
            if (!Number.isFinite(parsed)) return false;
        } else if (typeof current === "boolean") {
            parsed = value === true || value === "true" || value === "ON";
        } else {
            parsed = String(value);
        }
        vars[name] = parsed;
        if (!quiet) toast(`${name} = ${formatValue(parsed)}`);
        return true;
    }

    function applyCheats() {
        const vars = globals();
        if (!vars) return;
        if (state.infiniteMoney) {
            setGlobal("Budget", MAX_MONEY, true);
            setGlobal("UnlimitedBudget", "ON", true);
        }
        if (state.infiniteResearch) setGlobal("ResearchCoins", MAX_RESEARCH, true);
        if (state.sandbox) {
            setGlobal("SandboxMode", "ON", true);
            setGlobal("SandboxMode_Opened", "OPENED", true);
            setGlobal("UnlimitedBudget", "ON", true);
        }
        if (state.vip) applyVip(vars);
        for (const [name, value] of Object.entries(state.overrides || {})) setGlobal(name, value, true);
        updateLiveStatus();
    }

    // The original project has no single VIP flag. These are the premium gates
    // used by its event sheets; applying them locally is enough for the offline
    // Linux build and does not pretend to create a store purchase receipt.
    function applyVip(vars) {
        const explicit = {
            ADS: "OFF",
            MyCPU_License: "BUSINESS",
            MyOsLicense: "BUSINESS",
            MyOsLicenseType: "PAY ONCE",
            ColorEditorPage_ADS: "OFF",
            InvestingPageADS_Showed: "YES"
        };
        let changed = 0;
        for (const [name, value] of Object.entries(explicit)) if (name in vars && setGlobal(name, value, true)) changed++;
        for (const name of Object.keys(vars)) {
            if (/_Opened$/i.test(name) && typeof vars[name] === "string") {
                if (setGlobal(name, "OPENED", true)) changed++;
            } else if (/ADS/i.test(name) && /Showed/i.test(name) && typeof vars[name] === "string") {
                if (setGlobal(name, "YES", true)) changed++;
            }
        }
        for (const name of FEATURE_FIELDS) {
            if (name in vars && setGlobal(name, "ON", true)) changed++;
            const opened = `${name}_Opened`;
            if (opened in vars && typeof vars[opened] === "string" && setGlobal(opened, "OPENED", true)) changed++;
        }
        return changed;
    }

    function captureRuntime(rt) {
        if (!rt || runtime === rt) return;
        runtime = rt;
        window.DT_RUNTIME = rt;
        const status = document.getElementById("dt-runtime-state");
        if (status) {
            status.textContent = "runtime conectado";
            status.classList.add("dt-ready");
        }
        for (const callback of readyCallbacks.splice(0)) {
            try { callback(rt); } catch (error) { console.error(TAG, error); }
        }
        applyCheats();
        refreshEditors();
        console.log(TAG, "runtime capturado", rt.projectName || "Devices Tycoon");
    }

    function hookRunOnStartup() {
        const capture = rt => captureRuntime(rt);
        if (typeof self.runOnStartup === "function") {
            try { self.runOnStartup(capture); return; } catch (_) {}
        }

        let stored = null;
        const queued = [capture];
        try {
            Object.defineProperty(self, "runOnStartup", {
                configurable: true,
                enumerable: true,
                get() {
                    if (stored) return stored;
                    return callback => { if (typeof callback === "function") queued.push(callback); };
                },
                set(fn) {
                    if (typeof fn !== "function") { stored = fn; return; }
                    stored = callback => fn(callback);
                    for (const callback of queued.splice(0)) {
                        try { stored(callback); } catch (error) { console.error(TAG, error); }
                    }
                }
            });
        } catch (error) {
            console.error(TAG, "falha ao capturar runtime", error);
        }
    }

    const SMARTPHONE_FIELDS = [
        ["SmartphoneWidth", "Largura do aparelho"], ["SmartphoneHeight", "Altura do aparelho"],
        ["SmartphoneDepth", "Espessura"], ["SmartphoneAngles", "Curvatura frontal"],
        ["EdgingDepth", "Espessura da borda"], ["ScreenWidth", "Largura da tela"],
        ["ScreenHeight", "Altura da tela"], ["ScreenAngles", "Curvatura da tela"],
        ["ScreenResolution", "Resolução (nível)"], ["ScreenRefreshRate", "Refresh rate (nível)"],
        ["ScreenDensity", "Densidade (nível)"], ["CameraMPX_Main", "Câmera principal (nível)"],
        ["CameraZoom", "Zoom (nível)"], ["CameraVideoFPS", "Vídeo FPS (nível)"],
        ["FrontalCameraResolution", "Câmera frontal (nível)"], ["ProcessorCores", "Núcleos (nível)"],
        ["ProcessorRefreshRate", "Clock (nível)"], ["ProcessorTechprocess", "Litografia (nível)"],
        ["ProcessorCasheMemory", "Cache (nível)"], ["RAM", "RAM (nível)"],
        ["ROM", "Armazenamento (nível)"], ["Battery", "Bateria (nível)"]
    ];

    const CPU_FIELDS = [
        ["ProcessorCores", "Núcleos"], ["ProcessorRefreshRate", "Clock"],
        ["ProcessorTechprocess", "Litografia"], ["ProcessorCasheMemory", "Cache L2"],
        ["MyCPU_PowerConsumption", "Consumo"], ["MyCPU_Temperature", "Temperatura"],
        ["MyCPU_Bandwidth", "Largura de banda"], ["MyCpuPrice", "Preço de venda"],
        ["MyCpuCostPrice", "Preço de custo"], ["MyCPU_Name", "Nome"],
        ["MyCPU_SeriesName", "Série"], ["MyCPU_License", "Licença"]
    ];

    // Numeric unlock counters are indexes/counts, so their real limits must be
    // used instead of an arbitrary huge value (which can index past game data).
    const TECHNOLOGY_UNLOCK_LEVELS = {
        ColorsOpened: 4, CameraX_Opened: 6, ScreenResolution_Opened: 10,
        ScreenTechnology_Opened: 10, CameraPhotoResolution_Opened: 10,
        CameraVideoResolution_Opened: 10, ProcessorOpened: 7,
        ProcessorSeriesOpened: 3, OperationSystemOpened: 10,
        DynamicsSeriesOpened: 2, PackageHeadphonesOpened: 8,
        GraphicCardOpened: 14, GraphicCardSeriesOpened: 1,
        OfficeLevelOpened: 5, MyCPU_Style_Opened: 25,
        MyGPU_x3Coolers_Opened: 1
    };

    let osRatingUpdateObserved;
    let osRatingUpdateWritten;

    const FEATURE_FIELDS = [
        "RoundedEdges", "ScreenHDR", "CameraPortraitMode", "CameraNightMode",
        "CameraCinematicMode", "CameraOpticalStabilization", "CameraSlowMotion",
        "Waterproof", "FaceID", "TouchID", "WirelessCharger", "DoubleSIM",
        "PowerbankMode", "WifiDirect", "AlwaysOnDisplay", "Stylus", "OpticID",
        "StereoDynamics", "DolbyAtmos", "HiResAudio"
    ];

    function formatValue(value) {
        if (typeof value === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
        return String(value ?? "");
    }

    function toast(message, error) {
        const target = document.getElementById("dt-toast");
        if (!target) return;
        target.textContent = message;
        target.style.color = error ? "#ff9a9a" : "#48f1ca";
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { target.textContent = ""; }, 3500);
    }

    function fieldRow(name, label) {
        const row = document.createElement("div");
        row.className = "dt-field-row";
        const caption = document.createElement("label");
        caption.innerHTML = `${label}<br><code>${name}</code>`;
        const input = document.createElement("input");
        input.dataset.global = name;
        input.autocomplete = "off";
        const pin = document.createElement("input");
        pin.type = "checkbox";
        pin.className = "dt-pin";
        pin.title = "Fixar valor continuamente";
        pin.checked = Object.prototype.hasOwnProperty.call(state.overrides || {}, name);
        input.addEventListener("change", () => {
            if (!setGlobal(name, input.value)) return;
            if (pin.checked) state.overrides[name] = globals()[name];
            saveState();
        });
        pin.addEventListener("change", () => {
            if (pin.checked) {
                if (setGlobal(name, input.value, true)) state.overrides[name] = globals()[name];
            } else delete state.overrides[name];
            saveState();
            toast(pin.checked ? `${name} fixado` : `${name} liberado`);
        });
        row.append(caption, input, pin);
        return row;
    }

    function renderFields(containerId, fields) {
        const container = document.getElementById(containerId);
        if (!container || container.childElementCount) return;
        for (const [name, label] of fields) container.appendChild(fieldRow(name, label));
    }

    function setAndPin(name, value) {
        if (!setGlobal(name, value, true)) return false;
        state.overrides[name] = globals()[name];
        return true;
    }

    function tunedRangeRow(options) {
        const row = document.createElement("div");
        row.className = "dt-tuned-row";
        const caption = document.createElement("label");
        caption.innerHTML = `${options.label}<br><code>${options.textName}</code>`;
        const controls = document.createElement("div");
        controls.className = "dt-tuned-controls";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = options.min;
        slider.max = options.max;
        slider.step = options.step || 1;
        const number = document.createElement("input");
        number.type = "number";
        number.min = options.min;
        number.max = options.max;
        number.step = options.step || 1;
        const apply = raw => {
            const value = Math.max(options.min, Math.min(options.max, Number(raw) || options.min));
            slider.value = value;
            number.value = value;
            state.extendedHardware[options.key] = value;
            setAndPin(options.backingName, options.backingMax);
            setAndPin(options.textName, options.textNumeric ? value : `${formatValue(value)} ${options.unit}`.trim());
            saveState();
            toast(`${options.label}: ${formatValue(value)} ${options.unit || ""}`.trim());
        };
        slider.addEventListener("input", () => apply(slider.value));
        number.addEventListener("change", () => apply(number.value));
        controls.append(slider, number);
        row.append(caption, controls);
        row._refresh = () => {
            const value = Number(state.extendedHardware[options.key] ?? options.defaultValue);
            if (document.activeElement !== slider && document.activeElement !== number) {
                slider.value = value;
                number.value = value;
            }
        };
        return row;
    }

    function nativeSelectRow(options) {
        const row = document.createElement("div");
        row.className = "dt-field-row dt-native-select-row";
        const caption = document.createElement("label");
        caption.innerHTML = `${options.label}<br><code>${options.name}</code>`;
        const select = document.createElement("select");
        select.dataset.nativeGlobal = options.name;
        const values = options.values || Array.from({ length: options.max - options.min + 1 }, (_, index) => options.min + index);
        for (let index = 0; index < values.length; index++) {
            const value = index + (options.min || 1);
            const item = document.createElement("option");
            item.value = value;
            item.textContent = options.optionLabel ? options.optionLabel(value) : (options.values ? String(values[index]) : `Opção nativa ${value}`);
            select.appendChild(item);
        }
        select.addEventListener("change", () => {
            if (setGlobal(options.name, Number(select.value), true)) {
                if (pin.checked) state.overrides[options.name] = Number(select.value);
                else delete state.overrides[options.name];
                if (options.textName) delete state.overrides[options.textName];
                saveState();
                toast(`${options.label}: ${select.selectedOptions[0].textContent}`);
            }
        });
        const pin = document.createElement("input");
        pin.type = "checkbox";
        pin.className = "dt-pin";
        pin.title = "Fixar esta escolha";
        pin.checked = Object.prototype.hasOwnProperty.call(state.overrides, options.name);
        pin.addEventListener("change", () => {
            if (pin.checked) state.overrides[options.name] = Number(select.value);
            else delete state.overrides[options.name];
            saveState();
        });
        row.append(caption, select, pin);
        return row;
    }

    function renderHardwareControls() {
        const cpu = document.getElementById("dt-cpu-tuning");
        const gpu = document.getElementById("dt-gpu-tuning");
        const cpuDesign = document.getElementById("dt-cpu-design-controls");
        const gpuDesign = document.getElementById("dt-gpu-design-controls");
        if (cpu && !cpu.childElementCount) {
            [
                { name: "ProcessorRefreshRate", textName: "ProcessorRefreshRate_Text", label: "Clock nativo da CPU", min: 1, values: ["1000 MHz", "1200 MHz", "1500 MHz", "1800 MHz", "2000 MHz", "2200 MHz", "2400 MHz", "2600 MHz", "2800 MHz", "3000 MHz", "3200 MHz", "3600 MHz", "4000 MHz", "4100 MHz", "4300 MHz", "4500 MHz", "4600 MHz", "4700 MHz", "4800 MHz", "4900 MHz", "5000 MHz", "5100 MHz", "5200 MHz", "5300 MHz", "5400 MHz", "5500 MHz", "5600 MHz", "5800 MHz", "6000 MHz"] },
                { name: "ProcessorCores", textName: "ProcessorCores_Text", label: "Núcleos nativos", min: 1, values: ["8 cores", "12 cores", "16 cores", "18 cores", "20 cores", "22 cores", "24 cores", "28 cores", "32 cores"] },
                { name: "ProcessorTechprocess", textName: "ProcessorTechprocess_Text", label: "Litografia nativa", min: 1, values: ["12 nm", "10 nm", "8 nm", "6 nm", "4 nm", "3 nm", "2 nm"] },
                { name: "ProcessorCasheMemory", textName: "ProcessorCasheMemory_Text", label: "Cache L2 nativo", min: 1, values: ["512 KB", "1 MB", "2 MB", "4 MB", "8 MB", "16 MB", "32 MB", "48 MB", "64 MB", "76 MB", "96 MB", "108 MB", "124 MB"] },
                { name: "RAM", textName: "RAM_Text", label: "Quantidade nativa de RAM", min: 1, values: ["2 GB", "4 GB", "6 GB", "8 GB", "10 GB", "12 GB", "16 GB", "24 GB", "32 GB", "36 GB", "42 GB", "48 GB", "56 GB", "72 GB", "84 GB", "96 GB"] },
                { name: "MyCPU_Temperature", textName: "MyCPU_Temperature_Text", label: "Temperatura nativa", min: 1, values: ["65 °C", "58 °C", "52 °C", "48 °C", "44 °C", "38 °C", "32 °C", "28 °C", "24 °C", "20 °C"] },
                { name: "MyCPU_Bandwidth", textName: "MyCPU_Bandwidth_Text", label: "Largura de banda nativa", min: 1, values: ["12 Gb/s", "15 Gb/s", "20 Gb/s", "24 Gb/s", "30 Gb/s", "38 Gb/s", "45 Gb/s", "52 Gb/s", "60 Gb/s", "64 Gb/s", "70 Gb/s", "74 Gb/s", "80 Gb/s"] }
            ].forEach(options => cpu.appendChild(nativeSelectRow(options)));
        }
        const cpuExtended = document.getElementById("dt-cpu-extended");
        if (cpuExtended && !cpuExtended.childElementCount) {
            [
                { key: "cpuClock", backingName: "ProcessorRefreshRate", backingMax: 29, textName: "ProcessorRefreshRate_Text", label: "Clock estendido da CPU", min: 1000, max: 11000, step: 100, defaultValue: 6000, unit: "MHz" },
                { key: "systemRam", backingName: "RAM", backingMax: 16, textName: "RAM_Text", label: "RAM estendida", min: 2, max: 512, step: 2, defaultValue: 96, unit: "GB" }
            ].forEach(options => cpuExtended.appendChild(tunedRangeRow(options)));
        }
        if (gpu && !gpu.childElementCount) {
            [
                { key: "gpuCoreClock", backingName: "MyGPU_CoreClockSpeed", backingMax: 15, textName: "MyGPU_CoreClockSpeed_Text", textNumeric: true, label: "Clock estendido do núcleo", min: 100, max: 11000, step: 100, defaultValue: 2610, unit: "MHz" },
                { key: "gpuBoostClock", backingName: "MyGPU_BoostClockSpeed", backingMax: 15, textName: "MyGPU_BoostClockSpeed_Text", label: "Clock Boost estendido", min: 100, max: 11000, step: 100, defaultValue: 3360, unit: "MHz" }
            ].forEach(options => gpu.appendChild(tunedRangeRow(options)));
        }
        const gpuNative = document.getElementById("dt-gpu-native");
        if (gpuNative && !gpuNative.childElementCount) {
            [
                { name: "MyGPU_CoreClockSpeed", textName: "MyGPU_CoreClockSpeed_Text", label: "Clock nativo do núcleo", min: 1, values: ["400 MHz", "550 MHz", "640 MHz", "920 MHz", "1250 MHz", "1440 MHz", "1620 MHz", "1830 MHz", "2000 MHz", "2140 MHz", "2200 MHz", "2300 MHz", "2450 MHz", "2530 MHz", "2610 MHz"] },
                { name: "MyGPU_BoostClockSpeed", textName: "MyGPU_BoostClockSpeed_Text", label: "Clock Boost nativo", min: 1, values: ["478 MHz", "702 MHz", "862 MHz", "1208 MHz", "1600 MHz", "1848 MHz", "2082 MHz", "2342 MHz", "2558 MHz", "2740 MHz", "2838 MHz", "2972 MHz", "3152 MHz", "3258 MHz", "3360 MHz"] },
                { name: "MyGPU_MaximumRamAmount", textName: "MyGPU_MaximumRamAmount_Text", label: "VRAM nativa", min: 1, values: ["1 GB", "2 GB", "4 GB", "8 GB", "16 GB", "32 GB", "64 GB", "128 GB", "256 GB", "512 GB"] },
                { name: "MyGPU_MemoryType", textName: "MyGPU_MemoryType_Text", label: "Tipo de memória nativo", min: 1, values: ["GDDR3", "GDDR4", "LPDDR4X", "GDDR5", "GDDR5X", "GDDR6", "GDDR6X", "HBM", "HBM2"] },
                { name: "MyGPU_MemoryClockSpeed", textName: "MyGPU_MemoryClockSpeed_Text", label: "Clock da memória nativo", min: 1, max: 20, optionLabel: value => `Nível nativo ${value}/20` },
                { name: "MyGPU_MemoryBandwidth", textName: "MyGPU_MemoryBandwidth_Text", label: "Largura de banda nativa", min: 1, values: ["224.0 Gb/s", "275.0 Gb/s", "320.0 Gb/s", "365.0 Gb/s", "440.0 Gb/s", "500.0 Gb/s", "575.0 Gb/s", "600.0 Gb/s", "660.0 Gb/s", "700.0 Gb/s", "780.0 Gb/s", "840.0 Gb/s", "900.0 Gb/s", "960.0 Gb/s", "1.0 Tb/s", "1.12 Tb/s", "1.25 Tb/s", "1.45 Tb/s", "1.75 Tb/s", "2.0 Tb/s"] },
                { name: "MyGPU_StreamProcessors", textName: "MyGPU_StreamProcessors_Text", label: "Processadores de fluxo", min: 1, max: 20 },
                { name: "MyGPU_NumberTransistors", textName: "MyGPU_NumberTransistors_Text", label: "Transistores", min: 1, max: 20 },
                { name: "MyGPU_TechnicalProcess", textName: "MyGPU_TechnicalProcess_Text", label: "Processo técnico", min: 1, max: 8 },
                { name: "MyGPU_TextureFillRate", textName: "MyGPU_TextureFillRate_Text", label: "Taxa de preenchimento", min: 1, max: 15 },
                { name: "MyGPU_ShaderModel", textName: "MyGPU_ShaderModel_Text", label: "Shader Model", min: 1, max: 10 },
                { name: "MyGPU_PowerConnectors", textName: "MyGPU_PowerConnectors_Text", label: "Conectores de energia", min: 1, max: 11 }
            ].forEach(options => gpuNative.appendChild(nativeSelectRow(options)));
        }
        if (cpuDesign && !cpuDesign.childElementCount) {
            [
                { name: "MyCPU_Style", label: "Encapsulamento/estilo da CPU", min: 1, max: 25, optionLabel: value => `CPU nativa ${value}/25` },
                { name: "RAMType", label: "Tecnologia da RAM", min: 1, values: ["LPDDR3", "LPDDR4", "LDDRP4X", "LDDRP5", "LDDRP5X", "LDDRP6", "LDDRP6X"] },
                { name: "ExclusiveDesignStyle", label: "Design exclusivo da CPU", min: 1, max: 20, optionLabel: value => `Design nativo ${value}/20` }
            ].forEach(options => cpuDesign.appendChild(nativeSelectRow(options)));
        }
        if (gpuDesign && !gpuDesign.childElementCount) {
            [
                { name: "MyGPU_Coolers", label: "Quantidade de coolers da GPU", min: 1, max: 3, optionLabel: value => `${value} cooler${value > 1 ? "s" : ""}` },
                { name: "MyGPU_MainPart", label: "Corpo principal da GPU", min: 1, max: 10 },
                { name: "MyGPU_TopPart", label: "Cobertura da GPU", min: 1, max: 10 },
                { name: "MyGPU_CoolersStyle", label: "Estilo dos coolers", min: 1, max: 10 }
            ].forEach(options => gpuDesign.appendChild(nativeSelectRow(options)));
        }
    }

    function refreshFieldValues(root) {
        const vars = globals();
        if (!vars) return;
        for (const input of (root || document).querySelectorAll("input[data-global]")) {
            const name = input.dataset.global;
            if (!(name in vars)) {
                input.disabled = true;
                input.placeholder = "indisponível";
                continue;
            }
            input.disabled = false;
            if (document.activeElement !== input) input.value = vars[name];
            input.type = typeof vars[name] === "number" ? "number" : "text";
            if (input.type === "number") input.step = "any";
        }
    }

    function enableFeatures() {
        let changed = 0;
        const vars = globals();
        if (!vars) return toast("Runtime ainda não conectado", true);
        for (const name of FEATURE_FIELDS) {
            if (name in vars) { vars[name] = "ON"; changed++; }
            const opened = `${name}_Opened`;
            if (opened in vars) { vars[opened] = "OPENED"; changed++; }
        }
        toast(`${changed} recursos avançados ativados`);
        refreshEditors();
    }

    function unlockAllTechnology() {
        const vars = globals();
        if (!vars) return toast("Runtime ainda não conectado", true);
        let changed = 0;
        for (const [name, value] of Object.entries(vars)) {
            if (/_Opened$/i.test(name) && typeof value === "string" && value !== "OPENED") {
                vars[name] = "OPENED";
                changed++;
            }
        }
        for (const [name, maximum] of Object.entries(TECHNOLOGY_UNLOCK_LEVELS)) {
            if (name in vars && Number(vars[name]) < maximum) {
                vars[name] = maximum;
                changed++;
            }
        }
        for (const name of FEATURE_FIELDS) {
            if (name in vars && vars[name] !== "ON") { vars[name] = "ON"; changed++; }
        }
        toast(`${changed} parâmetros de tecnologia desbloqueados`);
        refreshEditors();
        return changed;
    }

    function applyOsUpgradeMultiplier() {
        const vars = globals();
        if (!vars || typeof vars.MyOSRating_Update !== "number") return;
        const current = vars.MyOSRating_Update;
        if (current === osRatingUpdateWritten) return;
        osRatingUpdateWritten = undefined;
        if (current !== osRatingUpdateObserved) {
            osRatingUpdateObserved = current;
            const multiplier = Math.max(1, Math.min(200, Number(state.osUpgradeMultiplier) || 1));
            if (multiplier > 1 && current > 0) {
                const multiplied = current * multiplier;
                vars.MyOSRating_Update = multiplied;
                osRatingUpdateWritten = multiplied;
                osRatingUpdateObserved = multiplied;
                toast(`Atualização do SO: ${formatValue(current)} × ${multiplier} = ${formatValue(multiplied)}`);
            }
        }
    }

    function rebuildCpuFields() {
        const container = document.getElementById("dt-cpu-fields");
        const vars = globals();
        if (!container || !vars) return;
        const names = Object.keys(vars).filter(name => /^(MyCPU|MyCpu)/.test(name)).sort((a, b) => a.localeCompare(b));
        const signature = names.join("\n");
        if (container.dataset.signature === signature) return;
        container.dataset.signature = signature;
        container.replaceChildren(...names.map(name => fieldRow(name, name)));
    }

    function rebuildGpuFields() {
        const container = document.getElementById("dt-gpu-fields");
        const vars = globals();
        if (!container || !vars) return;
        const names = Object.keys(vars).filter(name => /^(MyGPU|MyGpu)/.test(name)).sort((a, b) => a.localeCompare(b));
        const signature = names.join("\n");
        if (container.dataset.signature === signature) return;
        container.dataset.signature = signature;
        container.replaceChildren(...names.map(name => fieldRow(name, name)));
    }

    function getObjectInstance(name) {
        try {
            const objectClass = runtime && runtime.objects && runtime.objects[name];
            if (!objectClass) return null;
            if (typeof objectClass.getFirstInstance === "function") return objectClass.getFirstInstance();
            if (typeof objectClass.getAllInstances === "function") return objectClass.getAllInstances()[0] || null;
        } catch (_) {}
        return null;
    }

    function arrayDimensions(instance) {
        if (!instance) return null;
        const read = (property, method) => {
            try { return Number(instance[property] ?? (typeof instance[method] === "function" ? instance[method]() : 0)); }
            catch (_) { return 0; }
        };
        return { width: read("width", "getWidth"), height: read("height", "getHeight"), depth: read("depth", "getDepth") };
    }

    function arrayRead(instance, x, y, z) {
        if (typeof instance.getAt === "function") return instance.getAt(x, y, z);
        if (typeof instance.at === "function") return instance.at(x, y, z);
        throw new Error("API de leitura do Array indisponível");
    }

    function arrayWrite(instance, value, x, y, z) {
        if (typeof instance.setAt === "function") return instance.setAt(value, x, y, z);
        if (typeof instance.set === "function") return instance.set(value, x, y, z);
        throw new Error("API de escrita do Array indisponível");
    }

    function refreshArrayInfo() {
        const select = document.getElementById("dt-array-name");
        const info = document.getElementById("dt-array-info");
        if (!select || !info) return;
        const instance = getObjectInstance(select.value);
        const dimensions = arrayDimensions(instance);
        info.textContent = dimensions ? `${dimensions.width} × ${dimensions.height} × ${dimensions.depth}` : "array ainda não criado nesta tela";
    }

    function rebuildGlobalList() {
        const list = document.getElementById("dt-global-list");
        const filter = document.getElementById("dt-global-filter");
        const vars = globals();
        if (!list || !vars) return;
        const query = (filter.value || "").trim().toLowerCase();
        const names = Object.keys(vars).filter(name => !query || name.toLowerCase().includes(query)).slice(0, 250);
        list.replaceChildren(...names.map(name => fieldRow(name, name)));
        refreshFieldValues(list);
    }

    function refreshEditors() {
        rebuildCpuFields();
        rebuildGpuFields();
        renderHardwareControls();
        const vars = globals();
        if (vars) {
            for (const row of document.querySelectorAll(".dt-tuned-row")) if (row._refresh) row._refresh(vars);
            for (const select of document.querySelectorAll("select[data-native-global]")) {
                if (document.activeElement !== select && select.dataset.nativeGlobal in vars) select.value = vars[select.dataset.nativeGlobal];
            }
        }
        refreshFieldValues(document.getElementById("dt-cheat-panel"));
        refreshArrayInfo();
        updateLiveStatus();
    }

    function updateLiveStatus() {
        const vars = globals();
        const target = document.getElementById("dt-live-values");
        if (!target || !vars) return;
        const layout = layoutName();
        target.innerHTML = `Dinheiro: <b>${formatValue(vars.Budget)}</b><br>Research coins: <b>${formatValue(vars.ResearchCoins)}</b><br>Multiplicador SO: <b>${state.osUpgradeMultiplier}×</b><br>Tela: <b>${layout}</b><br>VIP: <b>${state.vip ? "ATIVO" : "desativado"}</b>`;
    }

    function buildUI() {
        const toggle = document.createElement("button");
        toggle.id = "dt-cheat-toggle";
        toggle.textContent = "DT CHEATS";

        const panel = document.createElement("aside");
        panel.id = "dt-cheat-panel";
        panel.innerHTML = `
            <header class="dt-cheat-head">
                <div class="dt-cheat-title">Devices Tycoon · Cheat Lab</div>
                <div class="dt-cheat-subtitle">Estado: <span id="dt-runtime-state">aguardando runtime</span> · campo amarelo = valor fixado</div>
            </header>
            <nav class="dt-cheat-tabs">
                <button class="dt-selected" data-page="cheats">Cheats</button>
                <button data-page="smartphone">Smartphone+</button>
                <button data-page="cpu">CPU+</button>
                <button data-page="gpu">GPU+</button>
                <button data-page="arrays">Arrays</button>
                <button data-page="globals">Variáveis</button>
            </nav>
            <main class="dt-cheat-body">
                <section class="dt-page dt-selected" data-page="cheats">
                    <div class="dt-card">
                        <h3>Recursos e sandbox</h3>
                        <div id="dt-live-values" class="dt-live">Aguardando o jogo…</div>
                        <div class="dt-switch-row"><label>Dinheiro infinito</label><input id="dt-infinite-money" class="dt-check" type="checkbox"></div>
                        <div class="dt-switch-row"><label>Research coins infinitos</label><input id="dt-infinite-research" class="dt-check" type="checkbox"></div>
                        <div class="dt-switch-row"><label>Sandbox liberado e ativo</label><input id="dt-sandbox" class="dt-check" type="checkbox"></div>
                        <div class="dt-switch-row"><label>Modo VIP (funções premium)</label><input id="dt-vip" class="dt-check" type="checkbox"></div>
                        <div class="dt-actions">
                            <button id="dt-add-money">+ 1 trilhão</button>
                            <button id="dt-add-research">+ 1 milhão coins</button>
                            <button id="dt-apply-now">Aplicar agora</button>
                        </div>
                    </div>
                    <div class="dt-card">
                        <h3>Desbloqueios de criação</h3>
                        <p class="dt-note">Ativa os recursos avançados de câmera, tela, biometria, áudio e conectividade que já existem no jogo.</p>
                        <div class="dt-actions"><button id="dt-enable-features">Ativar recursos avançados</button><button id="dt-unlock-all">Unlock All (todas as tecnologias)</button></div>
                        <p class="dt-note">O VIP é local/offline: libera licenças, remove bloqueios de anúncios e marca recursos premium disponíveis no runtime. Não altera compras da Google Play/App Store.</p>
                    </div>
                    <div class="dt-card">
                        <h3>Sistema operacional</h3>
                        <p class="dt-note">Multiplica o ganho de classificação gerado por cada atualização do seu SO. O padrão é 1×.</p>
                        <div class="dt-range-row"><input id="dt-os-multiplier" type="range" min="1" max="200" step="1"><output id="dt-os-multiplier-value">1×</output></div>
                    </div>
                </section>
                <section class="dt-page" data-page="smartphone">
                    <div class="dt-card"><h3>Smartphone avançado</h3><p class="dt-note">Edite o valor interno real. Marque o quadrado à direita para impedir que eventos do jogo restaurem o valor.</p><div id="dt-smartphone-fields"></div></div>
                </section>
                <section class="dt-page" data-page="cpu">
                    <div class="dt-card"><h3>Catálogo nativo de CPU</h3><p class="dt-note">Escolhas 1-based válidas dos eventos originais. O quadrado fixa a escolha; desmarcado aplica somente uma vez.</p><div id="dt-cpu-tuning"></div></div>
                    <div class="dt-card"><h3>Modo estendido seguro</h3><p class="dt-note">Permite exibir até 11.000 MHz e 512 GB sem usar índices inválidos: a engine fica no último nível nativo e o texto estendido é preservado.</p><div id="dt-cpu-extended"></div></div>
                    <div class="dt-card"><h3>Design e tecnologia nativos</h3><p class="dt-note">O jogo não possui campos físicos de silício/cobre para CPU ou RAM. Os equivalentes existentes são o encapsulamento visual da CPU e a tecnologia da RAM.</p><div id="dt-cpu-design-controls"></div></div>
                    <div class="dt-card"><h3>MyCPU · todos os parâmetros</h3><p class="dt-note">Lista automaticamente todas as variáveis MyCPU/MyCpu disponíveis no runtime. Edite o valor real ou fixe-o com o quadrado à direita.</p><div id="dt-cpu-fields"></div></div>
                </section>
                <section class="dt-page" data-page="gpu">
                    <div class="dt-card"><h3>Catálogo nativo de GPU</h3><p class="dt-note">Clocks originais reconhecidos pelos eventos, cálculos e save do jogo.</p><div id="dt-gpu-native"></div></div>
                    <div class="dt-card"><h3>Criação e upgrade de placa de vídeo</h3><p class="dt-note">Overrides estendidos seguros de clock e VRAM; a engine usa o maior índice válido e mantém a especificação exibida.</p><div id="dt-gpu-tuning"></div></div>
                    <div class="dt-card"><h3>Construção e refrigeração nativas</h3><p class="dt-note">Peças visuais realmente existentes: quantidade de coolers, corpo principal, cobertura e estilo dos coolers.</p><div id="dt-gpu-design-controls"></div></div>
                    <div class="dt-card"><h3>MyGPU · todos os parâmetros</h3><p class="dt-note">Editor completo das variáveis nativas de criação, design, iluminação, refrigeração, preço e especificações.</p><div id="dt-gpu-fields"></div></div>
                </section>
                <section class="dt-page" data-page="arrays">
                    <div class="dt-card">
                        <h3>Editor de arrays do save</h3>
                        <p class="dt-note">Ferramenta avançada para CPUs e smartphones já criados. Faça backup do save antes de alterar células desconhecidas.</p>
                        <select id="dt-array-name">
                            <option>ArraySmartphones</option><option>ArraySmartphonesEarnings</option><option>ArraySmartphonePrice</option>
                            <option>ArrayMyCPU_Smartphones</option><option>ArrayMyCPU_SmartphonesNames</option><option>ArrayMyCPU_SmartphonesEarnings</option>
                            <option>ArrayMyCPU_Laptops</option><option>ArrayMyCPU_LaptopsNames</option><option>ArrayMyCpuPrice</option>
                            <option>ArrayMyGPU</option><option>ArrayMyGPU_Names</option><option>ArrayMyGPU_Earnings</option><option>ArrayMyGpuPrice</option>
                        </select>
                        <div class="dt-live">Dimensões: <b id="dt-array-info">indisponível</b></div>
                        <div class="dt-array-grid"><input id="dt-array-x" type="number" min="0" value="0" placeholder="X"><input id="dt-array-y" type="number" min="0" value="0" placeholder="Y"><input id="dt-array-z" type="number" min="0" value="0" placeholder="Z"></div>
                        <input id="dt-array-value" placeholder="Valor da célula">
                        <div class="dt-actions"><button id="dt-array-read">Ler célula</button><button id="dt-array-write">Gravar célula</button></div>
                    </div>
                </section>
                <section class="dt-page" data-page="globals">
                    <div class="dt-card"><h3>Todas as variáveis do jogo</h3><input id="dt-global-filter" placeholder="Filtrar: Budget, Camera, CPU…"><div class="dt-actions"><button id="dt-global-search">Atualizar lista</button></div><div id="dt-global-list"></div></div>
                </section>
                <div id="dt-toast"></div>
            </main>`;

        document.body.append(toggle, panel);
        for (const eventName of ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "wheel", "touchstart", "touchend"]) {
            panel.addEventListener(eventName, event => event.stopPropagation());
            toggle.addEventListener(eventName, event => event.stopPropagation());
        }
        toggle.addEventListener("click", () => {
            const open = panel.classList.toggle("dt-open");
            toggle.classList.toggle("dt-active", open);
            refreshEditors();
        });

        for (const tab of panel.querySelectorAll(".dt-cheat-tabs button")) {
            tab.addEventListener("click", () => {
                panel.querySelectorAll(".dt-cheat-tabs button, .dt-page").forEach(node => node.classList.remove("dt-selected"));
                tab.classList.add("dt-selected");
                panel.querySelector(`.dt-page[data-page="${tab.dataset.page}"]`).classList.add("dt-selected");
                if (tab.dataset.page === "globals") rebuildGlobalList();
                refreshEditors();
            });
        }

        renderFields("dt-smartphone-fields", SMARTPHONE_FIELDS);
        const bindToggle = (id, key) => {
            const input = document.getElementById(id);
            input.checked = !!state[key];
            input.addEventListener("change", () => { state[key] = input.checked; saveState(); applyCheats(); });
        };
        bindToggle("dt-infinite-money", "infiniteMoney");
        bindToggle("dt-infinite-research", "infiniteResearch");
        bindToggle("dt-sandbox", "sandbox");
        bindToggle("dt-vip", "vip");
        document.getElementById("dt-add-money").addEventListener("click", () => {
            const vars = globals(); if (vars) setGlobal("Budget", Number(vars.Budget || 0) + 1_000_000_000_000);
        });
        document.getElementById("dt-add-research").addEventListener("click", () => {
            const vars = globals(); if (vars) setGlobal("ResearchCoins", Number(vars.ResearchCoins || 0) + 1_000_000);
        });
        document.getElementById("dt-apply-now").addEventListener("click", () => { applyCheats(); toast("Cheats aplicados"); });
        document.getElementById("dt-enable-features").addEventListener("click", enableFeatures);
        document.getElementById("dt-unlock-all").addEventListener("click", unlockAllTechnology);
        const osMultiplier = document.getElementById("dt-os-multiplier");
        const osMultiplierValue = document.getElementById("dt-os-multiplier-value");
        state.osUpgradeMultiplier = Math.max(1, Math.min(200, Number(state.osUpgradeMultiplier) || 1));
        osMultiplier.value = state.osUpgradeMultiplier;
        osMultiplierValue.value = `${state.osUpgradeMultiplier}×`;
        osMultiplierValue.textContent = `${state.osUpgradeMultiplier}×`;
        osMultiplier.addEventListener("input", () => {
            state.osUpgradeMultiplier = Number(osMultiplier.value);
            osMultiplierValue.value = `${state.osUpgradeMultiplier}×`;
            osMultiplierValue.textContent = `${state.osUpgradeMultiplier}×`;
            saveState();
            updateLiveStatus();
        });
        document.getElementById("dt-global-search").addEventListener("click", rebuildGlobalList);
        document.getElementById("dt-global-filter").addEventListener("keydown", event => { if (event.key === "Enter") rebuildGlobalList(); });
        document.getElementById("dt-array-name").addEventListener("change", refreshArrayInfo);
        document.getElementById("dt-array-read").addEventListener("click", () => {
            try {
                const instance = getObjectInstance(document.getElementById("dt-array-name").value);
                const x = Number(document.getElementById("dt-array-x").value), y = Number(document.getElementById("dt-array-y").value), z = Number(document.getElementById("dt-array-z").value);
                const value = arrayRead(instance, x, y, z);
                document.getElementById("dt-array-value").value = value;
                toast(`Célula [${x}, ${y}, ${z}] lida`);
            } catch (error) { toast(error.message || String(error), true); }
        });
        document.getElementById("dt-array-write").addEventListener("click", () => {
            try {
                const instance = getObjectInstance(document.getElementById("dt-array-name").value);
                const x = Number(document.getElementById("dt-array-x").value), y = Number(document.getElementById("dt-array-y").value), z = Number(document.getElementById("dt-array-z").value);
                const raw = document.getElementById("dt-array-value").value;
                const value = raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw;
                arrayWrite(instance, value, x, y, z);
                toast(`Célula [${x}, ${y}, ${z}] gravada`);
            } catch (error) { toast(error.message || String(error), true); }
        });
        refreshEditors();
    }

    window.DevicesCheats = {
        get runtime() { return runtime; },
        get state() { return JSON.parse(JSON.stringify(state)); },
        get globals() { return globals(); },
        setGlobal,
        apply: applyCheats,
        unlockAll: unlockAllTechnology,
        onReady(callback) { runtime ? callback(runtime) : readyCallbacks.push(callback); },
        snapshot() {
            const vars = globals();
            return { ready: !!runtime, layout: layoutName(), vip: !!state.vip, Budget: vars && vars.Budget, ResearchCoins: vars && vars.ResearchCoins, SandboxMode: vars && vars.SandboxMode, SandboxMode_Opened: vars && vars.SandboxMode_Opened, UnlimitedBudget: vars && vars.UnlimitedBudget, ADS: vars && vars.ADS, MyCPU_License: vars && vars.MyCPU_License, MyOsLicense: vars && vars.MyOsLicense };
        }
    };

    hookRunOnStartup();
    document.addEventListener("DOMContentLoaded", buildUI, { once: true });
    setInterval(applyCheats, 250);
    setInterval(applyOsUpgradeMultiplier, 50);
    setInterval(refreshEditors, 1000);
})();
