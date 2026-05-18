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

v0.5 / v0.6 的旧 §1–§10 章节已删除（2026-05-19 清理）。版本日志保留每版的关键决策摘要——足够回看为什么 v0.7 长这样。需要原文请走 `git log docs/vision.md` 翻 v0.6 之前的提交。

主要承袭：
- **内核情绪 wedge（落地 / 孤独 / 找不到人）不动**——只是从"匿名 pin 地图"机制换成"个人 Card"机制承载
- **目标用户扩宽**：v0.5 的"独自 Nomad" → v0.7 的"builders / nomads / founders / 想认识 interesting people 的人"
- **§9 原则（克制、不做匹配算法、handoff 而非站内 chat）** 继续生效，已并入 §0.3 红线
