# 作品集项目交接

更新时间：2026-10-26
工作区：`/Users/muyuganbawang/Documents/ChatGPT/作品集`

## 1. 当前结论

正式作品集已经上线：

- 线上地址：<https://7jinch2-dev.github.io/7Jinch2/>
- GitHub 仓库：<https://github.com/7jinch2-dev/7Jinch2>
- 线上分支：`main`
- 部署仓库当前提交：`e4f2c8e fix: refresh cached store scene`
- 对应源码分支提交：`8da2ce7 fix: bust cached store iframe`

线上验证结果：

- 首页：HTTP 200
- 3D 场景：HTTP 200
- 最新场景脚本：`blockout.js?v=20261026-loader-8`
- `assets/models/clerk-optimized.glb`：HTTP 200，约 `10.3 MB`
- `assets/models/store-exterior.glb`：HTTP 200，约 `9.94 MB`
- `assets/models/clerk-meshopt.glb`：HTTP 200，约 `4.13 MB`（显式快速模式）
- `assets/models/store-exterior-meshopt.glb`：HTTP 200，约 `2.92 MB`
- `images/store-poster-mobile.jpg`：HTTP 200，约 `80 KB`
- 旧 `/_blockout/clerk.js`：HTTP 404，已删除

移动端加载优化：首屏先显示静态店铺海报与真实下载进度；约 `2.92 MB` 的店外模型就绪后自动进入可自由旋转的外景，约 `10.3 MB` 的无损人物原版随后在后台加载。

> `site/_blockout/` 目录名以下划线开头。GitHub Pages 必须依赖根目录下的 `site/.nojekyll`，不能删除。

## 2. 当前页面状态

网站打开后先显示接近全屏的店铺海报与加载进度，店外模型就绪后自动显示互动外景；作品展示柜位于其后。

当前首屏遵循以下约束：

- 初始机位固定为店外。
- 不显示额外头像入口。
- 不显示“打个招呼”入口。
- 不显示底部四个入口。
- 不显示临时介绍文案或“直接进店”等文字。
- 顶部原有网站导航保留。
- 点击贴右双开玻璃门的任意一扇可进入店内；两扇门同步内开。进店后以第一人称在店内行走，准星对准物件按 `F` 查看正向特写，`Esc` 或“回到店外”可退出。
- 店外隐藏物件标签；进入店内后显示六个物件标签。
- 店外可用鼠标滚轮与移动端双指捏合推拉镜头；店内改为第一人称行走，拖拽转头。

后续新增文案、图标和入口必须先由用户提供明确内容，不要自行补写。

## 3. 店内场景状态

当前是暖色、紧凑的正面平视微缩店铺：

- 店铺净空间约 `5.0m × 3.8m`，墙高约 `2.65m`，完整收进新外景壳体。
- 左侧货架、售货机、档案矮架和右侧陈列柜围合中央动线。
- 柜台约人物身高一半，收银机、小本子和工牌按桌面物件比例缩小。
- L 形柜台沿左侧动线纵向布置，中央陈列柜移到右侧墙边，为贴右双门留出连续进门动线。
- 工牌不在人物身上，平放在柜台上。
- 店员只加载当前平滑、带 PBR 贴图的新模型。
- 店员固定正面朝向柜台；进店后自动显示欢迎语，不再提供店员点击入口。
- 进店后默认进入第一人称，镜头被限制在店内可行走区域；`WASD` 行走，拖拽转头，准星对准物件后按 `F` 交互。
- 进入店内时显示约 `2.6` 秒的悬浮操作提示；物件标签在店内显示、店外隐藏。
- 售货机、柜台、工牌、证书墙、收银机和小本子均有独立正向特写；平面物品使用俯视正面机位。按 `Esc` 从特写返回第一人称时会保留离开前的位置与朝向。
- 店内前侧新增独立内封玻璃、门框和天花板，镜头不会绕到建筑外部看到墙背面。
- 工牌在桌面平面内旋转 `90°`；工牌特写镜头同步旋转 `-90°`，确保卡面文字方向正确。
- 售货机、柜台、工牌、证书墙、收银机和小本子是六个有效交互物件；装饰货架与陈列柜不抢点击。
- 旧程序化店员和左半身中间模型均已删除，不存在回退路径。

> 店内版本已定：后续不要再为 Blender 外景工程补做第二套店内布局。最终组合时，应以当前 `site/_blockout/` 中带店员的 Three.js 室内互动场景为唯一店内内容，把新的店外立面和道具接到门洞后方。

