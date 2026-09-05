// 程序化贴图工厂 —— 全部由 Canvas 生成，无外部资源
import * as THREE from 'three';

// ---------- 可复现随机数 ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(size, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = opts.w || size; c.height = opts.h || size;
  const ctx = c.getContext('2d');
  draw(ctx, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.wrap) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
  tex.anisotropy = 4;
  return tex;
}

// ---------- 洞石（混凝土挑板 / 石墙） ----------
export function makeTravertine(rng) {
  return canvasTexture(512, (ctx, w, h) => {
    ctx.fillStyle = '#d2c3a6'; ctx.fillRect(0, 0, w, h);
    // 水平层理（收敛一些，避免像木纹）
    for (let y = 0; y < h; y += 1) {
      const n = Math.sin(y * 0.05) * 4 + Math.sin(y * 0.019 + 1.7) * 6 + (rng() - 0.5) * 5;
      ctx.fillStyle = `rgba(${162 + n * 1.4 | 0},${144 + n * 1.3 | 0},${116 + n * 1.2 | 0},0.10)`;
      ctx.fillRect(0, y, w, 1);
    }
    // 大块云斑
    for (let i = 0; i < 26; i++) {
      const x = rng() * w, y = rng() * h, r = 26 + rng() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const warm = rng() > 0.5;
      g.addColorStop(0, warm ? 'rgba(196,178,148,0.20)' : 'rgba(226,216,198,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // 洞石小孔
    for (let i = 0; i < 900; i++) {
      const x = rng() * w, y = rng() * h, r = 0.5 + rng() * 1.8;
      ctx.fillStyle = `rgba(120,104,82,${0.05 + rng() * 0.13})`;
      ctx.beginPath(); ctx.ellipse(x, y, r * (1 + rng()), r * 0.6, 0, 0, 7); ctx.fill();
    }
    // 细裂缝
    ctx.strokeStyle = 'rgba(130,114,90,0.18)'; ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      let x = rng() * w, y = rng() * h;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < 14; s++) { x += (rng() - 0.5) * 26; y += (rng() - 0.3) * 12; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }, { wrap: true });
}

// ---------- 木材（竖纹，用于格栅 / 柱 / 地板） ----------
export function makeWood(rng, base = '#a4713f', dark = '#7c5026') {
  return canvasTexture(256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 240; i++) {
      const x = rng() * w, ww = 0.5 + rng() * 2.4, a = 0.04 + rng() * 0.12;
      ctx.strokeStyle = rng() > 0.5 ? `rgba(60,36,14,${a})` : `rgba(226,180,124,${a})`;
      ctx.lineWidth = ww;
      ctx.beginPath(); ctx.moveTo(x, -8);
      let xx = x;
      for (let y = 0; y <= h + 8; y += 26) { xx += (rng() - 0.5) * 4; ctx.lineTo(xx, y); }
      ctx.stroke();
    }
    // 节疤
    for (let i = 0; i < 5; i++) {
      const x = rng() * w, y = rng() * h, r = 3 + rng() * 7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0, dark); g.addColorStop(0.55, 'rgba(124,80,38,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.8, 0, 0, 7); ctx.fill();
    }
  }, { wrap: true, h: 512 });
}

