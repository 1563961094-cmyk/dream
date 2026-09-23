"use strict";
function boot(fragSrc) {
  const canvas = document.getElementById("c");
  const hud = document.getElementById("hud");
  const errBox = document.getElementById("err");

  // ==================== 梦境叙事线(头部左右转头游历;摇头惊醒回「沉眠起始」) ====================
  // 顺序即一条完整睡眠叙事:入睡沉沦 → 亢奋迷幻冒险 → 眩晕漩涡 → 快要苏醒。
  // 每个场景:标题 / 情绪标签 / 小故事 / 一组完整参数 / 该梦专属的粒子色板。
  function base() {
    return { uSpeed:2.1, uRollSpeed:0.33, uSwirl:0.5, uZoomBreath:0.05, uZoomSpeed:0.85,
             uPushAmt:0.13, uPushSpeed:1.2, uFoldAmt:0.10, uFoldHz:0.22,
             uBurstAmt:0.5, uBurstHz:2.5, uFlashAmt:0.11, uFlashHz:3.4,
             uJitterAmt:0.006, uJitterHz:16, uTremor:0.0016,
             uHueSpeed:0.22, uTintAmt:0.22, uTintHz:1.8, uWaveAmp:2.4,
             uBlurAmt:0.55, uPulseAmt:0.16, uPulseSpeed:5,
             uSatGain:2.1, uContrast:1.35, uGrain:0.10 };
  }
  const SCENES = [
    { name: "沉眠起始", tag: "困倦 · 沉沦",
      story: "意识开始下坠,呼吸一点一点放慢。现实在身后轻轻关上门,第一层梦的边缘泛起微光。",
      colors: ["#ff6bf7", "#b18cff", "#ffd9ff"],
      p: base() },
    { name: "电光迷城", tag: "亢奋 · 冒险",
      story: "霓虹在头顶炸开,整座城市由电流编织而成。你在楼宇之间疾奔,心跳是这座城唯一的节拍。",
      colors: ["#26f7ff", "#4d9fff", "#a5f3ff"],
      p: { ...base(), uSwirl:0.9,  uBlurAmt:0.7,  uHueSpeed:0.5,  uTintAmt:0.4,  uFoldAmt:0.14, uSpeed:1.6 } },
    { name: "荧光丛林", tag: "迷幻 · 生长",
      story: "植物在黑暗里发光,藤蔓缠上手腕又温柔松开。整片丛林随着你的呼吸起伏,像在替你做梦。",
      colors: ["#5dff8f", "#d3ff5d", "#2fffc4"],
      p: { ...base(), uWaveAmp:3.6, uFoldAmt:0.16, uFoldHz:0.3,  uHueSpeed:0.9,  uPulseAmt:0.28, uJitterAmt:0.004, uSpeed:2.4 } },
    { name: "洋红漩涡", tag: "眩晕 · 失控",
      story: "地面开始旋转,洋红的风把你卷进漩涡中心。越挣扎越像在飞——干脆张开手,让梦转得再快一点。",
      colors: ["#ff2fb4", "#ff6bf7", "#ff8ad1"],
      p: { ...base(), uSwirl:1.25, uRollSpeed:0.6, uTintAmt:0.35, uTintHz:2.6,  uSpeed:2.8,  uBlurAmt:0.45, uZoomBreath:0.09 } },
    { name: "金色将醒", tag: "安宁 · 苏醒前",
      story: "一切慢了下来,金色的光从天边漫进来。梦在耳边说:再留一会儿吧,天就要亮了。",
      colors: ["#ffd318", "#ffb347", "#fff0a8"],
      p: { ...base(), uHueSpeed:0.03, uTintAmt:0.15, uSatGain:2.5, uPulseSpeed:2.5, uPulseAmt:0.22, uJitterAmt:0.0025, uSpeed:1.4, uGrain:0.16 } },
  ];
  let sceneIdx = 0;                                   // 当前场景索引
  const state  = { ...SCENES[0].p };                  // 实际 uniform 值(每帧向 target 平滑靠拢)
  const target = { ...SCENES[0].p };                  // 目标值(滑块/场景切换写这里)

  // ==================== 滑块参数表(与场景系统共用 state/target) ====================
  const PARAMS = [
    // —— 节奏与镜头 ——
    { key: "uSpeed",       label: "梦的流速",     min: 0.5,  max: 4,    step: 0.05,   value: 2.1 },
    { key: "uRollSpeed",   label: "天旋地转",     min: 0,    max: 1,    step: 0.01,   value: 0.33 },
    { key: "uSwirl",       label: "卷入漩涡",     min: 0,    max: 1.5,  step: 0.01,   value: 0.5 },
    { key: "uZoomBreath",  label: "梦的呼吸",     min: 0,    max: 0.15, step: 0.005,  value: 0.05 },
    { key: "uZoomSpeed",   label: "呼吸节奏",     min: 0.2,  max: 2,    step: 0.05,   value: 0.85 },
    { key: "uPushAmt",     label: "坠入深度",     min: 0,    max: 0.4,  step: 0.01,   value: 0.13 },
    { key: "uPushSpeed",   label: "坠落频率",     min: 0.3,  max: 3,    step: 0.05,   value: 1.2 },
    // —— 折叠与爆裂 ——
    { key: "uFoldAmt",     label: "空间揉皱",     min: 0,    max: 0.25, step: 0.005,  value: 0.10 },
    { key: "uFoldHz",      label: "重组之潮",     min: 0.05, max: 0.6,  step: 0.01,   value: 0.22 },
    { key: "uBurstAmt",    label: "爆裂光斑强度", min: 0,    max: 1.5,  step: 0.05,   value: 0.5 },
    { key: "uBurstHz",     label: "爆裂触发频率", min: 0.5,  max: 6,    step: 0.1,    value: 2.5 },
    { key: "uFlashAmt",    label: "频闪强度",     min: 0,    max: 0.3,  step: 0.01,   value: 0.11 },
    { key: "uFlashHz",     label: "频闪速率",     min: 0.5,  max: 8,    step: 0.1,    value: 3.4 },
    // —— 抖动 ——
    { key: "uJitterAmt",   label: "梦的震颤",     min: 0,    max: 0.02, step: 0.0005, value: 0.006 },
    { key: "uJitterHz",    label: "震颤频率",     min: 1,    max: 40,   step: 1,      value: 16 },
    { key: "uTremor",      label: "细微颤动",     min: 0,    max: 0.006,step: 0.0002, value: 0.0016 },
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
  const sliderEls = {};   // key -> {inp, val},场景切换时同步滑块显示

  // ==================== 场景切换:显示「标题 + 情绪标签 + 小故事」故事卡,约 3 秒淡入淡出 ====================
  const sceneTip = document.getElementById("sceneTip");
  let sceneTipTimer = null;
  function switchScene(idx) {
    sceneIdx = (idx + SCENES.length) % SCENES.length;
    const s = SCENES[sceneIdx];
    Object.assign(target, s.p);                        // 目标值切换,渲染循环里平滑过渡
    for (const p of PARAMS) {                          // 同步滑块显示
      const el = sliderEls[p.key];
      if (el) { el.inp.value = target[p.key]; el.val.textContent = (+target[p.key]).toFixed(p.step < 0.01 ? 4 : 2); }
    }
    // 故事卡:标题 + 情绪标签 + 小故事
    sceneTip.innerHTML =
      '<div class="s-title">「' + s.name + '」</div>' +
      '<div><span class="s-tag">' + s.tag + '</span></div>' +
      '<div class="s-story">' + s.story + '</div>';
    sceneTip.style.opacity = 1;
    clearTimeout(sceneTipTimer);
    sceneTipTimer = setTimeout(() => { sceneTip.style.opacity = 0; }, 3000);   // 停留约 3 秒
  }

  // ==================== 粒子(点头 = 记忆碎片迸发;颜色跟随当前梦境主题) ====================
  const fx = document.getElementById("fx");
  const fctx = fx.getContext("2d");
  let particles = [];
  let whiteFlash = 0;                                  // 摇头「猛然惊醒」时的全屏白闪强度
  function resizeFx() {
    fx.width = window.innerWidth; fx.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeFx);
  resizeFx();
  function burst(cx, cy, n, colors) {                  // colors 缺省时用初始梦境色板
    const pal = colors || SCENES[0].colors;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 8;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        life: 1, decay: 0.012 + Math.random() * 0.014,
        size: 2 + Math.random() * 3.5,
        color: pal[(Math.random() * pal.length) | 0],
      });
    }
  }
  function fxStep(dt) {                                // 每帧更新 & 绘制粒子层 + 惊醒白闪
    fctx.clearRect(0, 0, fx.width, fx.height);
    if (whiteFlash > 0) {                              // 猛然惊醒:全屏白光一闪
      fctx.fillStyle = `rgba(255,255,255,${Math.min(1, whiteFlash).toFixed(3)})`;
      fctx.fillRect(0, 0, fx.width, fx.height);
      whiteFlash -= dt * 2.2;                          // 约 0.45s 衰减完
    }
    if (!particles.length) return;
    const alive = [];
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.985; p.life -= p.decay * (dt * 60);
      if (p.life > 0) {
        fctx.globalAlpha = Math.max(0, p.life);
        fctx.fillStyle = p.color;
        fctx.beginPath(); fctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, 6.283); fctx.fill();
        alive.push(p);
      }
    }
    fctx.globalAlpha = 1;
    particles = alive;
  }

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
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, buildFragmentSource()));
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

  // ---- 「梦境调节旋钮」面板 ----
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
      state[p.key] = parseFloat(inp.value);      // 旋钮直接写 state 和 target(不被场景过渡拉回)
      target[p.key] = parseFloat(inp.value);
      val.textContent = inp.value;
    });
    row.append(lab, inp, val);
    rows.appendChild(row);
    sliderEls[p.key] = { inp, val };
  }

  // ---- 面板收起/展开:点标题栏折叠成把手,再点展开 ----
  const panelEl = document.getElementById("panel");
  const panelFold = document.getElementById("panelFold");
  document.getElementById("panelHead").addEventListener("click", () => {
    const folded = panelEl.classList.toggle("collapsed");
    panelFold.textContent = folded ? "+" : "—";
  });

  // ---- 交互:鼠标 / 触摸拖动视角(原有交互,保留) ----
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

  function showErr(msg) {
    errBox.style.display = "block";
    errBox.textContent = msg;
  }

  // ════════════════ 头部交互(MediaPipe Face Detection,识别逻辑不变;叙事含义如下) ════════════════
  //   向左转头 → 回溯过往梦境片段(上一个场景)
  //   向右转头 → 向前游历下一段梦境(下一个场景)
  //   低头点头 → 脑海迸发记忆碎片(粒子爆发)
  //   快速摇头 → 猛然惊醒,瞬间拉回最初入睡的「沉眠起始」
  const camVideo = document.getElementById("cam");
  const camStatus = document.getElementById("camStatus");
  const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/face-detection@0.4.1646425229";
  let headCooldownUntil = 0, shakeCooldownUntil = 0;
  let lastShakeDir = 0, shakeDirTime = 0, shakeCount = 0;
  let pitchBaseline = null, faceTrackingOn = false;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.crossOrigin = "anonymous";
      s.onload = res;
      s.onerror = () => rej(new Error("脚本加载失败"));
      document.head.appendChild(s);
      setTimeout(() => rej(new Error("脚本加载超时")), 15000);
    });
  }

  function onFaceResults(results) {
    if (!faceTrackingOn) return;
    const det = results.detections && results.detections[0];
    if (!det || !det.keypoints || det.keypoints.length < 3) return;
    const kp = det.keypoints;                          // [右眼, 左眼, 鼻尖, 嘴, 右耳, 左耳]
    const ex = (kp[0].x + kp[1].x) / 2, ey = (kp[0].y + kp[1].y) / 2;
    const eyeDist = Math.hypot(kp[0].x - kp[1].x, kp[0].y - kp[1].y) || 1e-6;
    const yaw   = (kp[2].x - ex) / eyeDist;            // 左右转头比例
    const pitch = (kp[2].y - ey) / eyeDist;            // 纵向比例(点头时增大)
    const now = performance.now() / 1000;

    // 个人基线:慢速跟随,适应不同脸型与坐姿
    if (pitchBaseline === null) pitchBaseline = pitch;
    pitchBaseline += (pitch - pitchBaseline) * 0.02;
    const pitchDelta = pitch - pitchBaseline;

    // 摇头检测:0.8s 内左右方向交替 ≥3 次 → 猛然惊醒
    const sgn = yaw > 0.16 ? 1 : (yaw < -0.16 ? -1 : 0);
    if (sgn !== 0 && sgn !== lastShakeDir) {
      if (now - shakeDirTime < 0.8 && sgn === -lastShakeDir) shakeCount++;
      else if (lastShakeDir === 0 || now - shakeDirTime >= 0.8) shakeCount = 1;
      lastShakeDir = sgn; shakeDirTime = now;
    }
    if (shakeCount >= 3) {
      shakeCount = 0; shakeCooldownUntil = now + 2.0; headCooldownUntil = now + 1.5;
      switchScene(0);                                  // 猛然惊醒:拉回最初入睡的梦境
      whiteFlash = 1;                                  // 惊醒一瞬间:全屏白光闪一下
      burst(window.innerWidth / 2, window.innerHeight * 0.45, 90, SCENES[0].colors);
      return;
    }
    if (now < Math.max(headCooldownUntil, shakeCooldownUntil)) return;

    // 点头 → 脑海迸发记忆碎片(粒子颜色跟随当前梦境主题)
    if (pitchDelta > 0.15) {
      headCooldownUntil = now + 1.2; pitchBaseline = pitch + 0.05;
      burst(window.innerWidth / 2, window.innerHeight * 0.45, 200, SCENES[sceneIdx].colors);
      return;
    }
    // 左右转头 → 回溯 / 游历
    if (yaw > 0.34)       { headCooldownUntil = now + 1.4; switchScene(sceneIdx - 1); }
    else if (yaw < -0.34) { headCooldownUntil = now + 1.4; switchScene(sceneIdx + 1); }
  }

  async function setupHeadTracking() {
    try {
      // 1) 请求摄像头(页面加载即弹权限)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" }, audio: false
      });
      camVideo.srcObject = stream;
      await camVideo.play();
      camStatus.textContent = "摄像头:已连接,加载人脸模型…";
      // 2) 加载 MediaPipe Face Detection(CDN,首次需联网)
      await loadScript(MP + "/face_detection.js");
      const faceDetection = new FaceDetection({ locateFile: f => `${MP}/${f}` });
      faceDetection.setOptions({ model: "short" });
      faceDetection.onResults(onFaceResults);
      faceTrackingOn = true;
      camStatus.textContent = "你的脸已入梦 ✔ 试试转头/点头/摇头";
      // 3) 检测循环(异步防重入,~15fps 足够)
      (async () => {
        while (faceTrackingOn) {
          try { if (camVideo.readyState >= 2) await faceDetection.send({ image: camVideo }); }
          catch (e) { /* 单帧失败忽略 */ }
          await new Promise(r => setTimeout(r, 66));
        }
      })();
    } catch (e) {
      const msg = String((e && e.name) || e);
      camStatus.textContent = (msg.includes("NotAllowed") || msg.includes("Permission")
        ? "摄像头:权限被拒绝" : "摄像头:不可用") + "(头动交互停用,鼠标交互正常)";
    }
  }
  setupHeadTracking();   // 页面加载即弹摄像头权限

  // ---- 主循环 ----
  const t0 = performance.now();
  let lastT = 0, frame = 0, lastFrameTime = t0, lastNow = t0;

  function render(now) {
    resize();
    const dt = Math.min((now - lastNow) / 1000, 0.1);
    lastNow = now;
    const time = paused ? lastT : (now - t0) / 1000;
    lastT = time;
    lastFrameTime = now;
    frame++;

    // 场景/旋钮参数平滑过渡:state → target
    const k = 1 - Math.exp(-dt * 3);
    for (const p of PARAMS) state[p.key] += (target[p.key] - state[p.key]) * k;

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
    fxStep(dt);   // 粒子层 + 惊醒白闪更新

    // 顶部 HUD:梦境体验文案;空格暂停 = 【意识暂停】
    if (frame % 15 === 0) {
      const s = SCENES[sceneIdx];
      hud.textContent = paused
        ? `🌙【意识暂停】梦悬停在「${s.name}」 · 再按空格继续沉沦`
        : `🌙 梦游中 ·「${s.name}」(${s.tag})  ·  空格:意识暂停 · H:梦境旋钮`;
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// 加载 shader 后启动(必须走 http 服务 / GitHub Pages;双击请用单文件版 index-dream-v2.html)
fetch("dream.frag")
  .then(r => { if (!r.ok) throw new Error("dream.frag 加载失败: HTTP " + r.status); return r.text(); })
  .then(src => boot(src))
  .catch(e => {
    const el = document.getElementById("err");
    el.style.display = "block";
    el.textContent = String(e.message || e);
  });
