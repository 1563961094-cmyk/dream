// "Fractal Cartoon" - former "DE edge detection" by Kali
// "亢奋的梦境" 强化版:在保留原分形结构的前提下,叠加空间折叠/隧道卷入/频闪/四色快切/局部爆裂。

// ════════════════ 【亢奋的梦境 v2 · 可调参数区】(右下角「梦境调节旋钮」实时控制,场景切换亦驱动这些 uniform) ════════════════
// 每个参数 = uniform + 宏桥接:shader 主体写的是宏名,滑块/场景/JS 默认值驱动 uniform。
uniform float uSpeed;       // 全局速度倍率(1 = 原版)
#define SPEED        uSpeed
uniform float uWaveAmp;     // 流体波浪倍率(柔软有机感)
#define WAVE_AMP     uWaveAmp
uniform float uFoldAmt;     // 空间折叠强度(≤0.2 保持稳定)
#define FOLD_AMT     uFoldAmt
uniform float uFoldHz;      // 折叠重组周期
#define FOLD_HZ      uFoldHz
uniform float uSwirl;       // 隧道旋涡强度(弧度)
#define SWIRL        uSwirl
uniform float uRollSpeed;   // 视线卷入自转速度
#define ROLL_SPEED   uRollSpeed
uniform float uZoomBreath;  // 呼吸式缩放深度
#define ZOOM_BREATH  uZoomBreath
uniform float uZoomSpeed;   // 呼吸式缩放速度
#define ZOOM_SPEED   uZoomSpeed
uniform float uPushAmt;     // 镜头推进脉冲深度
#define PUSH_AMT     uPushAmt
uniform float uPushSpeed;   // 推进脉冲速度
#define PUSH_SPEED   uPushSpeed
uniform float uJitterAmt;   // 画面抖动幅度
#define JITTER_AMT   uJitterAmt
uniform float uJitterHz;    // 抖动跳变频率(也控噪点刷新)
#define JITTER_HZ    uJitterHz
uniform float uTremor;      // 高频震颤幅度(47/53Hz)
#define TREMOR       uTremor
uniform float uFlashAmt;    // 频闪强度(勿过大伤眼)
#define FLASH_AMT    uFlashAmt
uniform float uFlashHz;     // 频闪速率
#define FLASH_HZ     uFlashHz
uniform float uHueSpeed;    // 基础色相流转速度(弧度/秒)
#define HUE_SPEED    uHueSpeed
uniform float uTintAmt;     // 四色快切混合量
#define TINT_AMT     uTintAmt
uniform float uTintHz;      // 色彩切换频率
#define TINT_HZ      uTintHz
uniform float uBurstAmt;    // 局部色彩爆裂强度
#define BURST_AMT    uBurstAmt
uniform float uBurstHz;     // 爆裂触发频率
#define BURST_HZ     uBurstHz
uniform float uBlurAmt;     // 梦境虚实模糊
#define BLUR_AMT     uBlurAmt
uniform float uPulseAmt;    // 能量脉动强度(亮度呼吸)
#define PULSE_AMT    uPulseAmt
uniform float uPulseSpeed;  // 能量脉动速度
#define PULSE_SPEED  uPulseSpeed
uniform float uSatGain;     // 追加饱和增益
#define SAT_GAIN     uSatGain
uniform float uContrast;    // 对比度
#define CONTRAST     uContrast
uniform float uGrain;       // 噪点密度(胶片颗粒)
#define GRAIN_AMT    uGrain
// ══════════════════════════════════════════════════════════════════════════

//#define SHOWONLYEDGES
#define NYAN 
#define WAVES
#define BORDER

#define RAY_STEPS 150

#define BRIGHTNESS 1.2
#define GAMMA 1.4
#define SATURATION .65


#define detail .001
#define t iTime*.5*SPEED   // 【改】速度由 SPEED 缩放


const vec3 origin=vec3(-1.,.7,0.);
float det=0.0;
float gDist=26.0;          // 【增】命中距离,供后处理做虚实雾化


// 2D rotation function
mat2 rot(float a) {
	return mat2(cos(a),sin(a),-sin(a),cos(a));	
}

// 【增】工具:哈希 / 色相旋转(Rodrigues,绕灰轴)
float hash21(vec2 p){
	p=fract(p*vec2(.1031,.1030));
	p+=dot(p,p.yx+33.33);
	return fract((p.x+p.y)*p.x);
}
vec3 hueRotate(vec3 c, float a){
	const vec3 k=vec3(0.57735);
	float ca=cos(a), sa=sin(a);
	return c*ca + cross(k,c)*sa + k*dot(k,c)*(1.-ca);
}

