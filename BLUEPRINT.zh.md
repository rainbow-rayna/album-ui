# AI Scrapbook 的施工图

> 这份文件是「给模型看的施工图源稿」。把整份内容贴给 Codex / Gemini / Claude，
> 让它按照最后一节《绘制规范》渲染成一张分层架构图。
> 文案照抄即可，不要改写卡片里的英文标识符 —— 它们是真实的文件名和路由。

**副标题（画在主标题下面，小字灰色）**：`（截图给 Claude Code 看）`

**顶部胶囊（居中，暖金色描边）**：
`3D 剪贴簿相册 · AI Scrapbook · 聊出一段记忆 → 写成日记配一句箴言 → 渲染成一页 → 装订进一本能翻的书`

---

## 第一层 · 外部上下文

> 左侧竖排层标签：`第一层` / `外部上下文`
> 布局：2 × 2 四张卡片

### 卡片 1
- eyebrow：`USER/`
- 标题：**用户素材**
- 描述：让这本相册只属于你的那几样东西 · 全程不出这台机器
- chips：`photos[]` `chat[]` `text` `caption`

### 卡片 2
- eyebrow：`BRAIN`
- 标题：**Claude · Anthropic**
- 描述：一个模型干三件事 · 陪聊 → 写日记挑箴言 → 编译出图 prompt
- chips：`/v1/messages` `haiku-4.5` `vision`

### 卡片 3
- eyebrow：`IMAGE`
- 标题：**Gemini · OpenAI**
- 描述：两种页面长相 · 拼贴海报 vs 极简 zine · 服务端随机轮换
- chips：`flash-image` `gpt-image-1` `3:4` `1024x1536`

### 卡片 4
- eyebrow：`SECRETS · I/O`
- 标题：**.env · localStorage · canvas**
- 描述：密钥只活在 server 进程 · 前端只知道「配没配」 · 零二进制素材
- chips：`.env` `scrapbook_entries_v2` `canvas 2D`

---

## 第二层 · 本地大脑

> 左侧竖排层标签：`第二层` / `本地大脑`
> 布局：2 行 × 3 列，共六张卡片

| # | eyebrow | 标题 | 描述 | chips |
|---|---|---|---|---|
| 1 | `ROUTES/AI.TS` | **意图分流** | 四条路由 · 供应商随机轮换 · 一家挂了换另一家 · 全挂就让前端自己画 | `/status` `/chat` `/summary` `/image` |
| 2 | `PROMPTS.TS` | **提示词库** | 三套 system prompt + 情绪关键词表 + 手写兜底句库 | `CHAT` `SUMMARY` `ZINE_SKILL` `fallback` |
| 3 | `SERVICES/*` | **供应商适配器** | 每一层都有退路：Claude 退到脚本 · 两家出图互为退路 | `anthropic.ts` `gemini.ts` `openai.ts` |
| 4 | `LAYOUT.TS` | **版式生成器** | 不调 AI 也能出一页 · 情绪族决定照片怎么摆 | `scatter` `grid` `filmstrip` `circles` |
| 5 | `USEJOURNALSTORE` | **状态 · 记忆** | entries 按日期排 · 写 localStorage · 一张纸打包正反两面 | `entries[]` `persist` `getLeafFaces` |
| 6 | `PAGETEXTURE.TS` | **页面烘焙** | entry → canvas 2D → 贴图 · 图面一张 文字面一张 | `canvas 760px` `CanvasTexture` `cache key` |

---

## 第三层 · 运行时聚合

> 左侧竖排层标签：`第三层` / `运行时聚合`
> 布局：一整块通栏面板，内含「六片」网格 + 两条横条

**面板抬头**：`JOURNAL ENTRY` **组装盒子 · 每次点 "Generate page" 按这 6 片粘成一条 entry**

六片（3 列 × 2 行，每片带彩色序号）：

| 序号 | 名称 | 副标（等宽小字） |
|---|---|---|
| ① | 对话全文 | `chat[] · user + assistant` |
| ② | 用户照片 | `photos[] · data:image/*;base64` |
| ③ | Claude 写的日记 | `text · SUMMARY_SYSTEM_PROMPT` |
| ④ | 箴言 + 出处 | `caption · captionAuthor` |
| ⑤ | 情绪族 | `mood · MOOD: 标签 / 关键词打分` |
| ⑥ | 版式种子 | `layoutSpec · generateLayout()` |

