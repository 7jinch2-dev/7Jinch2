# Blender 模型

当前 Blender 工程包含网页店员模型和「灵感便利店」外景模型。店员由 `source/supplied_single_clerk.glb` 提取，并经过网页专用归一化、平滑着色和贴图优化；旧程序化角色与左半身中间版本已删除。

## 当前文件

- `prepare_supplied_single_clerk.py`：从原始 GLB 提取单个角色、归一化高度并渲染四视图；
- `optimize_supplied_single.py`：生成减面、2048 WebP 贴图的网页交付模型和可编辑 Blender 工程；
- `optimize_vending_asset.py`：把用户提供的饮料机 GLB 减面并转为 WebP 贴图；
- `optimize_freezer_asset.py`：把用户提供的冰淇淋柜 GLB 减面并转为 WebP 贴图；
- `inspect_supplied_glb.py`：检查 GLB 网格、尺寸、材质与贴图；
- `tutorial-notes.md`：Q 版头部建模的方法与快捷键整理；
- `output/clerk_refined.blend`：当前网页模型的 Blender 工程；
- `output/clerk_refined_front.png`、`clerk_refined_side.png`、`clerk_refined_back.png`、`clerk_refined_threequarter.png`：当前四视图。
- `build_store_exterior.py`：程序化生成白底店外模型、四视图和外景 GLB；
- `extract_glb_props.py`：从整体参考 GLB 中裁出售货机、冰柜和盆栽候选；
- `render_glb_preview.py`：为外部 GLB 生成快速检查视图；
- `analyze_glb_parts.py`：检查整体 GLB 的连通网格和部件边界；
- `source/store-props.glb`：从用户提供的整体参考资产中导出的三件道具素材；
- `source/vending-optimized.glb`：用于嵌入外景的轻量饮料机源文件；
- `source/freezer-optimized.glb`：用于嵌入外景的轻量冰淇淋柜源文件；
- `../site/assets/models/store-exterior.glb`：网页店外加载的完整外景模型；
- `output/store_exterior.blend`：可编辑店外模型工程；
- `../site/assets/models/store-exterior.glb`：店外 GLB 交付文件；
- `../concepts/store/blender/`：店外模型正视图、右视图、背视图和四分之三视图。

网页加载 `site/assets/models/clerk-optimized.glb`。旧角色不再作为加载占位；模型加载失败时宁可不显示人物，也不会回退到旧版本。

店外 GLB 已接入网页首屏。程序化立面仅作为模型加载失败时的后备；正常状态使用双开玻璃门、右移门组和独立的深绿街灯材质。

外景工程只负责建筑外壳、店面、街景和门前道具，不再另做店内布局。最终组合时复用 `site/_blockout/blockout.js` 中已经完成的、带店员的室内互动场景。

## 重新生成网页模型

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --factory-startup \
  --python blender/optimize_supplied_single.py
```

优化脚本从 `blender/output/supplied_single_normalized.glb` 读取模型。该文件是用于减面的中间产物，不随仓库保留；首次重建时先运行 `prepare_supplied_single_clerk.py`，它会从 `source/supplied_single_clerk.glb` 重新生成归一化 GLB 和高精度编辑工程。

随后启用平滑着色并减面到原网格的 15%，将贴图缩至 2048；颜色贴图做轻度降噪，法线图做模糊并收敛到强度 0.35，再以 WebP 导出。最终输出约 10.3 MB 的 `site/assets/models/clerk-optimized.glb` 和 `blender/output/clerk_refined.blend`，同时生成四视图。网页 GLB 加载器已支持 Blender 导出的 `EXT_texture_webp`。

更新饮料机时，可选 `VENDING_SOURCE` 指定输入：

```bash
VENDING_SOURCE=/path/to/vending.glb \
  /Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --factory-startup \
  --python blender/optimize_vending_asset.py
```

脚本会生成 `blender/source/vending-optimized.glb`。当前源文件约 2.8 MB、6 万面和 1024 WebP 贴图；可用 `DECIMATE_RATIO`、`TEXTURE_SIZE` 覆盖默认参数。

更新冰淇淋柜时使用：

```bash
FREEZER_SOURCE=/path/to/freezer.glb \
  /Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --factory-startup \
  --python blender/optimize_freezer_asset.py
```

脚本会生成 `blender/source/freezer-optimized.glb`。当前源文件约 2.7 MB、6 万面和 1024 WebP 贴图；可用 `DECIMATE_RATIO`、`TEXTURE_SIZE` 覆盖默认参数。

重新生成店外模型、白底四视图和 GLB：

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --factory-startup \
  --python blender/build_store_exterior.py
```

店外模型采用暖奶油色外墙、朱砂红招牌与红棚、深绿金属框架；预览使用中性白底，结构与网页内可交互店面彼此独立。盆栽继续使用提取后的参考资产；饮料机和冰淇淋柜使用用户提供的新资产，均经约 4% 减面和 1024 WebP 贴图压缩后嵌入。招牌文字降低曲线细分，全部贴图以 WebP 导出。

## 模型约定

- 原点位于双脚底部；
- 站立高度约 `2.0m`；
- 人物正面朝 Blender 的 `-Y`，导出 glTF 后正面朝 Three.js 的 `+Z`；
- 不包含骨骼与动画，目前为静态角色；
- 工牌不再作为人物模型的一部分，已拆为网页中的独立桌面物件。