## 4. 当前有效文件

### 工作区目录分工

- `site/`：线上正式网站，唯一的网页发布源。
- `blender/`：当前角色来源、Blender 工程、导出模型和工具脚本。
- `docs/`：项目说明、历史思路和本交接文档。
- `components/`：首页交互组件的开发源码或参考版本。
- `concepts/`：店铺概念图和 3D 方向稿。
- `design-data/`：Figma 与页面结构数据。
- `source-assets/`：项目原始图片和头像处理素材。
- `tools/`：头像抠图等辅助工具。

完整的站点、模型、概念图、设计数据、组件和项目素材保存在 GitHub `source` 分支。本地可只展开 `site/` 和 `docs/`，需要时再按目录拉取。旧首页备份、早期灰模迭代、快速预览图、旧设备快照、重复参考副本和个人照片原图不纳入公开源码归档。

### 正式网站

- `site/index.html`：作品集首页，包含全屏 3D iframe 和原有整站内容。
- `site/assets/store-preview.css`：首页 3D 场景的铺满规则，不包含额外 UI。
- `site/_blockout/index.html`：独立 3D 场景入口。
- `site/_blockout/blockout.js`：店铺布局、机位、点击、正向特写、滚轮/双指缩放、进入/退出店逻辑。
- `site/_blockout/badge.js`：桌面工牌。
- `site/_blockout/glb-loader.js`：项目内轻量 GLB 加载器，支持透明材质、发光强度、`EXT_texture_webp` 和 `EXT_meshopt_compression`。
- `site/_blockout/three.module.min.js`：Three.js r160。
- `site/assets/models/clerk-optimized.glb`：当前网页用店员模型。
- `site/assets/models/store-exterior.glb`：网页店外使用的完整便利店外景模型。
- `site/assets/models/clerk-meshopt.glb`：显式快速模式店员模型。
- `site/assets/models/store-exterior-meshopt.glb`：默认独立店外模型。
- `site/images/store-poster.jpg`：首屏静态海报。
- `site/.nojekyll`：GitHub Pages 必须保留。

### 当前模型

- `site/assets/models/clerk-optimized.glb`
- 约 `10.3 MB`
  - 约 22.4 万顶点
  - 约 22.5 万三角面
  - 2048 WebP PBR 贴图
- `site/assets/models/clerk-meshopt.glb`
- 约 `4.13 MB`
  - 约 18 万三角面，512 WebP PBR 贴图
  - 显式 Meshopt 模式；默认人物仍使用无几何压缩原版以避免近景裂纹
- `site/assets/models/store-exterior.glb`
- 约 `9.94 MB`
  - 约 22.5 万顶点、67.3 万索引
  - glTF 2.0，程序化建筑、压缩饮料机、压缩冰淇淋柜和参考盆栽
  - 已接入网页店外场景，包含贴右双门和可交互玻璃门节点
- `site/assets/models/store-exterior-meshopt.glb`
- 约 `2.92 MB`
  - Meshopt 几何压缩，512 WebP PBR 贴图
  - 独立店外 3D 的默认模型
- `blender/output/clerk_refined.blend`：当前网页模型的 Blender 工程。
- `blender/output/store_exterior.blend`：店外模型的 Blender 工程。
- `blender/output/clerk_refined_front.png`
- `blender/output/clerk_refined_side.png`
- `blender/output/clerk_refined_back.png`
- `blender/output/clerk_refined_threequarter.png`
- `concepts/store/blender/store-exterior-three-views-final.png`：白底三视图总览。
- `concepts/store/blender/store-exterior-front_threequarter-final.png`：店外四分之三视图。
- `concepts/store/blender/store-props-replaced-final.png`：替换后的售货机、冰柜和盆栽单件检查图。
- `concepts/store/store-freezer-supplied-final.jpg`：网页中新冰淇淋柜的近距离检查图。
- `concepts/store/store-web-modeled-exterior-final.png`：网页端完整建模外景与原店内场景的组合验证图。
- `concepts/store/store-web-interior-final.png`：进入门洞后的原店内场景验证图。
- `blender/source/store-props.glb`：从参考整体 GLB 中提取的三件精细道具。
- `blender/source/vending-optimized.glb`：约 `2.8 MB` 的网页饮料机源文件。
- `blender/source/freezer-optimized.glb`：约 `2.7 MB` 的网页冰淇淋柜源文件。
- `blender/source/supplied_single_clerk.glb`：当前单人角色的原始来源。