**横条 A —— `MODEL · 前向过程`**（面板底部，深一档的条）
```
compose(①…⑥) → 出图 prompt
→ Gemini 直接拼贴 · OpenAI 先让 Claude 编译 zine prompt 再出图
→ data:image/png;base64 → entry.aiImage → localStorage → 烘成一正一反两张贴图
```

**横条 B —— `FALLBACK · 三级降级`**（紧贴横条 A 下方，用琥珀色左边框强调）
```
AI 渲染页  →  本地 canvas 兜底页  →  脚本问句 + 手写箴言库
每一级都保证出得来一页 · 没有任何一条路径会让用户空手而归
```

---

## 第四层 · 交互表层

> 左侧竖排层标签：`第四层` / `交互表层`
> 布局：2 × 2 四张卡片

### 卡片 1
- eyebrow：`BOOK · 3D` · `LOCALHOST:5180`
- 标题：**能翻的那本书**
- 描述：R3F Canvas · 骨骼蒙皮的纸 · 一盏暖灯配暗角 · 拖动转的是相机不是书
- chips：`three.js` `bone-chain` `bloom` `vignette`

### 卡片 2
- eyebrow：`PAGEPOOL`
- 标题：**14 个 mesh 演一整本**
- 描述：已读 / 未读两摞 · 全程只有一张纸悬在中间 · 出界就回收换内容
- chips：`POOL_SIZE 14` `readProgress` `recycleStep`

### 卡片 3
- eyebrow：`COMPOSER`
- 标题：**两步弹层**
- 描述：传照片 → 聊天 → 生成日记 → 预览 → Save to book 直接翻到新页
- chips：`step 1 entry` `step 2 preview` `shuffle`

### 卡片 4
- eyebrow：`HTTP CONTRACT`
- 标题：**浏览器 ↔ server 的 5 条线**
- 描述（等宽排成两列）：
```
GET  /api/health          POST /api/ai/chat
GET  /api/ai/status       POST /api/ai/summary
                          POST /api/ai/image
```
- chips：`vite proxy :5180 → :5185` `同源无 CORS`

---

## 回环（虚线箭头）

从 **第四层** 右缘的 `Save to book`，画一条**琥珀色虚线**沿右侧向上，
接回 **第一层** 的 `SECRETS · I/O` 卡片。

线上标注（小字）：`entry → localStorage → 下次开书时 loadEntries() 重建整本`

含义：这本书没有服务端数据库，整本的厚度就是历史在浏览器里的累积。

---

## 绘制规范

**画布**：竖版，宽约 1100px，四层从上到下，层与层之间居中一个 `↓` 箭头。

**配色**（深色蓝图风，和 app 自己的夜色场景一致）：

| 用途 | 色值 |
|---|---|
| 页面背景 | `#08090b` |
| 卡片底 | `#11151b` |
| 卡片描边 | `#1e2731` |
| 标题文字 | `#e8eef4` |
| 描述文字 | `#8b98a5` |
| chip 底 / 字 | `#171d25` / `#7fa8c0` |
| eyebrow 青（第一、四层） | `#5eb0c8` |
| eyebrow 橙（第二层 2 / 6） | `#c98a4a` |
| eyebrow 紫（第二层 3 / 5） | `#9b7fc4` |
| 顶部胶囊描边 / 文字 | `#6b5a3a` / `#d9c08a` |
| 虚线回环 | `#8a6a3f` |

**字体**：标题与描述用无衬线（Inter / 思源黑体皆可）；
所有 eyebrow、chip、代码行一律等宽（JetBrains Mono / SF Mono），
eyebrow 全大写 + 约 0.08em 字距。

**卡片**：圆角 10px，内边距 18px，1px 描边，无阴影。
eyebrow → 标题 → 描述 → chips 自上而下，行距宽松。

**层标签**：画在整幅图左侧留白里，两行 —— 第一行 `第N层` 白色，第二行层名灰色小字。

**第三层面板**：通栏，比普通卡片深一档的底色，视觉上明显重于其它三层 —— 它是整张图的重心。

**必须保留的信息层级**：卡片里的英文标识符是真实文件名和路由，一个字都不要改；
中文描述可以断行但不要改写措辞。