// 【增】梦境四色:电光蓝 → 荧光绿 → 洋红 → 金黄
vec3 dreamTint(float i){
	i=mod(i,4.);
	if(i<0.5)      return vec3(0.15,0.55,1.00); // electric blue
	else if(i<1.5) return vec3(0.25,1.00,0.35); // fluorescent green
	else if(i<2.5) return vec3(1.00,0.10,0.75); // magenta
	else           return vec3(1.00,0.80,0.10); // golden yellow
}

// "Amazing Surface" fractal
vec4 formula(vec4 p) {
		p.xz = abs(p.xz+1.)-abs(p.xz-1.)-p.xz;
		p.y-=.25;
		p.xy*=rot(radians(35.));
		p=p*2./clamp(dot(p.xyz,p.xyz),.2,1.);
	return p;
}

// Distance function
float de(vec3 pos) {
#ifdef WAVES
	pos.y+=sin(pos.z-t*6.)*.15*WAVE_AMP; //waves! 【改】波浪幅度由 WAVE_AMP 缩放
#endif
	// 【增】清醒梦折叠:呼吸式的 domain warp——结构被周期性揉皱、展开、重组。
	// 只作用在进入分形前的坐标上,分形迭代本身不变;sin 扭曲保持形态柔软有机。
	float cyc=fract(iTime*FOLD_HZ);
	float rw=exp(-7.*abs(cyc-0.5))*(0.6+0.4*sin(iTime*0.7)); // 重组波:一次周期中段最强
	float fa=FOLD_AMT*(0.35+0.9*rw);
	pos.x+=fa*sin(pos.z*0.18+t*1.6);
	pos.z+=fa*0.8*sin(pos.x*0.15-t*1.3);
	pos.y+=fa*0.6*rw*sin(pos.x*0.25+t*1.1);

	float hid=0.;
	vec3 tpos=pos;
	tpos.z=abs(3.-mod(tpos.z,6.));
	vec4 p=vec4(tpos,1.);
	for (int i=0; i<4; i++) {p=formula(p);}
	float fr=(length(max(vec2(0.),p.yz-1.5))-1.)/p.w;
	float ro=max(abs(pos.x+1.)-.3,pos.y-.35);
		  ro=max(ro,-max(abs(pos.x+1.)-.1,pos.y-.5));
	pos.z=abs(.25-mod(pos.z,.5));
		  ro=max(ro,-max(abs(pos.z)-.2,pos.y-.3));
		  ro=max(ro,-max(abs(pos.z)-.01,-pos.y+.32));
	float d=min(fr,ro);
	return d;
}


// Camera path
vec3 path(float ti) {
	ti*=1.5;
	vec3  p=vec3(sin(ti),(1.-sin(ti*2.))*.5,-ti*5.)*.5;
	return p;
}

// Calc normals, and here is edge detection, set to variable "edge"

float edge=0.;
vec3 normal(vec3 p) { 
	vec3 e = vec3(0.0,det*5.,0.0);

	float d1=de(p-e.yxx),d2=de(p+e.yxx);
	float d3=de(p-e.xyx),d4=de(p+e.xyx);
	float d5=de(p-e.xxy),d6=de(p+e.xxy);
	float d=de(p);
	edge=abs(d-0.5*(d2+d1))+abs(d-0.5*(d4+d3))+abs(d-0.5*(d6+d5));//edge finder
	edge=min(1.,pow(edge,.55)*15.);
	return normalize(vec3(d1-d2,d3-d4,d5-d6));
}


// Used Nyan Cat code by mu6k, with some mods

vec4 rainbow(vec2 p)
{
	float q = max(p.x,-0.1);
	float s = sin(p.x*7.0+t*70.0)*0.08;
	p.y+=s;
	p.y*=1.1;
	
	vec4 c;
	if (p.x>0.0) c=vec4(0,0,0,0); else
	if (0.0/6.0<p.y&&p.y<1.0/6.0) c= vec4(255,43,14,255)/255.0; else
	if (1.0/6.0<p.y&&p.y<2.0/6.0) c= vec4(255,168,6,255)/255.0; else
	if (2.0/6.0<p.y&&p.y<3.0/6.0) c= vec4(255,244,0,255)/255.0; else
	if (3.0/6.0<p.y&&p.y<4.0/6.0) c= vec4(51,234,5,255)/255.0; else
	if (4.0/6.0<p.y&&p.y<5.0/6.0) c= vec4(8,163,255,255)/255.0; else
	if (5.0/6.0<p.y&&p.y<6.0/6.0) c= vec4(122,85,255,255)/255.0; else
	if (abs(p.y)-.05<0.0001) c=vec4(0.,0.,0.,1.); else
	if (abs(p.y-1.)-.05<0.0001) c=vec4(0.,0.,0.,1.); else
		c=vec4(0,0,0,0);
	c.a*=.8-min(.8,abs(p.x*.08));
	c.xyz=mix(c.xyz,vec3(length(c.xyz)),.15);
	return c;
}

