# acoffee — Vision & MVP 方向

> 状态：草稿 v0.7.1 / 2026-05-18
> 用途：对齐产品定位、MVP 范围、启动顺序。技术细节在别处。
>
> v0.2 更新：锁定 Phase 1 = Web / PWA，Native App 延至 Phase 2。
> v0.3 更新：Q1（起点城市 = 清迈）/ Q2（Phase 0 串行先行）/ Q5（栈 = Next 16 + Supabase + MapLibre + OpenFreeMap）已定；Phase 0 落地页 v0 已上线，加入"全球 pin 地图"作为流量钩子。
> v0.4 更新：品牌名定为 **acoffee**（域名 acoffee.com），外层声音软化为"New city? Start with a coffee."；**内核 wedge 不变**——仍然押在"刚落地、一个人、孤独"。Meet Halfway 明确归入 Phase 3，不进 MVP。
> v0.5 更新：**品牌视觉方向 pivot** — 软咖啡馆调子撑不起视觉冲击，前台**改走"现代 / 自信 / 技术感"**。Hero 用旋转 3D 地球 + 编辑刊物大字（"You just landed. The first move is coffee."），不再是 cozy 调子。**内核 wedge 仍然不变** — 落地破冰仍是增长引擎，但视觉外壳更强势。同步承认：**Phase 1 产品代码已经显著超出 §4 MVP 三动作范围**（roster / 用户提交 café / Near me / live countdown 等都已上线），但仍处于 0 真实用户、0 内容、0 社群的「pre-ship」状态。下一步必须从写代码切回 Phase 0 的内容 + deploy。
> v0.6 更新：§10 的「明确不做」红线删除——实际执行 24h 内自破，留着只是自我欺骗。改成"按 ROI 排序的参考清单，非强制"。同步在 §10 加一条：pin-drop funnel 接入完成（落 pin 后按城市分流：清迈→cafe 目录；其他覆盖城市→城市订阅；不覆盖→泛订阅），修复了 95% 非清迈访客落地后无处可去的漏洞。
> v0.7 更新：**产品主轴从「匿名 pin map」切换为「Coffee Card」**。每个用户有一个 `acoffee.com/{handle}` 页面（city / 一句话 status / coffee chat 类型 / 联系方式 / "Invite me for a coffee" 按钮）。Card 是访客离开页面时**唯一可携带的产出物**——解决 v0.5 暴露的"drop pin 是匿名一次性动作、95% 访客离开后无可返回状态"的根本问题。pin map / café roster / signal 全部降级为 Card 的字段或附属功能。**内核 wedge 不动**（落地 / 孤独 / 数字游民）。承诺机制：Card MVP ship（2026-06-01 之前）截止前不开第 7 方向、不再动 hero 文案、不读同类产品 teardown。详见下方「§0 v0.7 重置」。
> v0.7.1 更新（2026-05-18，执行期同步）：v0.7 spine 决策（Card 主轴、§0.2 流程、§0.3 红线、§0.4 ship 条件）全部保留；以下偏移是**执行中实际发生的事**：①**视觉方向从 Editorial 翻盘到 SaaS**——v0.7 的 Editorial「锁」试了两轮（masthead / § 章节号 / drop cap / stamp 印章按钮）都被本人判 "不伦不类"，参考 cal.com / bio.link / meetup 改成 cream-on-white sans + rounded-2xl 填充按钮 + 软阴影卡。②**Chiang Mai 整页删除**（§0.5 原计划保留并改造，实际判断"混乱且意义不大"全删，伴随删除 /api/pins、/api/subscribe、PinMap / CitiesPanel / UserStatusStrip 等 v0.5 surface，−7173 行）。③**定位文案精简**："your coffee card for nomads. Get found in your city." → "**Coffee in bio.**" + "Your friendly coffee chat page."（吃掉 link-in-bio 心智模型）。④**用户扩宽**："nomad-only" 文案 → builders / nomads / founders / interesting people。⑤**City 字段从 select/autocomplete 简化为 free-form text input**。教训：视觉方向无法 vision 阶段锁定，得在 hero 上试错；产品决策可锁（spine 没动）。

---

## §0. v0.7 重置（2026-05-18）