### 模型工具

- `blender/prepare_supplied_single_clerk.py`：提取单角色、归一化并渲染四视图。
- `blender/optimize_supplied_single.py`：生成当前网页 GLB、Blender 工程和四视图。
- `blender/inspect_supplied_glb.py`：检查网格、材质、尺寸和贴图。
- `blender/build_store_exterior.py`：生成独立店外模型、白底四视图和 GLB。
- `blender/extract_glb_props.py`：从整体参考 GLB 提取售货机、冰柜和盆栽。
- `blender/optimize_vending_asset.py`：把新饮料机从约 `81 MB` 压到约 `2.8 MB`，使用 1024 WebP PBR 贴图。
- `blender/optimize_freezer_asset.py`：把新冰淇淋柜从约 `82 MB` 压到约 `2.7 MB`，使用 1024 WebP PBR 贴图。
- `blender/optimize_web_meshopt.py`：从当前高清交付模型生成 Meshopt 网页版本。
- `blender/render_glb_preview.py`、`blender/analyze_glb_parts.py`：外部 GLB 的预览与连通块检查工具。

### 已删除的旧模型

以下内容已从当前工作区和线上删除：

- `site/_blockout/clerk.js`：旧程序化店员。
- `blender/build_clerk.py`：旧程序化建模脚本。
- `blender/output/clerk.blend`
- `blender/output/clerk.glb`
- `blender/output/clerk_*.png`
- `blender/output/supplied_left.*`
- `blender/crop_supplied_clerk.py`
- `blender/source/supplied_clerk.glb`：不再使用的旧角色来源。
- `blender/output/supplied_single_normalized.glb`：可由准备脚本重新生成的中间模型。
- `blender/output/supplied_single_clerk.blend`：可由准备脚本重新生成的中间工程。

不要从旧提交恢复这些文件，除非用户明确要求。

## 5. 关键实现位置

### 首页 3D 入口

在 `site/index.html` 中搜索：

```html
id="storeEntry"
```

当前 iframe：

```html
src="_blockout/?embed=1"
```

`embed=1` 会隐藏 3D 场景内部的品牌角标、机位按钮和底部操作提示。进入店内后仍显示场景标签；仍在店外时隐藏标签，避免遮挡店面。

### 初始店外视角

在 `site/_blockout/blockout.js` 文件末尾：

- 无 `shot` 参数时 `startName` 为 `street`。
- 已移除启动后自动进入店内的延时逻辑。
- 只有 URL 明确要求某个机位时才会自动切换。

测试入口：

```text
_blockout/?embed=1
_blockout/?shot=inside
_blockout/?shot=badge
_blockout/?shot=vending
_blockout/?shot=counter
_blockout/?shot=register
_blockout/?shot=notebook
_blockout/?shot=wall
```

### 进店与双门逻辑

- 点击双门任意一扇、`Esc` 或“进店”按钮会执行 `enterThroughDoor()`。
- `Left door`、`Right door` 分别围绕外侧铰链建立枢轴，并同步向内旋转。
- 店外点击检测只接受 `door` 站点，透过玻璃看到的室内物件不会误触。
- 店内主视角按钮显示“回到店外”。
- `Esc` 在店外进入店内，在店内主视角回到店外。
- 在店内物件特写中按 `Esc` 会回到第一人称，并保留进入特写前的行走位置。
- 工牌、售货机、柜台、证书墙、收银机和小本子均为独立特写机位。

### 镜头与交互

- `inside` 使用受限的第一人称机位，起点在门内且始终保留在室内边界中。
- `vending`、`counter`、`wall`、`register` 的镜头位于物体正面法线上。
- `badge` 与 `notebook` 位于桌面上方，采用俯视正面机位。
- 工牌本体旋转 `Math.PI / 2`；工牌机位通过 `stationRoll` 同步旋转 `-Math.PI / 2`。
- 店外鼠标滚轮通过 `dollyCamera(scale)` 沿当前视线推拉；店内滚轮不移动镜头。
- 第一人称拖拽直接更新 `walk.yaw` 与 `walk.pitch`，没有环绕目标点，因此不会把镜头转到墙体背面。
- `WASD` 使用逐轴碰撞检测，限制内外墙范围并避开柜台、售货机、陈列柜和档案架。
- 触屏使用 Pointer Events 支持单指拖拽转头；店内双指捏合不再缩放，避免与行走视角冲突。
- 镜头距离限制在 `0.28–9` 之间；切换机位时恢复该机位的预设构图。
- 店外拖拽仍用于环视；双指缩放后会抑制本次触摸产生的误点击。

