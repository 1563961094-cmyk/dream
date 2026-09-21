# 亢奋的梦境 v2 · Dream Fractal V2

一个基于 WebGL 的实时 raymarching 分形艺术作品——"亢奋的梦境"主题改编版:
迷幻霓虹色调、空间折叠重组、隧道卷入、四色快切与局部色彩爆裂。

> 原作品:**"Fractal Cartoon"** by [Kali](https://www.shadertoy.com/user/Kali)
> (Shadertoy: [XsBXWt](https://www.shadertoy.com/view/XsBXWt), 2013)
> Nyan Cat 彩虹部分来自 mu6k 的代码
> 许可:MIT License(见 [LICENSE](./LICENSE))

## 预览 / 运行

两种方式任选:

**方式一:单文件版(零依赖,双击即用)**

直接双击 `index-dream-v2.html`——shader 与运行器全部内嵌,离线可跑。

**方式二:多文件版(结构清晰,适合开发与展示)**

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/index.html
```

多文件版由 `index.html` + `main.js`(运行器)+ `dream.frag`(改编 shader,运行时加载)组成;
`original_pass0.glsl` / `original_pass1.glsl`(及 `image.frag` / `sound.frag`)是从 Shadertoy 提取的原版 pass 源码存档。

> 注意:多文件版通过 fetch 加载 shader,必须走 http 服务,直接双击 `index.html` 会因浏览器安全策略加载失败(此时请用方式一)。

## 交互

| 操作 | 效果 |
|------|------|
| 鼠标 / 触摸拖动 | 旋转视角(Shadertoy `iMouse`) |
| 空格 | 暂停 / 继续 |
| `H` | 显示 / 隐藏右下角参数面板 |

## 特性

- 原版分形距离场(`de()`)、分形迭代(`formula()`)、相机路径与 raymarch 循环完整保留
- 清醒梦式空间折叠:进入分形前的 domain warp,结构周期性揉皱、展开、重组
- 隧道感:边缘向中心的旋涡 + 世界绕视线轴缓慢自转
- 呼吸式缩放、镜头推进脉冲、跳变抖动 + 47/53Hz 高频震颤、轻微频闪
- 电光蓝 / 荧光绿 / 洋红 / 金黄四色快切 + 局部爆裂光斑
- 霓虹雾虚实模糊、亮度脉动、胶片颗粒、天空径向色散
- 26 个参数滑块实时调节(WebGL2,自动回退 WebGL1)

## 技术说明

单文件自包含(HTML + 内嵌 GLSL + 运行器),无外部资源。
运行器实现了 Shadertoy 标准 uniform(`iTime` / `iResolution` / `iMouse` 等),
并通过 `#define 宏 → uniform` 桥接,使原 shader 主体在参数化改造时零改动。

说明:原作品绑定的外部资源(音频、Nyan Cat 贴图)所在的 `media.shadertoy.com`
域名已失效,本作品以黑色纹理代替,与 Shadertoy 官网当前的实际呈现一致。
若将 256×256 的 `nyanRgb.png` 放在同目录并命名为 `nyan.png`,彩虹猫会自动启用。

## 参数

右下角滑块面板分组:**节奏与镜头**(速度/自转/旋涡/呼吸缩放/推进)、
**折叠与爆裂**(折叠强度与周期/爆裂/频闪)、**抖动**(幅度/频率/微颤)、
**色彩**(色相流转/四色快切/流体扭曲)、**梦境质感**(雾化/脉动/饱和/对比/噪点)。

默认值与量程见 `index-dream-v2.html` 中 JS 顶部的 `PARAMS` 表;
四色的具体 RGB 在 shader 源码的 `dreamTint()` 函数中。