vec4 nyan(vec2 p)
{
	vec2 uv = p*vec2(0.4,1.0);
	float ns=3.0;
	float nt = iTime*ns; nt-=mod(nt,240.0/256.0/6.0); nt = mod(nt,240.0/256.0);
	float ny = mod(iTime*ns,1.0); ny-=mod(ny,0.75); ny*=-0.05;
	vec4 color = texture(iChannel1,vec2(uv.x/3.0+210.0/256.0-nt+0.05,1.-.5+uv.y+ny));
	if (uv.x<-0.3) color.a = 0.0;
	if (uv.x>0.2) color.a=0.0;
	if (uv.y>.3) color.a=0.0;
	if (uv.y<-.3) color.a=0.0;
	return color;
}


// 【增】梦境天空:原版解析背景提成函数;带径向色散(色彩偏移)
vec3 dreamSkyBase(vec3 dir, float sunsize){
	float an=atan(dir.x,dir.y)+iTime*1.5;
	float s=pow(clamp(1.0-length(dir.xy)*sunsize-abs(.2-mod(an,.4)),0.,1.),.1); // sun
	float sb=pow(clamp(1.0-length(dir.xy)*(sunsize-.2)-abs(.2-mod(an,.4)),0.,1.),.1); // sun border
	float sg=pow(clamp(1.0-length(dir.xy)*(sunsize-4.5)-.5*abs(.2-mod(an,.4)),0.,1.),3.); // sun rays
	float y=mix(.45,1.2,pow(smoothstep(0.,1.,.75-dir.y),2.))*(1.-sb*.5); // gradient sky
	vec3 backg=vec3(0.5,0.,1.)*((1.-s)*(1.-sg)*y+(1.-sb)*sg*vec3(1.,.8,0.15)*3.);
		 backg+=vec3(1.,.9,.1)*s;
		 backg=max(backg,sg*vec3(1.,.9,.5));
	return backg;
}
vec3 dreamSky(vec3 dir, float sunsize){
	vec3 b0=dreamSkyBase(dir,sunsize);
	float ca=TINT_AMT*.06;
	vec3 br=dreamSkyBase(normalize(dir+vec3( ca, ca*.6,0.)),sunsize);
	vec3 bb=dreamSkyBase(normalize(dir+vec3(-ca*.6,-ca,0.)),sunsize);
	return vec3(br.r,b0.g,bb.b);
}

