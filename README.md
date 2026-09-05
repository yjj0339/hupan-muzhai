# 湖畔木宅 · Lakeside Timber House

用 Three.js 复刻的一座临水现代建筑：混凝土挑板、木格栅幕墙、玻璃大厅、屋顶草甸，
俯瞰一池静水，黄昏光线，树影芦苇与岩石环绕。

- 操作：拖动旋转 · 滚轮缩放 · 右上角切换四个机位
- 技术：Three.js 0.170（WebGL2）· 程序化贴图（Canvas 生成，无外部资源）· Water 镜面反射 · Sky 大气散射
- 线上地址：部署后见下方

## 本地预览

```bash
node tools/server.js   # http://localhost:8080
```

## 目录

- `index.html` — 页面与中文 UI
- `js/main.js` — 场景搭建（建筑 / 水塘 / 植物 / 光照 / 交互）
- `js/textures.js` — 程序化贴图工厂
- `lib/` — three 0.170 与所需 addons（本地化，无 CDN 依赖）
