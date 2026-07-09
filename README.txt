============================================
  PORTFOLIO 作品集网站 —— 使用说明
============================================

📁 文件结构
-----------
portfolio-website/
  ├── index.html    ← 主网站文件（双击即可在浏览器打开）
  └── README.txt    ← 本说明文件


🚀 快速开始
-----------
1. 双击 index.html，用浏览器打开即可预览网站
2. 用任意文本编辑器（记事本/VS Code/Sublime Text）打开 index.html
3. 搜索「替换点」快速定位所有可修改内容


✏️ 如何替换文字
-----------------
在 index.html 中搜索「替换点：文字」，共有以下几类：

1. 导航栏：
   - 品牌名：搜索「PORTFOLIO」，直接修改文字
   - 菜单项：搜索「About」「Resume」「Works」「Contact」

2. Hero Section（个人简介区）：
   - 姓名：搜索「Bao Long」
   - 副标题：搜索「Landscape / Visual / Brand Portfolio」
   - 简介描述：搜索「专注于景观设计」
   - 按钮文字：搜索「上传作品图片」「重置示例」等
   - 统计数据：搜索「9」「3」「IMAGES」「PROJECTS」
   - Featured 卡片：搜索「Interior Planting Service System」

3. 作品集区：
   - 标题：搜索「作品集」
   - 布局切换按钮：搜索「网格」「杂志风」「瀑布流」
   - 分类标签：搜索「Presentation」「Plant Display」等
   - 每张卡片的标题、分类、标签

4. Footer：
   - 搜索「© 2026」修改版权信息
   - 搜索「hello@baolong.com」修改邮箱

👉 也可以直接修改 JavaScript 开头的 CONFIG 对象（约第 480 行），
   所有文字集中在该对象中，修改更方便。


🖼️ 如何替换图片
-----------------
在 index.html 中搜索「替换点：图片」，找到对应位置：

方式一：替换 CSS 背景（推荐用于 Hero 大图和作品封面）
  找到类似这样的代码：
    background: linear-gradient(135deg, #C5D3C2 ...);
  改为：
    background: url('你的图片.jpg') center/cover no-repeat;

方式二：替换为 <img> 标签
  将 .hero-image 或 .work-card-image 的 div 替换为：
    <img src="你的图片.jpg" alt="描述" style="width:100%;height:100%;object-fit:cover;">

Hero 右侧大图位置：
  → 搜索「.hero-image」CSS 类（约第 220 行）

作品卡片图片：
  → 搜索「.work-card-image.img-1」到「.img-6」
  → 每张卡片有独立 CSS 类，可分别替换


🎨 如何修改配色
-----------------
搜索「CSS 变量」（约第 35 行），修改 :root 中的变量：

  --bg:              #F8F7F5;    ← 整体背景色
  --text-primary:    #1A1A1A;    ← 标题文字色
  --text-secondary:  #6B6B6B;    ← 副标题文字色
  --text-tertiary:   #9A9A9A;    ← 次要文字色
  --btn-solid:       #2C2C2C;    ← 实心按钮色
  --btn-outline:     #E0E0E0;    ← 描边按钮色
  --card-bg:         #FFFFFF;    ← 卡片背景色

修改后刷新浏览器即可看到效果。


📱 响应式说明
-----------------
网站在不同屏幕尺寸下自动适配：
  - 桌面端（>1024px）：左右分栏 + 三列作品网格
  - 平板端（768-1024px）：上下堆叠 + 两列作品网格
  - 手机端（<768px）：单列堆叠 + 汉堡菜单


🔧 高级自定义
-----------------
- 添加新作品卡片：在 <div class="works-grid"> 中复制一个 <article> 块
- 修改字体：搜索 font-family 替换字体栈
- 添加动画：在 CSS 末尾添加自定义 keyframes


📧 联系方式
-----------
如有问题，请查看 index.html 中的注释（以 <!-- 开头），
每个区域都有详细标注。
（内容由AI生成，仅供参考）
