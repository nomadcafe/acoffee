# acoffee — Vision & MVP 方向

> 状态：草稿 v0.7 / 2026-05-18
> 用途：对齐产品定位、MVP 范围、启动顺序。技术细节在别处。
>
> v0.2 更新：锁定 Phase 1 = Web / PWA，Native App 延至 Phase 2。
> v0.3 更新：Q1（起点城市 = 清迈）/ Q2（Phase 0 串行先行）/ Q5（栈 = Next 16 + Supabase + MapLibre + OpenFreeMap）已定；Phase 0 落地页 v0 已上线，加入"全球 pin 地图"作为流量钩子。
> v0.4 更新：品牌名定为 **acoffee**（域名 acoffee.com），外层声音软化为"New city? Start with a coffee."；**内核 wedge 不变**——仍然押在"刚落地、一个人、孤独"。Meet Halfway 明确归入 Phase 3，不进 MVP。
> v0.5 更新：**品牌视觉方向 pivot** — 软咖啡馆调子撑不起视觉冲击，前台**改走"现代 / 自信 / 技术感"**。Hero 用旋转 3D 地球 + 编辑刊物大字（"You just landed. The first move is coffee."），不再是 cozy 调子。**内核 wedge 仍然不变** — 落地破冰仍是增长引擎，但视觉外壳更强势。同步承认：**Phase 1 产品代码已经显著超出 §4 MVP 三动作范围**（roster / 用户提交 café / Near me / live countdown 等都已上线），但仍处于 0 真实用户、0 内容、0 社群的「pre-ship」状态。下一步必须从写代码切回 Phase 0 的内容 + deploy。
> v0.6 更新：§10 的「明确不做」红线删除——实际执行 24h 内自破，留着只是自我欺骗。改成"按 ROI 排序的参考清单，非强制"。同步在 §10 加一条：pin-drop funnel 接入完成（落 pin 后按城市分流：清迈→cafe 目录；其他覆盖城市→城市订阅；不覆盖→泛订阅），修复了 95% 非清迈访客落地后无处可去的漏洞。
> v0.7 更新：**产品主轴从「匿名 pin map」切换为「Coffee Card」**。每个用户有一个 `acoffee.com/{handle}` 页面（city / 一句话 status / coffee chat 类型 / 联系方式 / "Invite me for a coffee" 按钮）。Card 是访客离开页面时**唯一可携带的产出物**——解决 v0.5 暴露的"drop pin 是匿名一次性动作、95% 访客离开后无可返回状态"的根本问题。pin map / café roster / signal 全部降级为 Card 的字段或附属功能。**视觉方向保持 v0.5 Editorial 不变**（2026-05-18 确认）；UI 重做目标是补"5 秒看懂 acoffee 是什么"的信息层，不是切风格。**内核 wedge 不动**（落地 / 孤独 / 数字游民）。承诺机制：Card MVP ship（2026-06-01 之前）截止前不开第 7 方向、不再动 hero 文案、不读同类产品 teardown。详见下方「§0 v0.7 重置」。

---

## §0. v0.7 重置（2026-05-18，凌驾于 §3–§5 旧条款之上）

> 本节是开始动 `src/` 之前必须写齐的硬条件。下面五条任何一条没确认，就不能写代码——这是对过去 4 周连续 vision 跳变的承诺机制。

### 0.1 一句话定位

> **acoffee — your coffee card for nomads. Make your card. Get found in your city.**

不是地图工具，不是社交 app，不是社群。是**一张可以分享、可以被搜到、可以被邀请的纸质名片的数字版**——专门为"刚到一个新城市、想认识当地 nomad"的人设计。

### 0.2 访客核心动作（落地 3 分钟内完成）

```
Home → 看见 sample card 实物展示
     → 点 "Make your card →"
     → Sign in（Supabase Auth，magic link / Google）
     → Claim handle（acoffee.com/{handle}，唯一）
     → 填 4 个字段：
        · City（select / autocomplete）
        · 一句话 status（"Building acoffee · open to coffee chats this week"）
        · Coffee chat 类型（chips：☕ casual · 💻 cowork · 🍜 dinner · 🥾 hike · 💼 work talk）
        · 一种联系方式（Telegram / WhatsApp / Email，选一）
     → 拿到 acoffee.com/{handle}，可复制 / 分享
```