// 【增】亢奋的梦境后处理 v2.1:
// 虚实雾化 → 脉动 → 霓虹 → 色相流转 → 四色快切 → 局部爆裂 → 频闪 → 饱和 → 对比
// → 呼吸暗角 → 记忆碎片 → 幻觉色差 → 颗粒   (后三项为叙事版新增,复用 iTime,零新增 uniform)
vec3 dreamPost(vec3 c, vec2 fc){
	float breathe=.5+.5*sin(iTime*PULSE_SPEED);

	// 梦境虚实:远景融化进霓虹雾,呼吸起伏
	c=mix(c, vec3(.85,.25,1.)*(.75+.35*breathe), BLUR_AMT*.45*smoothstep(8.,26.,gDist));

	// 能量脉动
	c*=1.+PULSE_AMT*(breathe-.5)*2.;

	// 霓虹荧光:提亮压暗部,向紫粉荧光偏移
	c=max(c,0.);
	c=mix(c, pow(c,vec3(.65))*vec3(1.15,.95,1.35), .42);

	// 基础色相流转(持续缓慢旋转 + 随呼吸摆动 → 迷幻底色)
	c=hueRotate(c, iTime*HUE_SPEED + .12*breathe);

	// 四色快切:电光蓝/荧光绿/洋红/金黄,切换瞬间混合最强,像被抽换颜色
	float tseg=floor(iTime*TINT_HZ);
	float tf=fract(iTime*TINT_HZ);
	float sw=smoothstep(.55,1.,tf);
	vec3 tint=mix(dreamTint(tseg), dreamTint(tseg+1.), sw);
	c=mix(c, c*tint*2.2, TINT_AMT*(.45+.55*sw));

	// 局部色彩爆裂:稀疏的荧光光斑在眼前炸开,指数衰减(软边,保持有机感)
	float bs=floor(iTime*BURST_HZ);
	vec2 g=fc/iResolution.xy*vec2(5.,3.5);
	vec2 cid=floor(g);
	vec2 cuv=fract(g)-.5;
	float bn=hash21(cid+bs*17.7);
	float bpk=step(.9,bn);
	vec2 boff=(vec2(hash21(cid+1.3),hash21(cid+2.6))-.5)*.6;   // 斑心随机偏移
	float spot=smoothstep(.42,.05,length(cuv-boff));
	float bph=fract(iTime*BURST_HZ+bn*9.3);
	float bglow=exp(-bph*5.)*bpk;
	vec3 bcol=dreamTint(floor(bn*40.));
	c+=bcol*spot*bglow*BURST_AMT*1.2;                          // 加性荧光
	c=mix(c, bcol*1.5, spot*bglow*BURST_AMT*.45);              // 染色

	// 轻微频闪:高频尖峰,似强光在眼皮下闪
	c*=1.+FLASH_AMT*pow(.5+.5*sin(iTime*FLASH_HZ*6.2831),8.);

	// 追加饱和(叠在原版 SATURATION 之后)
	float lum=dot(c,vec3(.299,.587,.114));
	c=mix(vec3(lum), c, SAT_GAIN);

	// 对比度
	c=(c-.5)*CONTRAST+.5;

	// 【增 v2.1】呼吸暗角:模拟睡眠时眼皮的明暗节律,画面边缘随呼吸周期收拢舒展
	{
		float rN=length(fc/iResolution.xy*2.-1.);
		float eyelid=0.16+0.10*(0.5+0.5*sin(iTime*0.45));      // 慢呼吸节律
		c*=1.0-eyelid*smoothstep(0.45,1.4,rN);
	}

	// 【增 v2.1】记忆碎片:细碎的随机闪光,像梦里一闪而过的回忆
	{
		vec2 fpx=fc/iResolution.xy;
		vec2 fcid=floor(fpx*vec2(26.,15.));
		float fn=hash21(fcid+floor(iTime*1.7)*7.7);
		if (fn>0.955) {                                        // 只有极少数格子会闪
			float fph=fract(iTime*1.7+fn*13.1);
			vec2 fuv=fract(fpx*vec2(26.,15.))-0.5
			        -(vec2(hash21(fcid+3.3),hash21(fcid+5.1))-0.5)*0.5;
			float fpt=smoothstep(0.10,0.0,length(fuv));        // 软边小光点
			c+=dreamTint(floor(fn*40.0))*fpt*exp(-fph*6.0)*0.9;
		}
	}

	// 【增 v2.1】轻微幻觉色差:做梦时对焦不准的微弱 RGB 重影
	// (廉价近似:通道亮度微分离,越靠边缘越明显;强度压得很低,不刺眼)
	{
		float ab=(0.010+0.006*sin(iTime*0.9))*(0.6+0.8*length(fc/iResolution.xy-0.5));
		c=vec3(c.r*(1.0+ab), c.g*(1.0+ab*0.25), c.b*(1.0-ab));
	}

	// 噪点颗粒(按 JITTER_HZ 节奏刷新)
	float jt=floor(iTime*JITTER_HZ);
	c+=(hash21(fc+vec2(jt*17.13,jt*29.7))-.5)*GRAIN_AMT;

	return max(c,0.);
}

// Raymarching and 2D graphics

vec3 raymarch(in vec3 from, in vec3 dir) 