// ---------- 内墙灰泥 ----------
export function makePlaster(rng) {
  return canvasTexture(256, (ctx, w, h) => {
    ctx.fillStyle = '#efe7d6'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = rng() * w, y = rng() * h, r = rng() * 1.6;
      ctx.fillStyle = rng() > 0.5 ? 'rgba(210,198,176,0.10)' : 'rgba(255,250,238,0.12)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  }, { wrap: true });
}

// ---------- 草地地面（暖橄榄金） ----------
export function makeGround(rng) {
  return canvasTexture(512, (ctx, w, h) => {
    ctx.fillStyle = '#93894f'; ctx.fillRect(0, 0, w, h);
    // 色块斑块
    for (let i = 0; i < 190; i++) {
      const x = rng() * w, y = rng() * h, r = 10 + rng() * 64;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const c = ['#75743e', '#a89a58', '#6a7038', '#b5a35c', '#8a8748', '#9c8f4c'][rng() * 6 | 0];
      g.addColorStop(0, c + '66'); g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // 草叶短笔触
    for (let i = 0; i < 5200; i++) {
      const x = rng() * w, y = rng() * h, len = 2 + rng() * 7, ang = -Math.PI / 2 + (rng() - 0.5) * 1.4;
      ctx.strokeStyle = ['#646a36', '#9a8c50', '#b8a55e', '#565e30', '#87834a', '#a3965a'][rng() * 6 | 0] + '';
      ctx.globalAlpha = 0.3 + rng() * 0.34;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { wrap: true });
}

// ---------- 树冠卡片（带透明通道的叶团） ----------
export function makeFoliage(rng, palette) {
  return canvasTexture(256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    // 底层暗叶
    for (let i = 0; i < 420; i++) {
      const a = rng() * Math.PI * 2, rr = Math.pow(rng(), 0.6) * w * 0.47;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
      const s = 2.5 + rng() * 6.5;
      ctx.fillStyle = palette.dark + '';
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.58, rng() * 3, 0, 7); ctx.fill();
    }
    // 中层
    for (let i = 0; i < 330; i++) {
      const a = rng() * Math.PI * 2, rr = Math.pow(rng(), 0.68) * w * 0.44;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.9;
      const s = 2 + rng() * 5.5;
      ctx.fillStyle = rng() > 0.5 ? palette.mid : palette.mid2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.56, rng() * 3, 0, 7); ctx.fill();
    }
    // 亮叶（受光）
    for (let i = 0; i < 170; i++) {
      const a = rng() * Math.PI * 2, rr = Math.pow(rng(), 0.78) * w * 0.42;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.88 - 4;
      const s = 1.8 + rng() * 4.5;
      ctx.fillStyle = palette.lit;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.5, rng() * 3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

// ---------- 芦苇 / 草丛卡片 ----------
export function makeReeds(rng) {
  return canvasTexture(256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cols = ['#b3a260', '#9c9455', '#cdb672', '#8a8748', '#c2a862', '#7c7a44'];
    for (let i = 0; i < 34; i++) {
      const x0 = 16 + rng() * (w - 32);
      const bend = (rng() - 0.5) * 70;
      const top = 4 + rng() * 30;
      const lw = 1.4 + rng() * 2.4;
      const grad = ctx.createLinearGradient(0, h, 0, top);
      const c = cols[rng() * cols.length | 0];
      grad.addColorStop(0, '#615c34'); grad.addColorStop(0.5, c); grad.addColorStop(1, c);
      ctx.strokeStyle = grad; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, h);
      ctx.quadraticCurveTo(x0 + bend * 0.22, h * 0.5, x0 + bend, top);
      ctx.stroke();
      // 穗
      if (rng() > 0.45) {
        ctx.fillStyle = ['#d9c48a', '#c8ad74', '#e0cfa0'][rng() * 3 | 0] + '';
        ctx.beginPath(); ctx.ellipse(x0 + bend, top + 4, 1.8, 6.5, bend * 0.004, 0, 7); ctx.fill();
      }
    }
  });
}

// ---------- 树皮 ----------
export function makeBark(rng) {
  return canvasTexture(256, (ctx, w, h) => {
    ctx.fillStyle = '#57432e'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 130; i++) {
      const x = rng() * w, ww = 1 + rng() * 5;
      ctx.strokeStyle = rng() > 0.5 ? 'rgba(36,26,14,0.4)' : 'rgba(140,114,80,0.3)';
      ctx.lineWidth = ww;
      ctx.beginPath(); ctx.moveTo(x, -6);
      let xx = x;
      for (let y = 0; y <= h + 6; y += 30) { xx += (rng() - 0.5) * 10; ctx.lineTo(xx, y); }
      ctx.stroke();
    }
  }, { wrap: true, h: 512 });
}

// ---------- 可平铺水面法线（整数波数正弦叠加，保证无缝） ----------
export function makeWaterNormals() {
  const N = 256;
  const rng = mulberry32(20260905);
  const waves = [];
  for (let i = 0; i < 42; i++) {
    const kx = Math.round((rng() * 2 - 1) * 10);
    const ky = Math.round((rng() * 2 - 1) * 10);
    if (kx === 0 && ky === 0) continue;
    const k = Math.hypot(kx, ky);
    waves.push({ kx, ky, a: (0.55 + rng() * 0.9) / (k * 0.55 + 1), p: rng() * Math.PI * 2 });
  }
  const height = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (const wv of waves) v += wv.a * Math.sin(2 * Math.PI * (wv.kx * x + wv.ky * y) / N + wv.p);
    height[y * N + x] = v;
  }
  const data = new Uint8Array(N * N * 4);
  const strength = 1.1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const xl = height[y * N + ((x - 1 + N) % N)], xr = height[y * N + ((x + 1) % N)];
    const yu = height[((y - 1 + N) % N) * N + x], yd = height[((y + 1) % N) * N + x];
    const dx = (xl - xr) * strength, dy = (yu - yd) * strength;
    const inv = 1 / Math.hypot(dx, dy, 1);
    const i = (y * N + x) * 4;
    data[i] = (dx * inv * 0.5 + 0.5) * 255;
    data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
    data[i + 2] = (inv * 0.5 + 0.5) * 255;
    data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ---------- 柔光圆点（尘埃 / 光斑） ----------
export function makeSoftDot() {
  return canvasTexture(64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,240,214,1)');
    g.addColorStop(0.4, 'rgba(255,236,200,0.55)');
    g.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
}

// ---------- 抽象装饰画（室内挂画） ----------
export function makeArt(rng) {
  return canvasTexture(128, (ctx, w, h) => {
    const bases = ['#e8e0cf', '#efe6d2', '#e2d8c2'];
    ctx.fillStyle = bases[rng() * 3 | 0]; ctx.fillRect(0, 0, w, h);
    const cols = ['#a4703a', '#5d6b4a', '#b8a06a', '#7b6a4f', '#c9b184'];
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = cols[rng() * cols.length | 0];
      ctx.globalAlpha = 0.5 + rng() * 0.45;
      if (rng() > 0.5) ctx.fillRect(rng() * w * 0.7, rng() * h * 0.7, 10 + rng() * 46, 10 + rng() * 40);
      else { ctx.beginPath(); ctx.arc(rng() * w, rng() * h, 6 + rng() * 22, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  });
}