完整动作 ≤ 3 分钟，目标是访客**离开页面时带走一个 URL**。

### 0.3 MVP 范围红线（这一版**不做**）

- ❌ **匹配 / 推荐算法**——Card 是被发现的，不是被推送的
- ❌ **日历 / 时间槽集成**（Calendly 类）——可用时间用 free-form text（"Tue–Thu afternoons"）
- ❌ **付费 / 会员 / verified 徽章**
- ❌ **站内 chat**——联系全部 handoff 到 Telegram / WhatsApp / Email
- ❌ **城市 directory 列表页**——前 100 张 card 之内只能靠分享发现，不做 listing（避免空目录尴尬）
- ❌ **匿名 pin map 作为独立 CTA**——pin 下沉为 Card 上 city 字段对应的地图可视化，不是首屏动作
- ❌ **§4 老三动作（城市在线人数 / Café check-in / Signal）**——全部归入 Card 字段或 Phase 2
- ❌ **多语言**——v0.7 全英文，中文文案归 Phase 2

### 0.4 Ship deadline

**2026-06-01**（约两周）。

Ship 定义 = 同时满足：
1. Card 创建流程完整可用（auth + handle + 4 字段表单）
2. `acoffee.com/{handle}` 公开页 SSR + OG image 渲染
3. 至少 5 张真实 card 上线（含 onehare@gmail.com 自己的）
4. 首页 hero 重写完成（含 sample card 实物展示）
5. 部署到 acoffee.com 主域，浏览器实测可用

不达成不允许开第 7 方向。

### 0.5 视觉方向（已锁定，2026-05-18）

保持 **v0.5 Editorial**——Stripe / Linear / 编辑刊物气质。否决：bio.link / lit.link 卡片堆叠（cozy / 个人感，和 v0.5 反方向）、Read.cv 风格（备选但本次不选）。

新首页相对当前版本的实际变化：

| 当前 | v0.7 重做 |
|---|---|
| H1 "You just landed. The first move is coffee." | **保留** |
| Sub: "soft map for digital nomads..." | 改为 Card 定位："Your coffee card for nomads. Get found in your city." |
| 主 CTA: "Drop a pin →" | 改为 "Make your card →" |
| Chip: "Chiang Mai is live · café directory open ↗" | **保留**（活跃度证据） |
| ─ | **新增 sample card 实物展示**（hero 右侧或下方，编辑刊物嵌入风格，让访客 5 秒看懂） |
| "How it works" 三步（pin / 看 café / 发 signal） | 改为 Card 三步：claim handle → fill card → share URL |
| 全球 pin map | 保留为下方 section，标题改为 "Where nomads are right now"（已经是了）——pin 改为 card pin（每个 pin 链到 card） |
| CitiesPanel | 保留，逻辑不变 |

### 0.6 与前版条款的关系

- §1–§2 wedge 完整保留（落地 / 孤独 / 数字游民）
- §3 Land & Connect / Co-working Buddy → 都被 Card 上的 status + chat type 字段表达
- §4 老三动作 → Phase 2，不进 v0.7 MVP
- §5–§9 暂保留作为 Phase 2+ 参考
- §10 红线清单 → 被 §0.3 替代

---

## 1. 一句话 & 反定位

**acoffee 是数字游民的线下破冰工具——解决刚落地一个陌生城市时"没人一起吃饭、没人一起 co-work"的孤独感。**