### 店员加载

`blockout.js` 创建空白 `THREE.Group`，默认先加载外景，再在后台加载无损人物：

```text
../assets/models/clerk-optimized.glb
```

加载成功后 `document.body.dataset.clerkModel = 'textured'`；开始加载时为 `'loading'`，失败时为 `'unavailable'`。开屏只等待约 `2.92 MB` 的 `store-exterior-meshopt.glb`，外景可旋转后再加载人物；`?clerk=meshopt` 可切到快速但有近景接缝风险的版本。

### 店外精细道具

- `blockout.js` 通过 `loadGlbModel()` 加载 `site/assets/models/store-exterior-meshopt.glb`；高清原版保留为回退。
- 加载成功后隐藏程序化立面、街道和基础外摆，但不修改原有室内布局或店员。
- 模型中的 `Back wall`、`Interior *`、`Inner glass darkness` 等空室内占位会隐藏，玻璃后透出原有 Three.js 室内场景。
- `Left door`、`Right door` 在加载后围绕外侧铰链建立枢轴并同步内开；仅双门可点击，橱窗不再承担交互。
- `body.dataset.exteriorModel` 为 `'textured'` 表示完整外景加载成功，`'fallback'` 表示继续使用程序化外景。
- `glb-loader.js` 按材质索引缓存材质与贴图，并支持 glTF 的 `BLEND`、`MASK`、WebP 和 Meshopt 压缩。

## 6. 本地开发

在项目根目录执行：

```bash
python3 -m http.server 8765 --directory site
```

打开：

```text
http://127.0.0.1:8765/
http://127.0.0.1:8765/_blockout/?embed=1
http://127.0.0.1:8765/_blockout/?shot=inside
```

浏览器检查重点：

- 首屏是否为店外。
- 是否没有额外入口和临时文案。
- 店外标签是否隐藏，进店后六个物件标签是否出现。
- 进店后是否进入室内第一人称，并显示约 `2.6` 秒的 `WASD / F` 操作提示。
- `WASD` 是否被柜台、售货机、陈列柜和室内边界阻挡。
- 拖拽到任何方向是否都看不到建筑外墙背面。
- 准星对准物件后按 `F` 是否进入对应特写，`Esc` 是否返回原行走位置。
- 进入店内后人物是否为新版平滑贴图模型。
- 工牌是否只在桌面。
- 工牌本体与特写镜头是否保持同一方向。
- 六个可交互物件是否都从正面观察，售货机是否完整显示五层货架。
- 鼠标滚轮是否能推近和拉远，双指缩放是否不会误触物件。
- 手机宽度下是否仍铺满视口。
- 控制台是否有模型加载错误。

## 7. Blender 工作流

重新生成当前网页模型：

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --factory-startup \
  --python blender/optimize_supplied_single.py
```

脚本会：

1. 读取 `blender/output/supplied_single_normalized.glb`。
2. 启用平滑着色，并减面到原网格的 15%。
3. 将 4096 贴图缩到 2048；颜色贴图轻度降噪，法线图模糊并降低到 0.35 强度。
4. 以 WebP 质量 95 导出。
5. 输出 `site/assets/models/clerk-optimized.glb`。
6. 输出 `blender/output/clerk_refined.blend`。
7. 重新渲染四视图。

不要继续大幅降低减面比例；15% 档位已在网页人物近景中验证。若调整比例或贴图质量，必须重新检查发丝、镜框和皮肤表面。

生成网页默认的 Meshopt 模型：

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --factory-startup \
  --python blender/optimize_web_meshopt.py
```

脚本从两份高清网页 GLB 生成 `clerk-meshopt.glb` 和 `store-exterior-meshopt.glb`。`glb-loader.js` 解码 Meshopt 后会对顶点数超过 5000 的网格重算法线，避免压缩接缝。

重新生成店外模型：

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --factory-startup \
  --python blender/build_store_exterior.py
