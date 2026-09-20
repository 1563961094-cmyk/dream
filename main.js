"use strict";
/**
 * 亢奋的梦境 v2 · 运行器(多文件版)
 * 基于 Shadertoy XsBXWt("Fractal Cartoon" by Kali,MIT License)的本地复刻改编。
 * 从 shaders/dream.frag 加载片元 shader(需要通过 http 服务访问本目录)。
 */
(() => {
  const canvas = document.getElementById("c");
  const hud = document.getElementById("hud");
  const errBox = document.getElementById("err");

  // ==================== 参数默认值(改这里 = 改出厂设置) ====================
  const PARAMS = [
    // —— 节奏与镜头 ——
    { key: "uSpeed",       label: "全局速度倍率", min: 0.5,  max: 4,    step: 0.05,   value: 2.1 },
    { key: "uRollSpeed",   label: "镜头自转速度", min: 0,    max: 1,    step: 0.01,   value: 0.33 },
    { key: "uSwirl",       label: "隧道旋涡强度", min: 0,    max: 1.5,  step: 0.01,   value: 0.5 },
    { key: "uZoomBreath",  label: "呼吸缩放深度", min: 0,    max: 0.15, step: 0.005,  value: 0.05 },
    { key: "uZoomSpeed",   label: "呼吸缩放速度", min: 0.2,  max: 2,    step: 0.05,   value: 0.85 },
    { key: "uPushAmt",     label: "推进脉冲深度", min: 0,    max: 0.4,  step: 0.01,   value: 0.13 },
    { key: "uPushSpeed",   label: "推进脉冲速度", min: 0.3,  max: 3,    step: 0.05,   value: 1.2 },
    // —— 折叠与爆裂 ——
    { key: "uFoldAmt",     label: "空间折叠强度", min: 0,    max: 0.25, step: 0.005,  value: 0.10 },
    { key: "uFoldHz",      label: "折叠重组周期", min: 0.05, max: 0.6,  step: 0.01,   value: 0.22 },
    { key: "uBurstAmt",    label: "爆裂光斑强度", min: 0,    max: 1.5,  step: 0.05,   value: 0.5 },
    { key: "uBurstHz",     label: "爆裂触发频率", min: 0.5,  max: 6,    step: 0.1,    value: 2.5 },
    { key: "uFlashAmt",    label: "频闪强度",     min: 0,    max: 0.3,  step: 0.01,   value: 0.11 },
    { key: "uFlashHz",     label: "频闪速率",     min: 0.5,  max: 8,    step: 0.1,    value: 3.4 },
    // —— 抖动 ——
    { key: "uJitterAmt",   label: "画面抖动幅度", min: 0,    max: 0.02, step: 0.0005, value: 0.006 },
    { key: "uJitterHz",    label: "抖动跳变频率", min: 1,    max: 40,   step: 1,      value: 16 },
    { key: "uTremor",      label: "高频震颤幅度", min: 0,    max: 0.006,step: 0.0002, value: 0.0016 },
    // —— 色彩 ——
    { key: "uHueSpeed",    label: "色相流转速度", min: 0,    max: 1.5,  step: 0.01,   value: 0.22 },
    { key: "uTintAmt",     label: "四色快切混合", min: 0,    max: 0.8,  step: 0.01,   value: 0.22 },
    { key: "uTintHz",      label: "四色切换频率", min: 0.3,  max: 5,    step: 0.05,   value: 1.8 },
    { key: "uWaveAmp",     label: "流体扭曲倍率", min: 0.2,  max: 4,    step: 0.1,    value: 2.4 },
    // —— 梦境质感 ——
    { key: "uBlurAmt",     label: "梦境虚实模糊", min: 0,    max: 1,    step: 0.01,   value: 0.55 },
    { key: "uPulseAmt",    label: "能量脉动强度", min: 0,    max: 0.5,  step: 0.01,   value: 0.16 },
    { key: "uPulseSpeed",  label: "脉动速度",     min: 0,    max: 15,   step: 0.5,    value: 5 },
    { key: "uSatGain",     label: "饱和增益",     min: 0,    max: 3,    step: 0.05,   value: 2.1 },
    { key: "uContrast",    label: "对比度",       min: 0.5,  max: 2.5,  step: 0.05,   value: 1.35 },
    { key: "uGrain",       label: "噪点密度",     min: 0,    max: 0.5,  step: 0.01,   value: 0.10 },
  ];
  const GROUPS = {
    uSpeed: "节奏与镜头", uFoldAmt: "折叠与爆裂",
    uJitterAmt: "抖动", uHueSpeed: "色彩", uBlurAmt: "梦境质感",
  };
  const state = Object.fromEntries(PARAMS.map(p => [p.key, p.value]));

  function showErr(msg) {
    errBox.style.display = "block";
    errBox.textContent = msg;
  }

  fetch("shaders/dream.frag")
    .then(r => { if (!r.ok) throw new Error("shaders/dream.frag 加载失败: HTTP " + r.status + "\n请通过 http 服务访问本目录(如 python3 -m http.server),不要直接双击打开。"); return r.text(); })
    .then(src => init(src))
    .catch(e => showErr(String(e.message || e)));

  function init(fragSrc) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: false })
            || canvas.getContext("webgl",  { antialias: false, preserveDrawingBuffer: false });
    if (!gl) { showErr("此浏览器不支持 WebGL。"); return; }
    const isGL2 = (typeof WebGL2RenderingContext !== "undefined") && (gl instanceof WebGL2RenderingContext);

    function buildFragmentSource() {
      let src = fragSrc;
      const head = [];
      if (isGL2) {
        head.push("#version 300 es");
      } else {
        src = src.replace(/\btexture\s*\(/g, "texture2D(");
      }
      head.push(
        "precision highp float;",
        "uniform vec3  iResolution;",
        "uniform float iTime;",
        "uniform float iTimeDelta;",
        "uniform float iFrameRate;",
        "uniform int   iFrame;",
        "uniform vec4  iMouse;",
        "uniform vec4  iDate;",
        "uniform float iSampleRate;",
        "uniform vec3  iChannelResolution[4];",
        "uniform float iChannelTime[4];",
        "uniform sampler2D iChannel0, iChannel1, iChannel2, iChannel3;",
        ""
      );
      if (isGL2) head.push("#define texture2D texture", "out vec4 outColor;", "");
      const tail = isGL2
        ? "void main(){ vec4 c=vec4(0.); mainImage(c, gl_FragCoord.xy); outColor=c; }"
        : "void main(){ vec4 c=vec4(0.); mainImage(c, gl_FragCoord.xy); gl_FragColor=c; }";
      return head.join("\n") + "\n" + src + "\n" + tail;
    }

    function compile(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error("Shader 编译失败:\n" + gl.getShaderInfoLog(s));
      }
      return s;
    }

    let program;
    const vsSrc = isGL2
      ? "#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"
      : "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
    try {
      program = gl.createProgram();
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error("Shader 编译失败:\n" + gl.getShaderInfoLog(vs));
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, buildFragmentSource()); gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error("Shader 编译失败:\n" + gl.getShaderInfoLog(fs));
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("Program 链接失败:\n" + gl.getProgramInfoLog(program));
      }
    } catch (e) { showErr(e.message); return; }
    gl.useProgram(program);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const locP = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(locP);
    gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);

    // ---- 纹理通道(与原站现状一致:黑纹理;放 nyan.png 自动启用彩虹猫) ----
    function blackTexture() {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return t;
    }
    function loadImageTexture(url) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const img = new Image();
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      };
      img.src = url;
      return t;
    }
    const channels = [blackTexture(), blackTexture(), blackTexture(), blackTexture()];
    fetch("nyan.png", { method: "HEAD" }).then(r => { if (r.ok) channels[1] = loadImageTexture("nyan.png"); }).catch(() => {});

    // ---- uniforms ----
    const U = {};
    for (const n of ["iResolution","iTime","iTimeDelta","iFrameRate","iFrame","iMouse","iDate","iSampleRate"]) {
      U[n] = gl.getUniformLocation(program, n);
    }
    for (const p of PARAMS) U[p.key] = gl.getUniformLocation(program, p.key);

    // ---- 滑块面板 ----
    const rows = document.getElementById("rows");
    let lastGroup = null;
    for (const p of PARAMS) {
      const g = GROUPS[p.key];
      if (g && g !== lastGroup) {
        const h = document.createElement("div");
        h.className = "grp"; h.textContent = "── " + g + " ──";
        rows.appendChild(h);
        lastGroup = g;
      }
      const row = document.createElement("div");
      row.className = "row";
      const lab = document.createElement("label"); lab.textContent = p.label;
      const inp = document.createElement("input");
      inp.type = "range"; inp.min = p.min; inp.max = p.max; inp.step = p.step; inp.value = p.value;
      const val = document.createElement("span"); val.className = "val"; val.textContent = p.value;
      inp.addEventListener("input", () => {
        state[p.key] = parseFloat(inp.value);
        val.textContent = inp.value;
      });
      row.append(lab, inp, val);
      rows.appendChild(row);
    }

    // ---- 交互 ----
    const mouse = { x: 0, y: 0, z: 0, w: 0 };
    let dragging = false;
    canvas.addEventListener("mousedown", e => {
      dragging = true;
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = r.height - (e.clientY - r.top);
      mouse.z = mouse.x; mouse.w = mouse.y;
    });
    window.addEventListener("mousemove", e => {
      if (!dragging) return;
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = r.height - (e.clientY - r.top);
    });
    window.addEventListener("mouseup", () => { dragging = false; mouse.z = 0; mouse.w = 0; });
    canvas.addEventListener("touchstart", e => {
      const t = e.touches[0], r = canvas.getBoundingClientRect();
      dragging = true;
      mouse.x = t.clientX - r.left; mouse.y = r.height - (t.clientY - r.top);
      mouse.z = mouse.x; mouse.w = mouse.y;
    }, { passive: true });
    canvas.addEventListener("touchmove", e => {
      if (!dragging) return;
      const t = e.touches[0], r = canvas.getBoundingClientRect();
      mouse.x = t.clientX - r.left; mouse.y = r.height - (t.clientY - r.top);
    }, { passive: true });
    window.addEventListener("touchend", () => { dragging = false; mouse.z = 0; mouse.w = 0; });

    let paused = false;
    window.addEventListener("keydown", e => {
      if (e.code === "Space") { e.preventDefault(); paused = !paused; }
      if (e.key === "h" || e.key === "H") {
        const p = document.getElementById("panel");
        p.style.display = p.style.display === "none" ? "block" : "none";
      }
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    window.addEventListener("resize", resize);

    // ---- 主循环 ----
    const t0 = performance.now();
    let lastT = 0, frame = 0, lastFrameTime = t0;

    function render(now) {
      resize();
      const time = paused ? lastT : (now - t0) / 1000;
      const dt = paused ? 0 : Math.min((now - lastFrameTime) / 1000, 0.1);
      lastT = time;
      lastFrameTime = now;
      frame++;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform3f(U.iResolution, canvas.width, canvas.height, 1);
      gl.uniform1f(U.iTime, time);
      gl.uniform1f(U.iTimeDelta, dt);
      gl.uniform1f(U.iFrameRate, frame > 1 ? 1000 / (now - lastFrameTime + dt * 1000) : 0);
      gl.uniform1i(U.iFrame, frame);
      gl.uniform4f(U.iMouse, mouse.x, mouse.y, mouse.z, mouse.w);
      const d = new Date();
      gl.uniform4f(U.iDate, d.getFullYear(), d.getMonth() + 1, d.getDate(),
        d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000);
      gl.uniform1f(U.iSampleRate, 44100);
      for (const p of PARAMS) { if (U[p.key]) gl.uniform1f(U[p.key], state[p.key]); }

      for (let i = 0; i < 4; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, channels[i]);
        if (U["iChannel" + i]) gl.uniform1i(U["iChannel" + i], i);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (frame % 15 === 0) {
        hud.textContent = `亢奋的梦境 v2 强化版 — Fractal Land 改编  |  ${canvas.width}x${canvas.height}  |  空格暂停 · H 隐藏面板${paused ? " [已暂停]" : ""}`;
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }
})();