> 本节是 v0.7 的产品 spine。v0.5 / v0.6 时代的 §1–§10 已删除（见版本日志）；旧条款由 §0 完全替代。执行期偏移记在 v0.7.1 版本条目里。

### 0.1 一句话定位

> **Coffee in bio.**
> **Your friendly coffee chat page.**

不是地图工具，不是 meetup app，不是 dating site，不是社群。是**一张可分享、可被搜到、可被邀请的个人咖啡邀请页**——*link in bio* 的对位变体，CTA 不是 "see my links" 而是 "let's grab a coffee."

目标人群：builders、digital nomads、founders、indie creators、AI / domain / web3 folks——所有喜欢用一杯咖啡（线上或线下）破冰、不想走 LinkedIn formality 路线的人。

### 0.2 访客核心动作（落地 3 分钟内完成）

```
Home → 看见 sample card 实物展示
     → 点 "Make your card →"
     → Sign in（Supabase Auth，magic link / Google）
     → Claim handle（acoffee.com/{handle}，唯一）
     → 填 4 个字段：
        · City（free-form text input，60 字符）
        · 一句话 status（≤ 140 字符："Designing a stationery brand from a Nimman café…"）
        · Coffee chat 类型（chips：☕ Coffee · 💻 Cowork · 🍜 Dinner · 🥾 Hike · 💼 Work talk）
        · 联系方式（Telegram / WhatsApp / Email，可填 1–3 个）
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

### 0.5 视觉方向（v0.7.1 实际方向，2026-05-18）

参考族：**cal.com / bio.link / meetup**——现代 SaaS / 社区风，不是 Stripe/Linear 的纯技术冷感，也不是 Editorial 杂志感（试过两轮被本人否决为"不伦不类"）。

具体清单：

- **底色**：cream `--page #f4ede1`（保留 acoffee 暖识别度），无 paper-grain SVG 噪点
- **Card / surface**：near-white `--surface #faf6ed`，`rounded-3xl` + 软阴影 `shadow-[0_24px_48px_-30px_rgba(42,31,24,0.3)]`
- **字体**：Inter 主导（sans，body + H1 都用），Fraunces 只在 italic 副文/引用句出现
- **按钮**：`rounded-2xl bg-accent text-page shadow-sm hover:shadow-md` 主按钮 + `border border-bean bg-surface` ghost 次按钮；**全站零 pill `rounded-full` 按钮**（圆形保留给 chips / status badge / avatar）
- **强调色**：terracotta `--accent #b5563a` + 软底 `--accent-soft #efe0d4`（hover、subtle CTAs）
- **章节锚**：`text-xs font-medium uppercase tracking-wide text-accent` eyebrow——SaaS 风，不是 mono 编辑刊物 `font-mono uppercase tracking-widest`
- **零编辑刊物 chrome**：无 masthead bar、无 § 章节号、无 drop cap、无 stamp 印章按钮（这些 v0.7 原版试过，全部撤）

首页结构（已上线）：
```
SiteNav (logo + Sign in / @handle)
Hero (status pill ☕ + H1 "Coffee in bio." + sub + Make your card CTA + SampleCard 实物展示)
How it works (3 张 rounded-2xl 软卡：✋ Claim handle · 📝 Fill card · ☕ Share & get invited)
Footer
```

**仍可松动**：accent 色饱和度、SampleCard 阴影深度、chip 选中态颜色——这些是 polish 维度，不是方向变更。**不再动**：sans-only typography、rounded-2xl 按钮、cream 底色、SaaS 章节 anchor。

### 0.6 与前版条款的关系

v0.5 / v0.6 的旧 §1–§10 章节已删除（2026-05-19 清理）。版本日志保留每版的关键决策摘要——足够回看为什么 v0.7 长这样。需要原文请走 `git log docs/vision.md` 翻 v0.6 之前的提交。

主要承袭：
- **内核情绪 wedge（落地 / 孤独 / 找不到人）不动**——只是从"匿名 pin 地图"机制换成"个人 Card"机制承载
- **目标用户扩宽**：v0.5 的"独自 Nomad" → v0.7 的"builders / nomads / founders / 想认识 interesting people 的人"
- **§9 原则（克制、不做匹配算法、handoff 而非站内 chat）** 继续生效，已并入 §0.3 红线