```

该脚本输出约 `9.94 MB` 的 `site/assets/models/store-exterior.glb`、`blender/output/store_exterior.blend`，并在 `concepts/store/blender/` 生成白底四视图。盆栽来自 `blender/source/store-props.glb`；饮料机和冰淇淋柜来自用户提供的新资产，分别经 `optimize_vending_asset.py`、`optimize_freezer_asset.py` 减面到约 6 万面、贴图缩至 1024 WebP 后嵌入。招牌文字使用较低曲线细分。网页当前直接加载这份完整外景 GLB，并通过独立点击代理、双门枢轴和空室内占位隐藏逻辑衔接原店内场景。

## 8. GitHub 与部署

### 本地源码仓库

```text
/Users/muyuganbawang/Documents/ChatGPT/作品集
```

当前使用 `source` 分支进行源码维护，远端为 `origin/source`。本地启用了 sparse checkout，只展开 `site/` 和 `docs/`；按需使用 `git sparse-checkout add blender concepts design-data components source-assets tools` 展开模型和设计源文件。

### 线上部署仓库

```text
/Users/muyuganbawang/Documents/Codex/2026-10-14/https-github-com-7jinch2-dev-7jinch2/work/deploy/repo
```

远端：

```text
https://github.com/7jinch2-dev/7Jinch2.git
```

### 标准发布流程

1. 在本地仓库提交修改。
2. 同步 `site/` 到部署仓库。
3. 在部署仓库提交并推送。

同步命令：

```bash
rsync -a --delete \
  --exclude='.git/' \
  --exclude='README.txt' \
  /Users/muyuganbawang/Documents/ChatGPT/作品集/site/ \
  /Users/muyuganbawang/Documents/Codex/2026-10-14/https-github-com-7jinch2-dev-7jinch2/work/deploy/repo/
```

推送：

```bash
git -C /Users/muyuganbawang/Documents/Codex/2026-10-14/https-github-com-7jinch2-dev-7jinch2/work/deploy/repo push origin main
```

发布后等待约 15–40 秒，再检查线上。

可用下面命令核对线上脚本版本：

```bash
curl -fsSL 'https://7jinch2-dev.github.io/7Jinch2/_blockout/?deploy=check' \
  | rg 'first-person|3D 灰模 v0.8'
```

最近一次发布已验证：

- 远端 `main` 为部署提交 `e4f2c8e`。
- 线上页面已引用 `blockout.js?v=20261026-loader-8`。
- 线上手机海报约 `80 KB`，默认外景模型约 `2.92 MB`，无损人物原版约 `10.3 MB`。
- 已实测：开屏显示真实下载进度，外景就绪后自动进入自由旋转，高清人物随后补入；控制台无错误。

## 9. 已知风险

1. **模型体积**：默认外景约 `2.92 MB`，人物原版约 `10.3 MB` 并在外景就绪后后台加载；首屏海报约 `80–202 KB`。
2. **WebP 兼容性**：两个 GLB 使用 `EXT_texture_webp`；当前加载器与页面已在 Chrome 中验证。若未来改用其他 GLTF 加载器，必须确认该扩展可用。
3. **模型无骨骼和动画**：店员是静态模型，没有站立、呼吸或动作。
4. **室内仍是灰模体块**：除店员外，货架商品、收银机和证书墙主要由基础几何构成，真实作品内容尚未接入。
5. **首页为大文件**：`site/index.html` 很长且包含大量内联样式，编辑时先搜索 `storeEntry` 等锚点，不要整页重排。
6. **不要让首页文案自行发挥**：新增文案、入口和项目内容需由用户明确提供。
7. **不要删除 `.nojekyll`**：否则 `_blockout/` 会在 GitHub Pages 中返回 404。
8. **触屏交互依赖 Pointer Events**：双指缩放已按 Pointer Events 实现；若未来替换渲染容器，不要移除 `touch-action: none` 和双触点抑制误点击逻辑。

## 10. 建议下一步

优先顺序：

1. 把真实作品数据接入售货机、证书墙、工牌和柜台物件的内容层。
2. 优化现实手机设备上的双指缩放手感，并补充自动化交互测试。
3. 如需继续缩小 GLB，可评估 Draco 或 Meshopt，但必须同步接入解码器并重新验证近景表面。
4. 如需替换室内模型，继续使用当前约 `5.0m × 3.8m` 的净尺寸，避免重新出现外墙穿模。

## 11. 新对话启动提示

可直接发送：

> 先阅读 `/Users/muyuganbawang/Documents/ChatGPT/作品集/docs/HANDOFF.md`，并检查本地与部署仓库状态。不要恢复已删除的旧店员模型，不要自行添加首页文案，也不要为 Blender 外景另做店内布局；室内只使用现有带店员的 Three.js 场景。当前线上地址是 https://7jinch2-dev.github.io/7Jinch2/ 。在此基础上继续。