> **品牌外壳 vs 内核 wedge（v0.5 决策，替代 v0.4）**
>
> - **外壳（acoffee voice）**：**现代、自信、技术感**。首页 hero = 旋转 3D 地球 + 编辑刊物大字「You just landed. The first move is coffee.」。视觉锚点是球体、Fraunces 衬线巨字、章节编号（Issue 01 / Step 01-03），整体气质参考 Stripe / Linear 而非 cozy 咖啡馆。**陌生访客 5 秒内能感知到"这是个认真的产品"，不是 lifestyle blog。**
> - **内核 wedge（增长引擎）**：仍然是"刚落地 72 小时 + 一个人 + 孤独"。所有 SEO 内容、社群叙事、转化漏斗都押这个痛点——它才是会被搜索、被转发的东西。
> - **为什么外壳变硬**：v0.4 的"温暖软调"实测后视觉张力不足，陌生访客 first-paint 无法 5 秒识别产品价值。v0.5 把外壳调强让 hero 撑住，但**内核情绪 wedge 不动**——SEO 内容仍然写"一个人 nomad 的破局方式"这类情绪内容，**只有视觉层切硬**。
> - **保留软元素**：Fraunces 衬线、cream/espresso 调色、虚线票根分隔仍在——避免完全 SaaS dashboard 化失去辨识度。**球体 + 编辑大字** 是新强 element；café 详情页、roster 等内层 UI 保持原节奏。

**不是什么（反定位）：**

- 不是又一个社交 / 交友 App（差异点不够）
- 不是旅游攻略 / 城市指南 App（Nomad List 已覆盖）
- 不是兴趣社群 App（Meetup / Bumble BFF 已覆盖）

做得好的差异点是：**场景极其具体（落地头 72 小时 + 白天 co-work）+ 情绪极其强烈（孤独）+ 高频（每次换城市都重来）**。

---

## 2. 核心用户 & 最痛场景

**核心用户**：正在 Nomad 的远程工作者，尤其是独自 Nomad 的人（情侣/家庭 Nomad 孤独感弱，非主要用户）。

**三个最痛的时刻**（MVP 要全部命中）：

1. **刚落地**：行李还没放下，不知道今晚一个人去哪吃饭
2. **白天工作**：想找个咖啡馆或 co-working，但一个人去太安静、气氛不对
3. **周末/晚上**：想约人徒步、喝酒、看展，但微信上都是国内朋友

**明确不服务的场景**（至少 MVP 不碰）：

- 约会 / 恋爱
- 旅游结伴（短期游客）
- 纯线上社群聊天

---

## 3. 定位：Land & Connect + Co-working Buddy

两条 wedge 组合：

- **Land & Connect（主 wedge）**：主打"落地即破冰"，情绪最锋利，最适合内容传播和拉新
- **Co-working Buddy（留存 wedge）**：主打"白天找人一起泡咖啡馆"，是日常高频动作，负责留存

"Nomad 同类雷达"（兴趣/行业同频）作为自然副产物体现在匹配里，不单独作为主打。

---

## 4. MVP 核心动作（只做三个）

### ① 城市在线人数
打开产品第一屏显示：**"里斯本现在有 234 个 Nomad 在线"**。
- 作用：数字本身治愈孤独感，是最便宜的"我不是一个人"信号
- 技术上不难，但情绪杠杆极大

### ② Check-in 到具体咖啡馆 / Co-working Space
不是"地图上一个半径 1km 的圆"，而是：
- 用户 check-in 到 **具体场所**（Starbucks Chiado, Second Home, etc.）
- 其他人看到："今天这家咖啡馆有 3 个 Nomad"
- 比"附近有人"精确 10 倍，匹配 Nomad 真实行为

### ③ 快速意向卡片
一键发出意向，绕开"聊天破冰"的尴尬：
- ☕ 一起喝咖啡
- 💻 一起 co-work
- 🍜 今晚一起吃饭
- 🥾 周末一起徒步

对方一键接受/拒绝，时间地点走一个极简流程定下来。

### 明确砍掉 / 延后的功能

来自早期 brief 但 MVP 不做：

- Google + LinkedIn + 邮箱三种登录 → **只做邮箱 + 一个 OAuth**
- 技能 / 兴趣 / 语言多维搜索 → **延后**，MVP 用 check-in + 意向卡片就够
- 应用内聊天 → **延后**，意向匹配后直接导到对方的 Telegram/WhatsApp，不做 IM
- 推送通知的复杂策略 → **只保留"有人接受你的意向"一种**
- 过往聚会记录 / CRM 式追踪 → **延后**

砍这些的原则：**任何不直接服务"落地头 72 小时破冰"或"今天白天找搭子"的功能，都延后。**