{
	edge=0.;
	vec3 p, norm;
	float d=100.;
	float totdist=0.;
	for (int i=0; i<RAY_STEPS; i++) {
		if (d>det && totdist<25.0) {
			p=from+totdist*dir;
			d=de(p);
			det=detail*exp(.13*totdist);
			totdist+=d; 
		}
	}
	vec3 col=vec3(0.);
	p-=(det-d)*dir;
	norm=normal(p);
#ifdef SHOWONLYEDGES
	col=1.-vec3(edge); // show wireframe version
#else
	col=(1.-abs(norm))*max(0.,1.-edge*.8); // set normal as color with dark edges
#endif		
	totdist=clamp(totdist,0.,26.);
	gDist=totdist;                     // 【增】
	dir.y-=.02;
	float sunsize=7.-max(0.,texture(iChannel0,vec2(.6,.2)).x)*5.; // responsive sun size
	col=mix(vec3(1.,.9,.3),col,exp(-.004*totdist*totdist));// distant fading to sun color
	if (totdist>25.) col=dreamSky(dir,sunsize); // hit background 【改】背景解析式提成函数
	col=pow(col,vec3(GAMMA))*BRIGHTNESS;
	col=mix(vec3(length(col)),col,SATURATION);
#ifdef SHOWONLYEDGES
	col=1.-vec3(length(col));
#else
	col*=vec3(1.,.9,.85);
#ifdef NYAN
	dir.yx*=rot(dir.x);
	vec2 ncatpos=(dir.xy+vec2(-3.+mod(-t,6.),-.27));
	vec4 ncat=nyan(ncatpos*5.);
	vec4 rain=rainbow(ncatpos*10.+vec2(.8,.5));
	if (totdist>8.) col=mix(col,max(vec3(.2),rain.xyz),rain.a*.9);
	if (totdist>8.) col=mix(col,max(vec3(.2),ncat.xyz),ncat.a*.9);
#endif
#endif
	return col;
}

// get camera position
vec3 move(inout vec3 dir) {
	vec3 go=path(t);
	vec3 adv=path(t+.7);
	float hd=de(adv);
	vec3 advec=normalize(adv-go);
	float an=adv.x-go.x; an*=min(1.,abs(adv.z-go.z))*sign(adv.z-go.z)*.7;
	dir.xy*=mat2(cos(an),sin(an),-sin(an),cos(an));
    an=advec.y*1.7;
	dir.yz*=mat2(cos(an),sin(an),-sin(an),cos(an));
	an=atan(advec.x,advec.z);
	dir.xz*=mat2(cos(an),sin(an),-sin(an),cos(an));
	return go;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy*2.-1.;
	vec2 oriuv=uv;   // 暗角用稳定坐标,画面在框内躁动

	// 【增】隧道旋涡:越靠边缘旋转越强,整个画面向中心卷入
	float rr=length(uv);
	float swirl=SWIRL*(.75+.25*sin(iTime*.5));
	uv=rot(swirl*rr*rr)*uv;

	// 【增】呼吸式缩放 + 周期性镜头推进("吸入"脉冲)
	float zoom=1.+ZOOM_BREATH*sin(iTime*ZOOM_SPEED)
	           -PUSH_AMT*pow(.5+.5*sin(iTime*PUSH_SPEED),2.);
	uv*=zoom;

	// 【增】画面抖动:全屏一致的低频跳变 + 高频震颤(失控感)
	float jt=floor(iTime*JITTER_HZ);
	vec2 jit=(vec2(hash21(vec2(jt*.1031,jt*.11369)),hash21(vec2(jt*.7131+3.7,jt*.9137)))-.5)*2.*JITTER_AMT;
	jit+=vec2(sin(iTime*47.),cos(iTime*53.))*TREMOR;
	uv+=jit;
	uv+=vec2(sin(iTime*.8),cos(iTime*.63))*.003*(JITTER_AMT*160.);

	uv.y*=iResolution.y/iResolution.x;
	vec2 mouse=(iMouse.xy/iResolution.xy-.5)*3.;
	if (iMouse.z<1.) mouse=vec2(0.,-0.05);
	float fov=.9-max(0.,.7-iTime*.3);
	fov*=1.-.06*pow(.5+.5*sin(iTime*PUSH_SPEED*.5),2.); // 【增】视场随推进脉冲呼吸
	vec3 dir=normalize(vec3(uv*fov,1.));
	dir.yz*=rot(mouse.y);
	dir.xz*=rot(mouse.x);
	// 【增】视线卷入:世界绕视线轴缓慢旋转(隧道感)
	dir.xz*=rot(iTime*ROLL_SPEED+.15*sin(iTime*.37));
	vec3 from=origin+move(dir);
	vec3 color=raymarch(from,dir); 

	// 【增】亢奋的梦境后处理 v2.1
	color=dreamPost(color, fragCoord);

	#ifdef BORDER
	color=mix(vec3(0.),color,pow(max(0.,.95-length(oriuv*oriuv*oriuv*vec2(1.05,1.1))),.3));
	#endif
	fragColor = vec4(color,1.);
}
