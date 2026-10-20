import { useEffect, useRef, useState } from 'react'
import { fx, prefersReduced } from './fx'

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'

// 同一支著色器畫水墨（uMode=0）、星空（uMode=1）與首頁太極；主色從 tokens 的 --ml-gl-* 傳進來，這裡只留明暗與混色數值
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uStir;uniform vec3 uBurst;uniform float uMode;
uniform float uTaiji;uniform float uExp;uniform float uSide;uniform float uAng;uniform vec3 uTC;
uniform vec3 uPaper;uniform vec3 uInk;uniform vec3 uSky;uniform vec3 uSkyHi;uniform vec3 uStar;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
float stars(vec2 uv,float sc,float t){vec2 g=uv*sc;vec2 id=floor(g);vec2 f=fract(g)-.5;float r=h(id);if(r<.92)return 0.;vec2 o=vec2(h(id+3.1),h(id+7.7))-.5;float d=length(f-o*.6);float tw=.6+.4*sin(t*(1.+r*3.)+r*40.);return smoothstep(.06,0.,d)*tw;}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;
 vec2 p=vec2(uv.x*asp,uv.y)*2.2;
 vec2 m=vec2(uMouse.x*asp,uMouse.y)*2.2;vec2 d=p-m;float dl=length(d);
 p+=vec2(-d.y,d.x)*uStir*exp(-dl*dl*2.5)*.9;
 vec2 b=vec2(uBurst.x*asp,uBurst.y)*2.2;float bt=uTime-uBurst.z;float bd=length(p-b);
 float ring=bt>0.&&bt<6.?exp(-pow(bd-bt*1.1,2.)*5.)*exp(-bt*.8):0.;
 p+=normalize(p-b+1e-4)*ring*.3;
 float t=uTime*.035;
 vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
 vec2 r=vec2(fbm(p+3.5*q+vec2(1.7,9.2)+t*1.5),fbm(p+3.5*q+vec2(8.3,2.8)-t*1.2));
 float f=fbm(p+3.*r);
 vec3 ink=mix(uInk,uPaper*.22,smoothstep(.45,.95,f)*.6);
 ink=mix(ink,uInk*.28,smoothstep(.55,.18,f)*.65);
 ink+=uPaper*smoothstep(.012,0.,abs(f-.62))*smoothstep(.3,.9,length(q))*.12;
 vec3 sky=mix(uSky,uSkyHi,smoothstep(.35,.9,f));
 sky=mix(sky,uSkyHi*vec3(.5,1.5,.9),smoothstep(.5,1.,r.x)*.5);
 vec2 su=uv*vec2(asp,1.);
 sky+=uStar*(stars(su,60.,uTime)+stars(su+.37,110.,uTime*1.3)*.7);
 vec3 col=mix(ink,sky,uMode);
 // 太極：墨水形成的圓，陽半＝星空、陰半＝水墨；邊緣用 fbm 擾動像墨暈
 if(uTaiji>.001){
  float md=min(uRes.x,uRes.y);
  vec2 v=(gl_FragCoord.xy-uTC.xy*uRes)/(uTC.z*md*(1.+uExp*3.2));
  v+=(vec2(fbm(v*2.3+t*4.),fbm(v*2.3+7.-t*4.))-.5)*.16;
  float ca=cos(uAng),sa=sin(uAng);v=mat2(ca,-sa,sa,ca)*v;
  float L=length(v);float w=.04;
  float disk=1.-smoothstep(1.-w*2.,1.+w*2.,L);
  float yang=smoothstep(-w,w,v.x);
  float t1=1.-smoothstep(.5-w,.5+w,length(v-vec2(0.,.5)));
  float b1=1.-smoothstep(.5-w,.5+w,length(v+vec2(0.,.5)));
  yang=mix(yang,1.,t1);yang=mix(yang,0.,b1);
  float e1=1.-smoothstep(.12-w,.12+w,length(v-vec2(0.,.5)));
  float e2=1.-smoothstep(.12-w,.12+w,length(v+vec2(0.,.5)));
  yang=mix(yang,0.,e1);yang=mix(yang,1.,e2);
  vec3 tsky=mix(uPaper*.5,uPaper*.86,smoothstep(.3,.9,f));
  vec3 tink=mix(uInk*.14,uInk*1.6,smoothstep(.4,.95,f));
  float emY=1.+.18*max(uSide,0.)-.18*max(-uSide,0.);
  float emI=1.+.6*max(-uSide,0.);
  vec3 tj=mix(tink*emI,tsky*emY,yang);
  float rim=smoothstep(.86,1.,L)*disk;
  col=mix(col,tj,disk*uTaiji*.92);
  col+=uPaper*rim*.06*uTaiji;
 }
 col+=mix(uPaper,uStar,uMode)*ring*.24;
 col*=1.-.38*length(uv-.5);
 col+=(h(gl_FragCoord.xy+fract(uTime))-.5)*.014;
 gl_FragColor=vec4(col,1.);
}`

// 讀 tokens.css 的 "0.91 0.88 0.81" 變成三個浮點數
function readVec3(name: string): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const v = raw.split(/\s+/).map(Number)
  return v.length === 3 && v.every(Number.isFinite) ? [v[0], v[1], v[2]] : [0, 0, 0]
}

export default function Background() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const cv = ref.current!
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    if (!gl) {
      setFallback(true)
      return
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[mingli]', gl.getShaderInfoLog(s))
      return s
    }
    const pr = gl.createProgram()!
    gl.attachShader(pr, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(pr)
    gl.useProgram(pr)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (k: string) => gl.getUniformLocation(pr, k)
    const u = {
      res: U('uRes'), time: U('uTime'), mouse: U('uMouse'), stir: U('uStir'), burst: U('uBurst'), mode: U('uMode'),
      taiji: U('uTaiji'), exp: U('uExp'), side: U('uSide'), ang: U('uAng'), tc: U('uTC'),
    }
    gl.uniform3f(U('uPaper'), ...readVec3('--ml-gl-paper'))
    gl.uniform3f(U('uInk'), ...readVec3('--ml-gl-ink'))
    gl.uniform3f(U('uSky'), ...readVec3('--ml-gl-sky'))
    gl.uniform3f(U('uSkyHi'), ...readVec3('--ml-gl-sky-hi'))
    gl.uniform3f(U('uStar'), ...readVec3('--ml-gl-star'))

    // 手機降解析度省電
    const size = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * (innerWidth < 720 ? 0.45 : 0.6)
      cv.width = Math.round(innerWidth * scale)
      cv.height = Math.round(innerHeight * scale)
      gl.viewport(0, 0, cv.width, cv.height)
    }
    size()
    addEventListener('resize', size)

    let running = true
    let raf = 0
    const loop = () => {
      if (!running) return
      const reduce = prefersReduced()
      const t = ((performance.now() - fx.t0) / 1000) * (reduce ? 0.25 : 1)
      fx.mode += (fx.target - fx.mode) * 0.025
      fx.taiji += (fx.taijiT - fx.taiji) * 0.03
      fx.exp += (fx.expT - fx.exp) * 0.035
      fx.side += (fx.sideT - fx.side) * 0.05
      fx.ang += reduce ? 0.0004 : 0.0016
      fx.stir *= 0.94
      // 太極位置：寬螢幕放右側，手機放右上角淡淡襯底
      const wide = innerWidth >= 900
      gl.uniform3f(u.tc, wide ? 0.78 : 0.84, wide ? 0.5 : 0.8, wide ? 0.31 : 0.38)
      gl.uniform2f(u.res, cv.width, cv.height)
      gl.uniform1f(u.time, t)
      gl.uniform2f(u.mouse, fx.mouse[0], fx.mouse[1])
      gl.uniform1f(u.stir, fx.stir)
      gl.uniform3f(u.burst, fx.burst[0], fx.burst[1], fx.burst[2])
      gl.uniform1f(u.mode, fx.mode)
      gl.uniform1f(u.taiji, fx.taiji)
      gl.uniform1f(u.exp, fx.exp)
      gl.uniform1f(u.side, fx.side)
      gl.uniform1f(u.ang, fx.ang)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      window.__mlFrames = (window.__mlFrames ?? 0) + 1
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // 分頁隱藏時暫停
    const onVisibility = () => {
      const was = running
      running = !document.hidden
      if (running && !was) raf = requestAnimationFrame(loop)
    }
    document.addEventListener('visibilitychange', onVisibility)

    let last: [number, number] | null = null
    const onMove = (e: PointerEvent) => {
      const x = e.clientX / innerWidth
      const y = 1 - e.clientY / innerHeight
      if (last) fx.stir = Math.min(1.2, fx.stir + Math.hypot(x - last[0], y - last[1]) * 6)
      last = [x, y]
      fx.mouse = [x, y]
    }
    addEventListener('pointermove', onMove, { passive: true })

    return () => {
      running = false
      cancelAnimationFrame(raf)
      removeEventListener('resize', size)
      removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} className={`ml-bg${fallback ? ' ml-bg-fallback' : ''}`} aria-hidden="true" />
}
