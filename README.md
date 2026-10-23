# 陈芷曦作品集

本仓库保留正式网站、当前概念方案、交互组件、设计数据、模型源文件与精选过程稿；已移除不再维护的旧首页备份和重复参考副本。

## 快速预览

正式网站入口：

`site/index.html`

页面包含 ES Module，建议在本地启动 HTTP 服务后浏览：

```bash
cd site
python3 -m http.server 8080
```

然后打开 <http://localhost:8080>。

## 目录

```text
.
├── site/                 # 正式网站、9 个项目页、PDF 与运行资源
├── docs/                 # 已整理的模型、思路和版本说明
├── concepts/
│   ├── store/            # 灵感补给站 v0.1—v0.4 概念图
│   ├── blockout/         # 3D 灰模截图
│   └── covers/           # 项目封面探索与联系表
├── components/
│   ├── flex-carousel/    # FlexCarousel 源码与 OGL 依赖
│   ├── flux-lines/       # FluxLines 开发源文件
│   └── page-parts/       # 首页分段、项目模板与个人卡样式
├── blender/              # 店员模型工程、GLB 与四视图渲染
├── design-data/          # Figma / 页面结构 JSON
├── source-assets/        # NativeLike 与头像处理原始素材
└── tools/portrait-cutout/# 头像抠图工具源码
```

## 主要入口

- 正式网站：[site/index.html](site/index.html)
- 当前项目交接：[docs/HANDOFF.md](docs/HANDOFF.md)
- 3D 便利店灰模：[site/_blockout/index.html](site/_blockout/index.html)
- 2.5D 镜头试验：[site/_scene.html](site/_scene.html)
- 65 页 PDF：[site/portfolio.pdf](site/portfolio.pdf)
- 模型与思路整理：[docs/作品集-模型与思路整理.md](docs/作品集-模型与思路整理.md)
- 灵感补给站 v0.4 方案：[concepts/store/scene-v04.png](concepts/store/scene-v04.png)
- 作品索引图：[concepts/covers/contact_sheet.png](concepts/covers/contact_sheet.png)
- 当前店内预览：[docs/blockout-v0.3-inside.png](docs/blockout-v0.3-inside.png)
- 当前售货机正视预览：[docs/blockout-v0.3-vending.png](docs/blockout-v0.3-vending.png)
- Blender 店员正面渲染：[blender/output/clerk_refined_front.png](blender/output/clerk_refined_front.png)
- Blender 店外三视图：[concepts/store/blender/store-exterior-three-views-final.png](concepts/store/blender/store-exterior-three-views-final.png)
- 替换后的高精度道具：[concepts/store/blender/store-props-replaced-final.png](concepts/store/blender/store-props-replaced-final.png)
- 新冰淇淋柜网页检查图：[concepts/store/store-freezer-supplied-final.jpg](concepts/store/store-freezer-supplied-final.jpg)
- 网页完整外景预览：[concepts/store/store-web-modeled-exterior-final.png](concepts/store/store-web-modeled-exterior-final.png)
- 网页店内组合预览：[concepts/store/store-web-interior-final.png](concepts/store/store-web-interior-final.png)

当前场景为 v0.8：店外采用左侧大橱窗与贴右边缘的双开玻璃门，补齐深绿檐口、朱砂红布棚、竖招、石铺人行道和门前物件；店内净空间约 5.0m × 3.8m，收银柜台沿左侧动线纵向布置，货架和陈列柜均收进外景壳体内。进店后切换为受限的第一人称视角，使用 `WASD` 行走、拖拽转头、准星对准物件后按 `F` 查看特写；`Esc` 可从特写返回原行走位置。双门围绕外侧铰链同步内开，进店后店员自动说欢迎语。

店外另有一套可编辑的 Blender 资产：`blender/build_store_exterior.py` 可重建白底四视图、`blender/output/store_exterior.blend` 和约 `9.94 MB` 的 `site/assets/models/store-exterior.glb`。饮料机和冰淇淋柜均使用用户提供的新资产，经减面与 1024 WebP 贴图压缩后嵌入。室内不做重复建模；网页已加载完整店外模型，只隐藏模型中的空室内占位，并继续复用 `site/_blockout/blockout.js` 中已经完成的、带店员的室内互动场景。店员模型在外景完成后空闲加载，避免两个大文件同时抢占首屏带宽。

Blender 店员已接入网页，并只保留当前带 PBR 贴图的 `site/assets/models/clerk-optimized.glb`。旧程序化角色和左半身中间模型已移除。网页模型经过近景验证的适度减面，从约 150 万三角面降至约 22.5 万三角面，并将 4096 贴图缩至 2048 WebP；颜色贴图做轻度降噪，法线强度降到 0.35，以避免放大后出现坑点。交付文件约 10.3 MB。可继续编辑的工程保存在 `blender/output/clerk_refined.blend`。

## 导入说明

本次从 `2026-10-14/https-github-com-7jinch2-dev-7jinch2` 导入了所有用于展示、复现和维护作品的资料。

为了保持仓库轻量，以下内容没有导入：

- `2026-10-20/ni-ke`：空目录，没有文件；
- `work/tools/.mcache`：约 271 MB 的构建缓存；
- `work/pylibs`：约 154 MB 的 Python 运行环境；
- `work/deploy/repo`：与 `site/` 重复的部署副本；
- `.DS_Store`、空目录和不参与展示的临时文件。

正式网站以 `site/` 为唯一编辑版本，后续修改不再分别维护旧开发稿和部署副本。