---

## 5. 内容策略（先于产品）

内容是冷启动的前置动作，也是长期流量底盘。三条线：

- **"一个人 Nomad 的 N 种破局方式"** — 直接戳孤独感，SEO/社交传播抓手
- **真实 Nomad 故事访谈** — 每期一个城市 + 一个人，既是内容也是种子用户池
- **Nomad 视角的城市指南** — 不是旅游攻略，而是"清迈哪家咖啡馆 Wi-Fi 最好、最容易搭讪其他 Nomad"

**闭环**：内容吸引人 → 关注某个城市 Nomad 群体 → 引导进入该城市产品页 → 线下见面 → 见面故事回流成内容。

**内容与产品同站**：内容和 Phase 1 产品共用一个域名 / 一套代码（Web），最大化流量到使用的转化。

---

## 6. 分阶段路线图

### Phase 0 — 内容 + 社群（进行中）
- **起点城市：清迈**（Q1 已定）
- **落地页 v0 已上线**：全球"where are nomads right now?"地图（pin 由用户自助投放）+ 清迈邮箱订阅
  - 全球 pin 是流量钩子；清迈是唯一目标城市
  - 同时充当起点城市验证工具（看哪个城市自然冒头最多）
- 启动内容发布节奏（形式和频率待定）
- 围绕清迈做内容 + 建 Telegram/Discord 群
- 目标：形成"这个城市的 Nomad 都认这个号"的认知密度

### Phase 1 — 极简 Web 产品 / PWA（Phase 0 验证有需求后）
- **平台：Web / PWA，不做 Native App**
- 只做第 4 节的三个核心动作
- 范围限定起点城市，不撒网
- 与内容站同域名、同代码库
- 目标：在 1 个城市形成每日活跃的 check-in 行为

**为什么是 Web 而不是 App（决策锁定）：**

- 内容必须是 Web（SEO / 分享），产品同站可最大化流量闭环
- Nomad 刚落地陌生城市，不会为没听过的工具装 App，链接点开即用是唯一可行路径
- 三个核心动作 Web 都能做；Web Push 在 Android 和 iOS 16.4+ 支持，够用
- **Tradeoff**：Native 的后台推送 / 地图手感 / 相机体验更好，但这是留存问题，是 Phase 2 的事

### Phase 2 — 第二个城市 / 留存深化 / Native App 评估
- 复制到第二个城市
- 根据 Phase 1 的使用数据决定加什么（不提前规划）
- **Native App 触发条件**：单城市 Web 日活稳定 + 用户自发问"有 App 吗"。之前做 App 是提前优化。

**Q2 已定：串行。Phase 0 先跑，Phase 1 在 Phase 0 验证有需求后启动。**

---

## 7. 验证指标

每个阶段有 **明确的"下一步条件"**，防止拍脑袋推进。

### Phase 0 成功 =
- 内容矩阵在目标城市 Nomad 圈里被识别（指标：社群人数 / 内容互动率，具体阈值待定）
- 有一批明确说"产品上线了告诉我"的种子用户

### Phase 1 成功 =
- 目标城市日活占该城市在线 Nomad 估计数的 X%（阈值待定）
- 至少促成 N 次真实线下见面（用户反馈或埋点确认）
- 自然口碑在社群里出现（不是运营推的）

### 失败信号（及时止损）
- 内容做了 3 个月仍没形成任何认知密度 → 定位或城市选错
- 产品上线后 check-in 动作零自发增长 → 功能设计错了

---

## 8. 开放问题

### 仍未定
| # | 问题 | 备选 | 影响 |
|---|------|------|------|
| Q3 | 商业模式 | 订阅 / 城市赞助 / co-working 分成 / 先不管 | 倒逼判断哪些功能该做 |
| Q4 | 女性用户验证机制 | LinkedIn 绑定 / 头像真人验证 / 其他 | 影响注册流程设计 |

### 已定（2026-04-26）
- **Q1 起点城市 = 清迈**。中文 Nomad 密度大、信息差大，里斯本被 Nomad List 等英文站覆盖太死。
- **Q2 Phase 0 / Phase 1 = 串行**。先跑落地页和内容，Phase 1 等需求验证后再启动。
- **Q5 技术栈 = Next.js 16 (App Router) + TypeScript + Tailwind v4 + MapLibre + react-map-gl + OpenFreeMap tiles + Supabase**。内容/产品同站、SEO 静态生成够、地图免费、Supabase 一揽子。

---

## 9. 原则（影响所有后续决策）

- **功能砍到最小**：不直接服务两个 wedge 的功能一律延后
- **技术选轻的**：单一状态源、少依赖、能快速发版
- **内容和产品必须闭环**：任一侧不能独立做，否则失去护城河
- **城市为单位运营**：不搞"全球 Nomad 平台"空架子，一次聚焦一个城市

---

## 10. 当前实际状态 vs 计划（v0.5 新增）

**实际偏离原计划的地方**——下任何决策前先看清楚：

### 偏离 1：Phase 1 产品代码已大幅超出 §4 MVP 三动作

§4 写"只做三个核心动作"（城市在线数 / Café check-in / 意向卡片）。实际代码已经包含：

| §4 锚定 | 实际实现 |
|---|---|
| ① 城市在线数 | ✅ + 4 城多城面板 + active café 实时数 + activity feed |
| ② Café check-in | ✅ + roster 同房间对称 reveal + optional note + 用户提交新 café + 自动晋升阈值 + 30m snap |
| ③ 意向卡片 | ✅ 4 类（含 hike）+ 时间感知 TTL + roster 内一键 respond + accept/decline + match TG/WA 联系方式 reveal |
| 额外 | Near me 定位、城市 focus 跳转、3D 旋转地球、live countdown、live time-since、café 详情周边层 |

**含义**：当前代码远超 vision §4 的"MVP 砍到最小"红线。这不是错，但**砍不到最小，就要面对 Phase 0 (内容 / 社群) 同步推进的压力更大**——做了的功能没人用，等于 0。

### 偏离 2：Phase 0 / Phase 1 串行被打破

§6 + Q2 (已定 2026-04-26) 决策是「Phase 0 先跑、Phase 1 等需求验证后启动」。实际：
- Phase 1 代码已上线 95%
- Phase 0 内容矩阵：**0 篇文章**
- Phase 0 社群：**0 个清迈 Telegram / Discord 群**
- 真实用户：**0**
- 生产部署：**未 deploy**

**含义**：产品建得超前但没人能看到 / 用上。再写代码 ROI 已经为 0 — 必须切回 Phase 0。

### 下一步（参考排序，按 ROI；非强制）

1. **Deploy 收尾**：Vercel env 回填 `NEXT_PUBLIC_SITE_URL`、把域名加进 Supabase Auth Redirect URLs、跑两份 SQL。剩约 10 分钟。
2. **写第一篇 SEO 内容**：「**一个人 nomad 在清迈的破局指南 / The lonely nomad's first 72h in Chiang Mai**」— §5 三条线之一。Wedge 锚定 + acoffee.com 链接。1-2 天。
3. **加入清迈 nomad TG/Discord 群 + r/digitalnomad**，发文 + 链接 — 不发广告，发那篇内容。
4. **看真实人怎么用**：哪个动作没人做、哪条路径卡住、哪条 copy 没人懂。
5. **基于信号回来改代码**——不是设计师直觉。

> v0.6 起：本清单是 ROI 参考，不是强制顺序。实际执行允许并行修代码（v0.5 的"明确不做"红线被自己 24h 内打破，删去了）。但 **真正的闸门仍然是第 4 步**——5 个真人用过之前，新功能 ROI 默认为 0。

### 已完成的存量补丁（不计入新功能）

- **Pin-drop funnel 修复**（2026-05-12）：落 pin 后按 GPS 分流——清迈用户进 cafe 目录、其他覆盖城市进城市订阅、不覆盖进泛订阅。此前 95% 非清迈访客落地无处可去。
- **WebGL fallback**：MapLibre 在 WebGL 不可用时崩页 → 改为占位 UI。
- **Auth callback 诊断**：失败 reason 暴露到 UI + 日志，便于排查。
