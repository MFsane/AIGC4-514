/* ============================================================
   HDU 日程表 · 应用逻辑
   纯前端原型：数据保存在 localStorage；HDUHELP 课表订阅导入与外部服务适配。
   ============================================================ */
(() => {
  "use strict";

  const STORAGE_KEY = "hdu_schedule_prototype_v2";
  const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const DAY_SHORT = ["日", "一", "二", "三", "四", "五", "六"];
  const WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const CAL_START = 8 * 60;
  const CAL_END = 22 * 60;
  const PX_PER_MIN = 1.05;
  const AI_ENDPOINT = "https://api.deepseek.com/chat/completions"; // 正式接入预留
  const HDUHELP_ENDPOINT = "https://neo.hduhelp.com/schedule"; // 正式接入预留
  const SITE_URL = "https://www.myhduschedule.com";
  function emptyScheduleSource() {
    return { type: "empty", label: "尚未导入课表", syncedAt: null, term: "", week: null, localWeek: null, count: 0, sourceUrl: "" };
  }

  const CATEGORIES = {
    "学习": { icon: "i-book", cls: "type-study", color: "#2563EB", soft: "#EFF6FF" },
    "作业": { icon: "i-edit", cls: "type-homework", color: "#0F766E", soft: "#ECFDF5" },
    "实验": { icon: "i-flask", cls: "type-lab", color: "#7C3AED", soft: "#F5F3FF" },
    "竞赛": { icon: "i-trophy", cls: "type-contest", color: "#EA580C", soft: "#FFF7ED" },
    "社团任务": { icon: "i-users", cls: "type-club", color: "#DB2777", soft: "#FDF2F8" },
    "其他": { icon: "i-more", cls: "type-other", color: "#64748B", soft: "#F1F5F9" }
  };
  const TYPE_NAMES = Object.keys(CATEGORIES);
  const PRIORITIES = { high: "高", medium: "中", low: "低" };
  const THEMES = [
    { id: "blue", name: "晴空蓝", desc: "默认 · 杭电蓝白", color: "#2563EB", cls: "" },
    { id: "mint", name: "青柠绿", desc: "清爽 · 专注学习", color: "#0F9F7F", cls: "" },
    { id: "violet", name: "暮光紫", desc: "沉静 · 夜间复盘", color: "#6D4AE8", cls: "" },
    { id: "mystery", name: "奶娃黄", desc: "神秘主题 · 奶娃陪伴", color: "#F3B500", cls: "mystery" }
  ];
  const CUSTOM_SWATCHES = ["#2563EB", "#0F9F7F", "#6D4AE8", "#DB2777", "#EA580C", "#0F766E", "#D97706", "#334155"];
  const CLASS_TINTS = {
    blue: { bg: "#EFF6FF", ink: "#1D4ED8", line: "#60A5FA" },
    violet: { bg: "#F5F3FF", ink: "#6D28D9", line: "#A78BFA" },
    green: { bg: "#ECFDF5", ink: "#047857", line: "#34D399" },
    red: { bg: "#FEF2F2", ink: "#B91C1C", line: "#F87171" },
    amber: { bg: "#FFFBEB", ink: "#B45309", line: "#FBBF24" },
    teal: { bg: "#F0FDFA", ink: "#0F766E", line: "#2DD4BF" },
    indigo: { bg: "#EEF2FF", ink: "#4338CA", line: "#818CF8" },
    sky: { bg: "#F0F9FF", ink: "#0369A1", line: "#38BDF8" },
    fuchsia: { bg: "#FDF4FF", ink: "#A21CAF", line: "#E879F9" },
    slate: { bg: "#F8FAFC", ink: "#475569", line: "#94A3B8" }
  };

  const RECOMMENDATIONS = {
    canteen: {
      id: "canteen", name: "一食堂 · 三楼小炒", category: "食堂", campus: "下沙", area: "生活区", km: 0.3,
      distance: "0.3 km", price: "¥15", rating: 4.6, tags: ["近", "平价", "出餐快"],
      reason: "川湘窗口出餐快，人均 15 元吃到热乎的", image: "assets/leisure-noodles.svg"
    },
    coffee: {
      id: "coffee", name: "转角咖啡 COZY", category: "咖啡", campus: "下沙", area: "生活区", km: 0.8,
      distance: "0.8 km", price: "¥22", rating: 4.4, tags: ["插座", "安静", "适合自习"],
      reason: "靠窗有插座，适合带电脑坐一会儿", image: "assets/leisure-coffee.svg"
    },
    lake: {
      id: "lake", name: "金沙湖公园", category: "散步", campus: "下沙", area: "金沙湖", km: 2.1,
      distance: "2.1 km", price: "免费", rating: 4.7, tags: ["落日", "地铁直达", "放空"],
      reason: "地铁直达，傍晚的风和落日很治愈", image: "assets/leisure-lake.svg"
    },
    library: {
      id: "library", name: "图书馆 · 3F 研习区", category: "自习", campus: "下沙", area: "教学区", km: 0.2,
      distance: "0.2 km", price: "免费", rating: 4.8, tags: ["安静", "座位多", "专注"],
      reason: "安静、座位多，适合把大任务拆成两段", image: "assets/leisure-library.svg"
    },
    night: {
      id: "night", name: "学林街夜市", category: "夜宵", campus: "下沙", area: "学林街", km: 1.2,
      distance: "1.2 km", price: "¥25", rating: 4.3, tags: ["烟火气", "室友", "选择多"],
      reason: "选择多、烟火气足，适合和室友一起", image: "assets/leisure-noodles.svg"
    },
    noodles: {
      id: "noodles", name: "川味小面 · 学林店", category: "面食", campus: "下沙", area: "学林街", km: 0.9,
      distance: "0.9 km", price: "¥18", rating: 4.5, tags: ["辣", "快", "平价"],
      reason: "麻辣鲜香，出餐快，适合赶时间的晚上", image: "assets/leisure-noodles.svg"
    },
    baolong: {
      id: "baolong", name: "下沙宝龙广场", category: "商场", campus: "下沙", area: "金沙湖", km: 2.8,
      distance: "2.8 km", price: "¥40–80", rating: 4.3, tags: ["聚餐", "电影", "地铁"],
      reason: "餐饮和娱乐选择集中，适合周末半日放松", image: "assets/leisure-city.svg"
    },
    river: {
      id: "river", name: "钱塘江 · 沿江步道", category: "散步", campus: "下沙", area: "钱塘江", km: 4.2,
      distance: "4.2 km", price: "免费", rating: 4.6, tags: ["江风", "骑行", "日落"],
      reason: "视野开阔，适合骑行或走到江边吹风", image: "assets/leisure-lake.svg"
    },
    shaocanteen: {
      id: "shaocanteen", name: "绍兴校区 · 绍味堂", category: "食堂", campus: "绍兴", area: "校内", km: 0.2,
      distance: "0.2 km", price: "¥15", rating: 4.5, tags: ["三层", "平价", "校内"],
      reason: "一层大众餐厅、二层美食城，赶时间也能快速解决", image: "assets/leisure-noodles.svg"
    },
    yinqiao: {
      id: "yinqiao", name: "银桥路商圈", category: "商圈", campus: "绍兴", area: "皋埠", km: 1.5,
      distance: "1.5 km", price: "¥25", rating: 4.2, tags: ["奶茶", "咖啡", "生活配套"],
      reason: "校区周边最热闹的商圈，奶茶、咖啡和日常采买都能解决", image: "assets/leisure-city.svg"
    },
    jingyin: {
      id: "jingyin", name: "鲸银城", category: "商场", campus: "绍兴", area: "皋埠", km: 2.4,
      distance: "2.4 km", price: "¥50–90", rating: 4.1, tags: ["聚餐", "电影", "空调"],
      reason: "想正经吃一顿或看电影时，可以来这里过一个下午", image: "assets/leisure-city.svg"
    },
    donghu: {
      id: "donghu", name: "东湖景区", category: "景点", campus: "绍兴", area: "越城区", km: 6.5,
      distance: "6.5 km", price: "¥50", rating: 4.7, tags: ["山水", "乌篷船", "拍照"],
      reason: "石壁、湖水和乌篷船很有绍兴味道，适合半日游", image: "assets/leisure-lake.svg"
    },
    ancient: {
      id: "ancient", name: "鲁迅故里 · 仓桥直街", category: "人文", campus: "绍兴", area: "越城区", km: 8.2,
      distance: "8.2 km", price: "免费", rating: 4.8, tags: ["古城", "黄酒", "小吃"],
      reason: "白墙黑瓦、石板路和小吃都集中，适合慢慢走", image: "assets/leisure-ancient.svg"
    },
    wetland: {
      id: "wetland", name: "镜湖国家城市湿地公园", category: "散步", campus: "绍兴", area: "镜湖", km: 9.5,
      distance: "9.5 km", price: "免费", rating: 4.6, tags: ["湿地", "骑行", "日落"],
      reason: "面积大、人不挤，想走远一点时很合适", image: "assets/leisure-lake.svg"
    }
  };

  const SOURCES = [
    { name: "HDUHELP 课表", letter: "H", cls: "", url: "https://neo.hduhelp.com/schedule", tag: "课表 / 空课", desc: "校园课表工具。日程表支持从 HDUHELP「课表功能 → 订阅课表」获取订阅链接并导入个人课表；未导入时为空课表，不预设课程。" },
    { name: "杭电 Wiki", letter: "W", cls: "green", url: "https://www.hdu-wiki.cn/", tag: "校园生活", desc: "杭电学生共建的校园生活资料库，用于了解校园地点、周边生活与新生经验。" },
    { name: "memecub · 奶娃表情包", letter: "奶", cls: "pink", url: "https://memecub.com/zh/tag/%E5%A5%B6%E5%A8%83", tag: "奶娃资料", desc: "奶娃表情包合集与网络迷因资料，用于神秘主题的形象和背景参考；表情包素材版权归原作者 / 权利人所有。" },
    { name: "香港商报 · 从奶龙到奶蛙", letter: "报", cls: "slate", url: "https://hkcd.com/content_app/2026-11/12/content_8785029.html", tag: "迷因背景", desc: "关于奶龙、奶蛙及“奶式家族”网络二创现象的公开报道，用于理解奶娃形象的传播背景。" },
    { name: "杭州电子科技大学", letter: "校", cls: "purple", url: "https://www.hdu.edu.cn/", tag: "校方信息", desc: "学校官网，用于校历、学校简介、校园新闻等公共信息核验。" },
    { name: "DeepSeek", letter: "D", cls: "slate", url: "https://www.deepseek.com/", tag: "AI 能力", desc: "产品设计中规划接入的 AI 能力来源，用于任务理解、时长预估、优先级建议与对话交互；原型阶段使用可解释的本地模拟。" },
    { name: "大众点评", letter: "点", cls: "orange", url: "https://www.dianping.com/", tag: "餐饮参考", desc: "餐饮与本地生活公开信息参考。原型不抓取平台评分，页面中的推荐指数为明确的「综合参考评分」。" },
    { name: "美团", letter: "美", cls: "pink", url: "https://www.meituan.com/", tag: "休闲参考", desc: "本地生活与休闲场所公开信息参考。推荐结果由 AI 综合生成，不代表平台官方榜单或真实交易数据。" },
    { name: "高德地图", letter: "图", cls: "green", url: "https://www.amap.com/", tag: "距离参考", desc: "用于距离、路线与到达时间的参考口径；原型中的距离均为演示数据。" },
    { name: "中国天气", letter: "天", cls: "orange", url: "https://www.weather.com.cn/", tag: "天气参考", desc: "天气与出行提示的公共数据来源预留；原型暂未接入实时天气接口。" }
  ];

  const FAQS = [
    ["AI 排程会读取我的哪些数据？", "排程只使用你在本产品中录入的任务信息、截止时间、优先级、时长，以及课表空课时间段。任务数据保存在本机；同步个人课表时，订阅链接只在本机解析，不上传本产品服务器。"],
    ["为什么我的任务没有排进日程？", "可能是截止前没有足够长的连续空档，或空档与已有课程 / 日程冲突。可以缩短单次时长、放宽截止时间，或手动把任务拆分到两天完成。"],
    ["为什么日程表是空白的？", "浏览器无法自动读取 HDUHELP 的跨站登录态，因此不会预设任何课表。请在「同步个人课表」中粘贴 HDUHELP「订阅课表」链接、上传 .ics 文件。导入成功后，空课计算与 AI 排程都会使用你的课程。"],
    ["AI 判断的任务类型不准确怎么办？", "类型是多选标签，你可以随时手动修正。AI 结果只作为起点，所有类型、时长、优先级和开始时间都可以在保存前调整。"],
    ["如何接收日程提醒？", "在「个人中心」绑定邮箱并打开提醒开关，设置提前量后会生成站内提醒；正式版将接入邮件服务。当前原型的邮件发送为演示模拟，不会真的发出邮件。"],
    ["推荐指数来自大众点评或美团吗？", "不是。外部平台没有公开可直接调用的接口，页面中的指数是根据人均、距离、品类和公开评价信息综合得到的「综合参考评分」，不是平台官方评分。"],
    ["一键清理会删除任务吗？", "不会。一键清理会清空课程表和任务在日历上的时间安排，任务本身仍保留在「我的任务」，可以重新手动安排或使用 AI 一键整理。"],
    ["换设备后数据还在吗？", "当前原型的数据存储在本机 localStorage，换设备或清除浏览器数据后会丢失。正式版接入账号后会与个人账号关联保存。"]
  ];

  const now = new Date();
  const today = startOfDay(now);
  const todayISO = toISODate(today);

  let state;
  let ui = {
    currentPage: "overview",
    scheduleLoaded: false,
    scheduleView: "week",
    weekOffset: 0,
    taskTab: "active",
    taskQuery: "",
    taskType: "all",
    taskPriority: "all",
    taskSort: "due",
    statRange: "week",
    notifFilter: "all",
    chatTyping: false,
    leisureCampus: "下沙",
    leisureRange: 5,
    leisureCategory: "全部",
    feedbackCategory: "功能建议",
    aiDraft: null,
    aiMode: "single",
    aiTimer: null,
    organizeStage: "idle",
    organizeResult: null,
    organizeTimer: null,
    loginMode: "login",
    pendingAfterLogin: null,
    pendingConfirm: null,
    lastFocused: null
  };

  /* ---------- 基础工具 ---------- */
  function startOfDay(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
  function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
  function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getDay();
    return addDays(d, day === 0 ? -6 : 1 - day);
  }
  function toISODate(date) {
    const d = new Date(date);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fromISODate(s, hour = 0, minute = 0) {
    const p = String(s || todayISO).split("-").map(Number);
    return new Date(p[0], (p[1] || 1) - 1, p[2] || 1, hour, minute, 0, 0);
  }
  function atTime(date, time) {
    const [h, m] = String(time || "09:00").split(":").map(Number);
    const d = new Date(date); d.setHours(h || 0, m || 0, 0, 0); return d;
  }
  function minutesOf(time) { const [h, m] = String(time || "00:00").split(":").map(Number); return (h || 0) * 60 + (m || 0); }
  function timeFromMinutes(min) {
    const m = Math.max(0, Math.round(min));
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }
  function fmtDuration(min) {
    const m = Math.max(0, Number(min) || 0);
    if (m < 60) return m + "分钟";
    const h = Math.floor(m / 60), r = m % 60;
    return h + "小时" + (r ? r + "分" : "");
  }
  function fmtDurationShort(min) {
    const m = Math.max(0, Number(min) || 0);
    if (m < 60) return m + "m";
    const h = Math.floor(m / 60), r = m % 60;
    return h + (r ? "h" + r : "h");
  }
  function fmtHM(date) { return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0"); }
  function fmtMonthDay(date) { return (date.getMonth() + 1) + "月" + date.getDate() + "日"; }
  function fmtShort(date) { return (date.getMonth() + 1) + "/" + date.getDate(); }
  function escapeHTML(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }
  function uid(prefix = "id") { return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7); }
  function icon(name, cls = "") { return '<svg class="icon ' + cls + '" aria-hidden="true"><use href="#' + name + '"></use></svg>'; }
  function greeting() {
    const h = now.getHours();
    if (h < 6) return "夜深了";
    if (h < 11) return "早上好";
    if (h < 14) return "中午好";
    if (h < 18) return "下午好";
    return "晚上好";
  }
  function showToast(message, type = "info", duration = 3200) {
    const root = document.getElementById("toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast " + type;
    const ico = type === "success" ? "i-check" : type === "error" ? "i-alert" : "i-sparkles";
    el.innerHTML = '<span class="toast-icon">' + icon(ico) + "</span>";
    const toastText = document.createElement("span");
    toastText.textContent = message;
    el.appendChild(toastText);
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add("removing");
      setTimeout(() => el.remove(), 240);
    }, duration);
  }
  function iconAction(name, action, label, id = "", danger = false) {
    return '<button type="button" class="icon-action ' + (danger ? "danger" : "") + '" data-action="' + action + '" ' + (id ? 'data-task-id="' + escapeHTML(id) + '"' : "") + ' aria-label="' + escapeHTML(label) + '" title="' + escapeHTML(label) + '">' + icon(name) + "</button>";
  }

  /* ---------- 数据初始化 ---------- */
  function makeClass(id, name, day, start, end, room, teacher, tint) {
    return { id, name, day, start, end, room, teacher, tint };
  }
  function makeTask(data) {
    return Object.assign({
      id: uid("task"), name: "未命名任务", type: "学习", priority: "medium",
      duration: 90, due: todayISO + "T23:59", notes: "", image: "", link: "",
      done: false, archived: false, deleted: false, source: "manual", createdAt: new Date().toISOString(),
      placement: null, types: null, reminded: false
    }, data);
  }
  function demoState() {
    const tasks = [];
    return {
      version: 2,
      user: null,
      focusLog: [],
      profile: {
        nickname: "", major: "", grade: "", email: "",
        reminders: true, lead: 30, channels: { inApp: true, email: true }, mascot: true, avatarImage: ""
      },
      theme: { id: "blue", color: "#2563EB", image: "", scope: "background" },
      tasks,
      classes: [],
      scheduleSource: emptyScheduleSource(),
      notifications: [
        { id: "n1", type: "ai", title: "试试一键整理日程", body: "添加任务并导入课表后，AI 会按空课时间安排所有进行中的任务。", createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), read: false },
        { id: "n3", type: "system", title: "欢迎使用 HDU 日程表", body: "课表默认为空白，不预设课程；导入订阅链接或 ICS 后自动计算空课。", createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), read: true },
        { id: "n4", type: "leisure", title: "休闲推荐更新", body: "下沙与绍兴校区的推荐已更新，支持按距离和类型筛选，也可以自己推荐或避雷。", createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), read: true }
      ],
      feedback: [],
      userPlaces: { recommend: [], avoid: [] },
      chat: []
    };
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 2 && Array.isArray(parsed.tasks)) {
          const base = demoState();
          const merged = Object.assign(base, parsed, {
            profile: Object.assign(base.profile, parsed.profile || {}),
            theme: Object.assign(base.theme, parsed.theme || {}),
            scheduleSource: parsed.scheduleSource || base.scheduleSource,
            notifications: parsed.notifications || base.notifications,
            focusLog: parsed.focusLog || base.focusLog,
            userPlaces: Object.assign({ recommend: [], avoid: [] }, parsed.userPlaces || {}),
            chat: parsed.chat || []
          });
          const demoTaskIds = ["task_lab", "task_listen", "task_contest", "task_math", "task_physics", "task_club", "task_software", "task_archive"];
          merged.tasks = merged.tasks.filter(t => !demoTaskIds.includes(t.id));
          if (!parsed.scheduleSource || parsed.scheduleSource.type === "demo") {
            merged.classes = [];
            merged.scheduleSource = emptyScheduleSource();
          }
          return merged;
        }
      }
    } catch (e) { console.warn("读取本地数据失败", e); }
    return demoState();
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("保存本地数据失败", e); showToast("本地存储空间不足，图片可能未保存", "error"); }
  }

  /* ---------- 主题与账号 ---------- */
  function hexToRgb(hex) {
    const h = String(hex || "#2563EB").replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function shade(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
    return "#" + [r, g, b].map(v => Math.round((t - v) * p + v).toString(16).padStart(2, "0")).join("");
  }
  function isLight(hex) {
    const { r, g, b } = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 170;
  }
  function applyTheme() {
    const theme = state.theme || { id: "blue", color: "#2563EB" };
    document.body.dataset.theme = theme.id === "custom" ? "custom" : (theme.id || "blue");
    const root = document.body;
    if (theme.id === "custom") {
      const c = theme.color || "#2563EB";
      const rgb = hexToRgb(c);
      root.style.setProperty("--primary", c);
      root.style.setProperty("--primary-rgb", rgb.r + "," + rgb.g + "," + rgb.b);
      root.style.setProperty("--primary-strong", shade(c, -16));
      root.style.setProperty("--primary-soft", "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",.09)");
      root.style.setProperty("--primary-soft-2", "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",.17)");
      root.style.setProperty("--primary-ink", shade(c, -24));
      root.style.setProperty("--on-primary", isLight(c) ? "#1F2937" : "#FFFFFF");
    } else {
      ["--primary", "--primary-rgb", "--primary-strong", "--primary-soft", "--primary-soft-2", "--primary-ink", "--on-primary"].forEach(p => root.style.removeProperty(p));
    }
    if (theme.image) {
      document.body.classList.toggle("has-theme-image", theme.scope !== "button");
      document.body.style.setProperty("--theme-image", 'url("' + theme.image + '")');
    } else {
      document.body.classList.remove("has-theme-image", "button-texture");
      document.body.style.removeProperty("--theme-image");
    }
    document.body.classList.toggle("button-texture", !!theme.image && theme.scope === "button");
    const mascot = document.getElementById("mascot");
    if (mascot) mascot.hidden = !(theme.id === "mystery" && state.profile.mascot !== false);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme.id === "mystery" ? "#F3B500" : (theme.id === "custom" ? theme.color : ({ mint: "#0F9F7F", violet: "#6D4AE8" }[theme.id] || "#2563EB"));
  }
  function initials(name) {
    const n = String(name || "同学").trim();
    return n ? n.slice(0, 1).toUpperCase() : "H";
  }
  function updateChrome() {
    const dateEl = document.getElementById("topbarDate");
    if (dateEl) dateEl.textContent = fmtMonthDay(now) + " " + DAY_NAMES[now.getDay()];
    document.querySelectorAll(".nav-item,.utility-item").forEach(el => el.classList.toggle("active", el.dataset.page === ui.currentPage));
    const activeTasks = state.tasks.filter(t => !t.done && !t.archived && !t.deleted).length;
    const scheduled = state.tasks.filter(t => t.placement && !t.archived && !t.deleted && isDateInWeek(t.placement.date, startOfWeek(today))).length;
    const sc = document.getElementById("scheduleCount"), tc = document.getElementById("taskCount");
    if (sc) sc.textContent = scheduled;
    if (tc) tc.textContent = activeTasks;
    const unread = state.notifications.filter(n => !n.read).length;
    const dot = document.getElementById("notificationDot"), sdot = document.getElementById("sidebarNotifDot");
    if (dot) dot.hidden = !unread;
    if (sdot) sdot.hidden = !unread;
    const account = document.getElementById("accountButton");
    if (account) {
      if (state.user) {
        account.classList.add("is-account");
        account.innerHTML = (state.profile.avatarImage ? '<img class="account-avatar" src="' + state.profile.avatarImage + '" alt="" style="object-fit:cover">' : '<span class="account-avatar">' + escapeHTML(initials(state.user.name)) + '</span>') + '<span class="account-name">' + escapeHTML(state.user.name) + '</span>' + icon("i-chevron-down", "icon--sm");
        account.setAttribute("aria-label", "账号菜单");
      } else {
        account.classList.remove("is-account");
        account.textContent = "登录";
        account.setAttribute("aria-label", "登录或注册");
      }
      account.setAttribute("aria-expanded", "false");
    }
    document.title = (pageTitleFor(ui.currentPage) || "HDU 日程表") + " · HDU 日程表";
  }
  function pageTitleFor(page) {
    return ({ overview: "今日概览", schedule: "日程表", tasks: "我的任务", stats: "数据统计", themes: "主题更换", leisure: "休闲时间", notifications: "通知中心", profile: "个人中心", help: "帮助与反馈", about: "关于与合规", sources: "信息来源" })[page] || "";
  }
  function weekFocusMinutes() {
    const ws = startOfWeek(today), we = addDays(ws, 7);
    const logs = (state.focusLog || []).filter(x => {
      const d = fromISODate(x.date);
      return d >= ws && d < we;
    });
    if (logs.length) return logs.reduce((sum, x) => sum + (Number(x.minutes) || 0), 0);
    return state.tasks.filter(t => t.placement && !t.archived && !t.deleted).reduce((sum, t) => {
      const d = fromISODate(t.placement.date);
      if (d >= ws && d < we && (t.done || d >= today)) return sum + (t.duration || 60);
      return sum;
    }, 0) || 320;
  }
  function isDateInWeek(dateStr, weekStart) {
    const d = fromISODate(dateStr), ws = startOfWeek(weekStart), we = addDays(ws, 7);
    return d >= ws && d < we;
  }
  function taskDate(task) {
    if (task.placement && task.placement.date) return fromISODate(task.placement.date);
    return null;
  }
  function dueDate(task) {
    return new Date(task.due || (todayISO + "T23:59"));
  }
  function isOverdue(task) { return !task.done && dueDate(task).getTime() < Date.now(); }
  function daysUntil(date) {
    const a = startOfDay(date).getTime(), b = startOfDay(today).getTime();
    return Math.round((a - b) / 86400000);
  }
  function dueLabel(task) {
    const d = dueDate(task), diff = daysUntil(d);
    if (task.done) return "已完成";
    if (diff < 0) return "逾期 " + Math.abs(diff) + " 天";
    if (diff === 0) return "今天 " + fmtHM(d);
    if (diff === 1) return "明天 " + fmtHM(d);
    if (diff === 2) return "后天 " + fmtHM(d);
    return fmtShort(d) + " " + fmtHM(d);
  }
  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "刚刚";
    if (min < 60) return min + " 分钟前";
    const h = Math.floor(min / 60);
    if (h < 24) return h + " 小时前";
    const d = Math.floor(h / 24);
    if (d < 7) return d + " 天前";
    return fmtShort(new Date(iso));
  }
  function typeInfo(type) { return CATEGORIES[type] || CATEGORIES["其他"]; }
  function typeBadge(type) {
    const c = typeInfo(type);
    return '<span class="badge type-badge ' + c.cls + '">' + escapeHTML(type) + "</span>";
  }
  function priorityBadge(priority) {
    return '<span class="priority priority-' + priority + '">' + (PRIORITIES[priority] || "中") + "优先级</span>";
  }
  function typeColor(type) { return typeInfo(type).color; }

  /* ---------- 空课计算 ---------- */
  function getDayBusy(date, excludeTaskId = "") {
    const dow = date.getDay();
    const dayIndex = dow === 0 ? 6 : dow - 1;
    const busy = [];
    const teachingWeek = effectiveTeachingWeek(date);
    (state.classes || []).filter(c => c.day === dayIndex && (!c.weeks || !c.weeks.length || c.weeks.includes(teachingWeek))).forEach(c => {
      busy.push({ start: minutesOf(c.start), end: minutesOf(c.end), kind: "class", name: c.name });
    });
    state.tasks.filter(t => !t.archived && !t.deleted && t.placement && t.placement.date === toISODate(date) && t.id !== excludeTaskId).forEach(t => {
      busy.push({ start: minutesOf(t.placement.start), end: minutesOf(t.placement.end), kind: "task", name: t.name });
    });
    return busy.sort((a, b) => a.start - b.start);
  }
  function freeGapsForDate(date, minMinutes = 45, excludeTaskId = "") {
    const busy = getDayBusy(date, excludeTaskId);
    const gaps = [];
    let cursor = CAL_START;
    for (const b of busy) {
      if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, CAL_END), minutes: Math.min(b.start, CAL_END) - cursor });
      cursor = Math.max(cursor, b.end);
      if (cursor >= CAL_END) break;
    }
    if (cursor < CAL_END) gaps.push({ start: cursor, end: CAL_END, minutes: CAL_END - cursor });
    return gaps.filter(g => g.end - g.start >= minMinutes);
  }
  function findNextFreeBlock(minMinutes = 60) {
    for (let i = 0; i < 10; i++) {
      const d = addDays(today, i);
      const gaps = freeGapsForDate(d, minMinutes);
      for (const g of gaps) {
        let start = g.start;
        if (i === 0) start = Math.max(start, now.getHours() * 60 + now.getMinutes() + 10);
        if (g.end - start >= minMinutes) {
          const label = (i === 0 ? "今天" : i === 1 ? "明天" : WEEKDAY_NAMES[(d.getDay() + 6) % 7]) + " " + timeFromMinutes(start) + "–" + timeFromMinutes(g.end);
          return { date: toISODate(d), start: timeFromMinutes(start), end: timeFromMinutes(g.end), minutes: g.end - start, label };
        }
      }
    }
    return null;
  }
  function computeWeekFreeChips(weekStart) {
    const all = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      if (date < today) continue;
      const gaps = freeGapsForDate(date, 60);
      for (const g of gaps) {
        let start = g.start;
        if (toISODate(date) === todayISO) start = Math.max(start, now.getHours() * 60 + now.getMinutes() + 15);
        if (g.end - start >= 60) all.push({ date, start, end: g.end, minutes: g.end - start });
      }
    }
    all.sort((a, b) => {
      const da = a.date.getTime() + a.start, db = b.date.getTime() + b.start;
      return da - db;
    });
    return all.slice(0, 5);
  }


  /* ---------- 个人课表同步 ---------- */
  const CLASS_TINTS_LIST = ["blue", "violet", "green", "red", "amber", "teal", "indigo", "sky", "fuchsia", "slate"];

  function getScheduleSource() {
    return state.scheduleSource || emptyScheduleSource();
  }

  function teachingWeekOffset() {
    const src = getScheduleSource();
    if (!src.week || !src.localWeek) return 0;
    return Number(src.week) - Number(src.localWeek);
  }

  function effectiveTeachingWeek(date) {
    return weekNumber(date) + teachingWeekOffset();
  }

  function unescapeICS(value) {
    return String(value || "").replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
  }

  function parseICSDate(value) {
    const m = String(value || "").trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
    const hh = Number(m[4] || 0), mm = Number(m[5] || 0), ss = Number(m[6] || 0);
    const date = m[7] ? new Date(Date.UTC(y, mo, d, hh, mm, ss)) : new Date(y, mo, d, hh, mm, ss);
    return { date, hasTime: !!m[4] };
  }

  function parseICSClasses(text, currentWeek) {
    const unfolded = String(text || "").replace(/\r?\n[ \t]/g, "");
    const blocks = [...unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)].map(m => m[1]);
    const dayCodes = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    const weekStart = startOfWeek(today), weekEnd = addDays(weekStart, 7);
    const out = [];
    let colorIndex = 0;
    blocks.forEach(block => {
      const lines = block.split(/\r?\n/);
      const fields = {};
      lines.forEach(line => {
        const idx = line.indexOf(":");
        if (idx < 0) return;
        const key = line.slice(0, idx).split(";")[0].toUpperCase();
        fields[key] = line.slice(idx + 1);
      });
      if (fields.STATUS && fields.STATUS.toUpperCase() === "CANCELLED") return;
      const dtStart = parseICSDate(fields.DTSTART);
      if (!dtStart || !dtStart.hasTime) return;
      const dtEnd = parseICSDate(fields.DTEND);
      const summary = unescapeICS(fields.SUMMARY) || "未命名课程";
      const location = unescapeICS(fields.LOCATION);
      const start = dtStart.date;
      let end = dtEnd ? dtEnd.date : new Date(start.getTime() + 95 * 60000);
      if (end <= start) end = new Date(start.getTime() + 95 * 60000);
      const rrule = fields.RRULE || "";
      const untilMatch = rrule.match(/UNTIL=([^;]+)/i);
      const until = untilMatch ? parseICSDate(untilMatch[1]) : null;
      let byDays = [];
      const bydayMatch = rrule.match(/BYDAY=([^;]+)/i);
      if (bydayMatch) byDays = bydayMatch[1].split(",").map(x => dayCodes[x.trim().slice(-2).toUpperCase()]).filter(x => x !== undefined);
      if (!byDays.length) byDays = [start.getDay()];
      const isRecurring = /FREQ=WEEKLY/i.test(rrule);
      if (!isRecurring) {
        if (start < weekStart || start >= weekEnd) return;
      } else {
        if (start >= weekEnd) return;
        if (until && until.date < weekStart) return;
      }
      const startWeek = weekNumber(start);
      const untilWeek = isRecurring ? (until ? weekNumber(until.date) : 20) : startWeek;
      const weeks = [];
      if (isRecurring) { for (let w = Math.max(1, startWeek); w <= Math.max(startWeek, untilWeek); w++) weeks.push(w); } else { weeks.push(startWeek); }
      byDays.forEach(dow => {
        const dayIndex = dow === 0 ? 6 : dow - 1;
        let occurrence = new Date(weekStart);
        occurrence = addDays(weekStart, dayIndex);
        occurrence.setHours(start.getHours(), start.getMinutes(), 0, 0);
        if (!isRecurring && (occurrence < weekStart || occurrence >= weekEnd)) return;
        if (isRecurring && start > occurrence) return;
        const endTime = new Date(occurrence.getTime() + (end - start));
        const key = summary + "|" + dayIndex + "|" + fmtHM(occurrence) + "|" + fmtHM(endTime);
        if (out.some(x => x._key === key)) return;
        out.push({
          _key: key, id: uid("class"), name: summary, day: dayIndex,
          start: fmtHM(occurrence), end: fmtHM(endTime), room: location,
          teacher: "", weeks: weeks, tint: CLASS_TINTS_LIST[colorIndex++ % CLASS_TINTS_LIST.length]
        });
      });
    });
    return out.map(x => { delete x._key; return x; }).sort((a, b) => a.day - b.day || minutesOf(a.start) - minutesOf(b.start) || a.name.localeCompare(b.name, "zh-CN"));
  }

  function syncMessage(panel, message, type = "info") {
    const el = document.getElementById("syncIcsMsg");
    if (!el) return;
    el.textContent = message;
    el.className = "sync-message " + type;
  }

  function setSyncBusy(button, busy, label) {
    if (!button) return;
    if (!button.dataset.original) button.dataset.original = button.innerHTML;
    button.disabled = busy;
    button.innerHTML = busy ? '<span class="mini-spinner"></span>' + label : button.dataset.original;
  }

  function clearSchedule() {
    state.classes = [];
    state.scheduleSource = emptyScheduleSource();
    state.tasks.forEach(t => { t.placement = null; });
    saveState();
    ui.scheduleLoaded = true;
    ui.weekOffset = 0;
    if (ui.organizeResult) ui.organizeResult = null;
    closeModal();
    navigate("schedule");
    updateChrome();
    showToast("日程表已清空；任务仍保留在「我的任务」", "success");
  }

  function applyPersonalClasses(classes, meta) {
    if (!classes || !classes.length) { showToast("没有解析到课程，请检查数据后重试", "error"); return; }
    state.classes = classes;
    const conflicts = state.tasks.filter(t => {
      if (!t.placement || t.archived || t.deleted) return false;
      const d = fromISODate(t.placement.date);
      const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const week = weekNumber(d) + (meta.week ? Number(meta.week) - weekNumber(today) : 0);
      const a1 = minutesOf(t.placement.start), a2 = minutesOf(t.placement.end);
      return classes.some(c => c.day === day && (!c.weeks || !c.weeks.length || c.weeks.includes(week)) && a1 < minutesOf(c.end) && a2 > minutesOf(c.start));
    }).length;
    state.scheduleSource = {
      type: meta.type,
      label: meta.label,
      syncedAt: new Date().toISOString(),
      term: meta.term || "",
      week: meta.week || weekNumber(now),
      localWeek: weekNumber(today),
      count: classes.length,
      sourceUrl: meta.sourceUrl || HDUHELP_ENDPOINT
    };
    state.notifications.unshift({
      id: uid("n"), type: "system", title: "个人课表已同步",
      body: "已读取 " + classes.length + " 门课程，AI 排程与空课计算已切换为你的个人课表。" + (conflicts ? "检测到 " + conflicts + " 个已有日程与课程时间重叠，建议在日程表中调整。" : ""),
      createdAt: new Date().toISOString(), read: false
    });
    saveState();
    ui.scheduleLoaded = true;
    closeModal();
    updateChrome();
    navigate("schedule");
    showToast("已同步个人课表：" + classes.length + " 门课程" + (conflicts ? " · " + conflicts + " 个日程需检查" : ""), "success", 4600);
  }

  function openPersonalSync() {
    const src = getScheduleSource();
    const html = '<div class="modal modal--wide" role="dialog" aria-modal="true" aria-label="同步个人课表">' +
      modalHeader("Personal timetable", "同步个人课表", "当前为" + escapeHTML(src.label) + "。从 HDUHELP 导入订阅链接或 ICS 文件后，空课计算、AI 排程与周视图都会使用你的课程。") +
      '<div class="modal-body"><div class="sync-current"><span class="status-dot"></span><span>当前课表：<strong>' + escapeHTML(src.label) + '</strong>' + (src.syncedAt ? " · " + escapeHTML(relativeTime(src.syncedAt)) + "同步" : "") + '</span><span style="margin-left:auto">' + (state.classes || []).length + ' 门课程</span></div>' +
      '<div class="sync-alert">' + icon("i-info") + '<span><strong>简单导入：</strong>从 HDUHELP 的「订阅课表」获取链接后直接导入；链接可能包含访问令牌，只在本机使用，不会保存。</span></div>' +
      '<ol class="sync-steps"><li><span>1</span><div><strong>打开 HDUHELP 课表</strong><p><a href="https://neo.hduhelp.com/schedule" target="_blank" rel="noopener noreferrer">neo.hduhelp.com/schedule ' + icon("i-external") + '</a>，完成登录。</p></div></li><li><span>2</span><div><strong>复制订阅链接</strong><p>在课表页右上角点击「课表功能」→「订阅课表」→ 复制订阅链接（也可以选择“添加到日历”后再复制）。</p></div></li><li><span>3</span><div><strong>粘贴并导入</strong><p>把链接粘贴到下方，点击「读取并导入」。如果浏览器拦截跨域读取，可下载 .ics 文件后上传。</p></div></li></ol>' +
      '<div class="sync-method"><div class="sync-method-title">' + icon("i-link") + '订阅链接 <span>推荐</span></div><div class="code-row"><input class="text-input" id="icsUrl" type="text" placeholder="粘贴 HDUHELP 订阅链接（https:// 或 webcal://）"><button type="button" class="btn btn-primary" data-action="sync-ics-fetch">' + icon("i-download") + '读取并导入</button></div><span class="field-hint">HDUHELP 订阅链接会随课表自动更新；若无法跨域读取，请使用下方文件或文本导入。</span></div>' +
      '<div class="sync-divider"><span>或使用离线文件</span></div>' +
      '<div class="field"><label>上传 .ics 文件</label><label class="upload-drop" for="icsFile"><span class="upload-icon">' + icon("i-upload") + '</span><span><strong>选择 .ics 文件</strong><small>支持从订阅链接下载的日历文件</small></span><input id="icsFile" type="file" accept=".ics,text/calendar,text/plain" hidden></label><span class="file-name" id="icsFileName"></span></div>' +
      '<div class="field" style="margin-top:10px"><label for="icsText">或粘贴 ICS 文本</label><textarea class="textarea-input" id="icsText" style="min-height:100px" placeholder="BEGIN:VCALENDAR&#10;VERSION:2.0&#10;..."></textarea></div>' +
      '<div class="sync-actions"><button class="btn btn-secondary" data-action="sync-ics-apply">' + icon("i-check") + '解析文本并应用课表</button></div>' +
      '<p class="sync-message" id="syncIcsMsg"></p><p class="sync-privacy">' + icon("i-shield") + '订阅链接与 ICS 文件只在本机解析，不上传。请确认内容来自你本人的 HDUHELP 课表。</p>' +
      '</div><div class="modal-foot"><div class="modal-actions-split"><div></div><div class="right"><button class="btn btn-secondary" data-action="close-modal">关闭</button></div></div></div></div>';
    openModal(html);
  }
  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file, "utf-8");
    });
  }

  async function fetchIcsUrl() {
    const input = document.getElementById("icsUrl");
    const textarea = document.getElementById("icsText");
    const button = document.querySelector('[data-action="sync-ics-fetch"]');
    const rawUrl = input ? input.value.trim() : "";
    const url = rawUrl.replace(/^webcal:\/\//i, "https://");
    if (!/^https?:\/\//i.test(url)) { syncMessage("ics", "请填写 http(s) 开头的 ICS 订阅链接。", "error"); return; }
    setSyncBusy(button, true, "读取中…");
    try {
      const res = await fetch(url, { headers: { "Accept": "text/calendar,text/plain,*/*" } });
      if (!res.ok) throw new Error("链接返回 " + res.status + "，请确认订阅链接有效。");
      const text = await res.text();
      if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("返回内容不是 ICS 日历文件。");
      if (textarea) textarea.value = text;
      const classes = parseICSClasses(text, weekNumber(now));
      if (!classes.length) throw new Error("没有解析到本周课程，请确认订阅内容包含当前学期课表。");
      applyPersonalClasses(classes, { type: "ics", label: "HDUHELP 订阅课表", term: "HDUHELP 课表订阅", week: weekNumber(now), sourceUrl: "" });
    } catch (err) {
      syncMessage("ics", "读取失败：" + err.message + "。可下载 .ics 文件后上传，避免跨域限制。", "error");
    } finally {
      setSyncBusy(button, false, "");
    }
  }

  function syncIcsFromPanel() {
    const textarea = document.getElementById("icsText");
    const text = textarea ? textarea.value.trim() : "";
    if (!/BEGIN:VCALENDAR/i.test(text)) { syncMessage("ics", "请先粘贴 ICS 内容或上传 .ics 文件。", "error"); return; }
    try {
      const classes = parseICSClasses(text, weekNumber(now));
      if (!classes.length) { syncMessage("ics", "没有解析到本周课程。请确认文件包含当前学期的课程，或检查订阅链接。", "error"); return; }
      applyPersonalClasses(classes, { type: "ics", label: "HDUHELP 订阅课表", term: "HDUHELP 课表订阅", week: weekNumber(now), sourceUrl: "" });
    } catch (err) {
      syncMessage("ics", "解析失败：" + err.message, "error");
    }
  }


  /* ---------- 登录 ---------- */
  function requireAuth(action) {
    if (state.user) { action(); return true; }
    ui.pendingAfterLogin = action;
    showToast("请先登录，再保存你的日程与设置", "info");
    openLogin("login", action);
    return false;
  }
  function openLogin(mode = "login", after = null) {
    ui.loginMode = mode;
    if (after) ui.pendingAfterLogin = after;
    const html = '<div class="modal modal--auth" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
      '<button class="icon-btn auth-close" data-action="close-modal" aria-label="关闭">' + icon("i-x") + "</button>" +
      '<div class="auth-split">' +
        '<aside class="auth-aside">' +
          '<div class="brand"><img class="brand__logo" src="assets/logo.svg" alt=""><span class="brand__text"><strong>HDU 日程表</strong><small>AI 校园时间规划</small></span></div>' +
          '<div><h3>把忙碌，<br>安排得刚刚好。</h3><p>让 AI 结合你的课表空档，把作业、实验、竞赛和社团任务放进合适的时间。</p></div>' +
          '<div class="auth-points">' +
            '<span class="auth-point">' + icon("i-calendar") + "课表空档自动避让</span>" +
            '<span class="auth-point">' + icon("i-sparkles") + "AI 估时与优先级建议</span>" +
            '<span class="auth-point">' + icon("i-mail") + "截止前邮件提醒</span>" +
          "</div>" +
        "</aside>" +
        '<div class="auth-main">' +
          '<div class="auth-main-head"><h2 id="authTitle">' + (mode === "register" ? "创建你的日程空间" : "欢迎回来") + '</h2><p>' + (mode === "register" ? "注册后即可保存任务、设置提醒与导出日程。" : "登录后继续你的时间计划。") + "</p></div>" +
          '<div class="auth-tabs"><button class="auth-tab ' + (mode === "login" ? "active" : "") + '" data-action="auth-mode" data-mode="login">登录</button><button class="auth-tab ' + (mode === "register" ? "active" : "") + '" data-action="auth-mode" data-mode="register">注册</button></div>' +
          (mode === "login" ? loginFormHTML() : registerFormHTML()) +
          '<div class="auth-divider">或</div>' +
          '<button class="demo-login" data-action="demo-login">' + icon("i-sparkles") + "使用演示账号一键登录</button>" +
          '<p class="auth-foot">登录即表示你同意本原型的《隐私与数据说明》。<br>演示账号与验证码均为本地模拟，不会向真实邮箱发送邮件。</p>' +
        "</div>" +
      "</div></div>";
    openModal(html, { focus: mode === "login" ? "#loginEmail" : "#regName" });
  }
  function loginFormHTML() {
    return '<form class="auth-form" id="loginForm">' +
      '<div class="field"><label for="loginEmail">邮箱 / 手机号</label><input class="text-input" id="loginEmail" name="email" type="text" placeholder="请输入邮箱或手机号" autocomplete="username" required></div>' +
      '<div class="field"><label for="loginPassword">密码</label><div class="password-wrap"><input class="text-input" id="loginPassword" name="password" type="password" placeholder="输入密码（至少 6 位）" autocomplete="current-password" required><button type="button" class="password-toggle" data-action="toggle-password" data-target="loginPassword" aria-label="显示密码">' + icon("i-eye") + '</button></div></div>' +
      '<button class="btn btn-primary auth-submit" type="submit">登录</button>' +
    "</form>";
  }
  function registerFormHTML() {
    return '<form class="auth-form" id="registerForm">' +
      '<div class="field"><label for="regName">昵称</label><input class="text-input" id="regName" name="name" type="text" placeholder="怎么称呼你？" autocomplete="nickname" required></div>' +
      '<div class="field"><label for="regEmail">邮箱</label><input class="text-input" id="regEmail" name="email" type="email" placeholder="name@example.com" autocomplete="email" required></div>' +
      '<div class="field"><label for="regPassword">设置密码</label><div class="password-wrap"><input class="text-input" id="regPassword" name="password" type="password" placeholder="至少 6 位" autocomplete="new-password" required><button type="button" class="password-toggle" data-action="toggle-password" data-target="regPassword" aria-label="显示密码">' + icon("i-eye") + "</button></div></div>" +
      '<button class="btn btn-primary auth-submit" type="submit">注册并进入</button>' +
    "</form>";
  }
  function finishLogin(user) {
    state.user = user;
    if (!state.profile.nickname) state.profile.nickname = user.name;
    if (!state.profile.email && user.email) state.profile.email = user.email;
    saveState();
    closeModal();
    updateChrome();
    renderPage();
    showToast("欢迎回来，" + user.name + "。日程已为你准备好。", "success");
    const after = ui.pendingAfterLogin;
    ui.pendingAfterLogin = null;
    if (typeof after === "function") setTimeout(() => after(), 120);
  }
  function demoLogin() {
    const user = { name: "演示同学", email: "demo@myhduschedule.com", provider: "demo", createdAt: new Date().toISOString() };
    state.profile.nickname = state.profile.nickname || "演示同学";
    state.profile.email = user.email;
    finishLogin(user);
  }

  /* ---------- 路由与页面渲染 ---------- */
  const ROUTES = {
    overview: renderOverview,
    schedule: renderSchedule,
    tasks: renderTasks,
    stats: renderStats,
    themes: renderThemes,
    leisure: renderLeisure,
    notifications: renderNotifications,
    profile: renderProfile,
    help: renderHelp,
    about: renderAbout,
    sources: renderSources
  };
  function navigate(page, opts = {}) {
    if (!ROUTES[page]) page = "overview";
    ui.currentPage = page;
    if (!opts.fromHash) {
      try { history.replaceState(null, "", "#" + page); } catch (e) { location.hash = page; }
    }
    closeSidebar();
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    renderPage();
    updateChrome();
  }
  function renderPage() {
    const fn = ROUTES[ui.currentPage] || ROUTES.overview;
    const host = document.getElementById("page");
    if (!host) return;
    host.innerHTML = fn();
    host.classList.remove("page");
    void host.offsetWidth;
    host.classList.add("page");
    afterRender();
  }
  function afterRender() {
    if (ui.currentPage === "schedule" && !ui.scheduleLoaded) {
      setTimeout(() => {
        if (ui.currentPage !== "schedule" || ui.scheduleLoaded) return;
        ui.scheduleLoaded = true;
        renderPage();
      }, 680);
    }
    if (ui.currentPage === "leisure") {
      const sc = document.getElementById("chatScroll");
      if (sc) sc.scrollTop = sc.scrollHeight;
    }
    if (ui.currentPage === "themes") {
      applyTheme();
    }
  }
  function pageHead(eyebrow, title, sub, actions = "") {
    return '<div class="page-head"><div class="page-head__copy"><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1>' + (sub ? '<p class="subheading">' + sub + "</p>" : "") + "</div>" + (actions ? '<div class="page-actions">' + actions + "</div>" : "") + "</div>";
  }

  /* ---------- 今日概览 ---------- */
  function renderOverview() {
    const todayTasks = state.tasks.filter(t => !t.archived && !t.deleted && t.placement && t.placement.date === todayISO).sort((a, b) => minutesOf(a.placement.start) - minutesOf(b.placement.start));
    const active = state.tasks.filter(t => !t.done && !t.archived && !t.deleted);
    const done = state.tasks.filter(t => t.done && !t.archived && !t.deleted);
    const todayPending = todayTasks.filter(t => !t.done).length;
    const upcoming = state.tasks.filter(t => !t.done && !t.archived && !t.deleted).sort((a, b) => dueDate(a) - dueDate(b));
    const upcoming48 = upcoming.filter(t => dueDate(t) - now <= 48 * 3600000).length;
    const completion = active.length + done.length ? Math.round(done.length / (active.length + done.length) * 100) : 0;
    const focus = weekFocusMinutes();
    const nextFree = findNextFreeBlock(45);
    const topTask = upcoming[0];
    const weekStart = startOfWeek(today);
    const weekPercent = Math.min(96, Math.max(0, Math.round(focus / 900 * 100)));
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const insight = nextFree && topTask
      ? '最近的完整空档是 <strong>' + escapeHTML(nextFree.label) + '</strong>，适合推进「' + escapeHTML(topTask.name) + '」。建议拆成 2 轮专注，每轮 45 分钟。'
      : "本周安排比较满。可以缩短单次任务时长，或把不紧急的任务顺延到下周，给自己留一点缓冲。";
    return '<div class="overview">' +
      '<section class="overview-hero"><div class="hero-copy">' +
        '<div class="hero-eyebrow">' + fmtMonthDay(now) + " · " + DAY_NAMES[now.getDay()] + " · 第 " + weekNumber(now) + " 教学周</div>" +
        '<h2 class="hero-title">' + greeting() + "，" + escapeHTML(state.user ? state.user.name : "同学") + "</h2>" +
        '<p class="hero-desc">今天还有 <strong>' + todayPending + "</strong> 项安排，最近截止在 " + (upcoming[0] ? escapeHTML(dueLabel(upcoming[0])) : "暂无截止任务") + "。先把最重要的一件做好，就已经很棒了。</p>" +
        '<div class="hero-actions"><button class="btn btn-white" data-action="open-ai">' + icon("i-sparkles") + 'AI 帮我安排</button><button class="btn btn-soft" data-action="add-task">' + icon("i-plus") + "添加任务</button></div>" +
      '</div><div class="hero-visual">' +
        '<div class="hero-date-card"><small>' + (now.getMonth() + 1) + "月 · " + now.getFullYear() + '</small><div class="big-date">' + String(now.getDate()).padStart(2, "0") + '</div><div class="weekday">' + DAY_NAMES[now.getDay()] + " · 第 " + weekNumber(now) + " 周</div></div>" +
        '<div class="hero-ring" style="background:conic-gradient(rgba(255,255,255,.93) 0 ' + weekPercent + '%, rgba(255,255,255,.19) ' + weekPercent + '%)"><span>' + weekPercent + '%<small>本周节奏</small></span></div>' +
      "</div></section>" +
      '<div class="stat-grid">' +
        statCard("i-calendar", "", "今日任务", todayPending + '<small>/ ' + todayTasks.length + " 项</small>", todayPending ? "还有 " + todayPending + " 项待完成" : "今天的安排已清空", "") +
        statCard("i-check-square", "amber", "本周完成率", completion + '<small>%</small>', done.length + " 项已完成", "") +
        statCard("i-alert", "purple", "48h 内截止", upcoming48 + '<small>项</small>', upcoming48 ? "建议优先推进" : "暂无紧急截止", "") +
      "</div>" +
      '<div class="overview-grid"><section class="card agenda-card">' +
        '<div class="card-head"><div><h3 class="card-title">' + icon("i-clock", "icon--sm") + '今天的安排</h3><p class="card-sub">' + fmtMonthDay(now) + ' · ' + DAY_NAMES[now.getDay()] + ' · 共 ' + todayTasks.length + ' 项</p></div><button class="card-link" data-page="schedule">完整日程 ' + icon("i-arrow-right") + '</button></div>' +
        (todayTasks.length ? '<div class="today-list">' + todayTasks.map(t => agendaHTML(t)).join("") + "</div>" : '<div class="empty-state"><div class="empty-state__icon">' + icon("i-coffee") + '</div><h3>今天还没有安排</h3><p>给自己留白也不错，或者让 AI 帮你把本周任务排进空课时间。</p><button class="btn btn-primary btn-sm" data-action="add-task">' + icon("i-plus") + "安排一件事</button></div>") +
        '<div class="week-strip">' + weekDates.map(d => {
          const ds = toISODate(d);
          const has = state.tasks.some(t => t.placement && t.placement.date === ds && !t.archived && !t.deleted);
          return '<div class="week-day ' + (ds === todayISO ? "today" : "") + " " + (has ? "has-task" : "") + '"><small>' + DAY_NAMES[d.getDay()].replace("周", "") + '</small><strong>' + d.getDate() + "</strong></div>";
        }).join("") + "</div>" +
      "</section>" +
      '<aside class="overview-side">' +
        '<div class="insight-panel"><div class="insight-head"><span class="insight-spark">' + icon("i-sparkles") + '</span><div><strong>AI 时间洞察</strong><span>基于课表与任务动态生成</span></div></div><p class="insight-quote">' + insight + '</p><div class="insight-actions"><button class="btn btn-primary btn-sm" data-action="open-ai">生成周计划</button><button class="btn btn-secondary btn-sm" data-page="schedule">查看空课</button></div><p class="insight-disclaimer">' + icon("i-shield") + "AI 结果仅供参考，时间与优先级可随时调整</p></div>" +
        '<section class="card deadline-card"><div class="card-head"><div><h3 class="card-title">' + icon("i-alert", "icon--sm") + '即将截止</h3><p class="card-sub">按截止时间排序</p></div><button class="card-link" data-page="tasks">全部任务 ' + icon("i-arrow-right") + "</button></div>" +
          (upcoming.length ? '<div class="deadline-list">' + upcoming.slice(0, 3).map(t => {
            const d = dueDate(t);
            return '<div class="deadline-item"><div class="deadline-date"><strong>' + String(d.getDate()).padStart(2, "0") + '</strong><small>' + (d.getMonth() + 1) + '月</small></div><div class="deadline-info"><strong>' + escapeHTML(t.name) + '</strong><small>' + escapeHTML(t.type) + ' · ' + fmtDuration(t.duration) + '</small></div><span class="deadline-when">' + escapeHTML(dueLabel(t)) + '</span></div>';
          }).join("") + "</div>" : '<div class="empty-state" style="padding:24px 8px"><p>没有即将截止的任务。</p></div>') +
        '</section></aside></div>' +
      '<div class="source-strip"><span class="source-strip__icon">' + icon("i-database") + '</span><div class="source-strip__copy"><strong>内容有出处，AI 有边界</strong><p>课表、校园生活、餐饮休闲与 AI 能力均有明确来源；点评指数为综合参考评分，不冒充平台数据。</p></div><button class="btn btn-secondary btn-sm" data-page="sources">' + icon("i-external") + '查看信息来源</button></div></div>';
  }
  function statCard(iconName, color, label, value, trend, percent) {
    return '<div class="stat-card"><span class="stat-icon ' + color + '">' + icon(iconName) + '</span><div class="stat-copy"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div><div class="stat-trend' + (trend.indexOf("暂无") === 0 ? " neutral" : "") + '">' + trend + "</div></div></div>";
  }
  function agendaHTML(task) {
    const start = task.placement.start, end = task.placement.end;
    const startM = minutesOf(start), endM = minutesOf(end), nowM = now.getHours() * 60 + now.getMinutes();
    let status = task.done ? "已完成" : "待开始";
    let statusCls = "";
    if (!task.done && todayISO === task.placement.date) {
      if (nowM >= startM && nowM <= endM) { status = "进行中"; statusCls = "now"; }
      else if (nowM > endM) { status = "已过时"; }
    }
    return '<div class="agenda-item" style="--type-color:' + typeColor(task.type) + '"><div class="agenda-time">' + start + "<small>" + end + '</small></div><span class="agenda-line"></span><div class="agenda-body"><div class="agenda-title">' + escapeHTML(task.name) + (task.done ? ' <span class="badge" style="height:18px;font-size:8px;background:var(--success-soft);color:var(--success)">已完成</span>' : "") + '</div><div class="agenda-meta">' + typeBadge(task.type) + '<span class="dot"></span><span>' + fmtDuration(task.duration) + "</span>" + (task.image ? '<span class="dot"></span><span>含图片</span>' : "") + '</div></div><div class="agenda-side"><span class="agenda-status ' + statusCls + '">' + status + "</span></div></div>";
  }
  function weekNumber(d) {
    // 以秋季学期开学周（8 月最后一个周一）为第 1 教学周；春学期可在此扩展。
    const y = d.getFullYear();
    const start = new Date(y, 7, 31);
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
    if (d < start) return 1;
    return Math.max(1, Math.min(20, Math.floor((startOfDay(d) - start) / 86400000 / 7) + 1));
  }

  /* ---------- 日程表 ---------- */
  function renderSchedule() {
    const source = getScheduleSource();
    const noCourses = source.type === "empty" || !(state.classes || []).length;
    const hasTaskEvents = state.tasks.some(t => t.placement && !t.archived && !t.deleted);
    const hasSchedule = !noCourses || hasTaskEvents;
    const isEmpty = !hasSchedule;
    const sourceLabel = noCourses ? "尚未导入课表 · 0 门课程" : source.label + " · " + (source.count || state.classes.length) + " 门课程";
    const toolbar = '<div class="schedule-toolbar"><div class="sync-pill ' + (noCourses ? "empty" : "success") + '"><span class="status-dot"></span>' + escapeHTML(sourceLabel) + '</div><div class="page-actions"><button class="btn btn-secondary btn-sm" data-action="open-sync">' + icon("i-refresh") + (noCourses ? "导入课表" : "更新课表") + '</button><button class="btn btn-secondary btn-sm" data-action="open-organize">' + icon("i-sparkles") + '一键整理</button><button class="btn btn-secondary btn-sm" data-action="export">' + icon("i-download") + '导出</button>' + '<button class="btn btn-ghost btn-sm clear-schedule-btn" data-action="clear-schedule"' + (hasSchedule ? '' : ' disabled') + '>' + icon("i-trash") + '一键清理</button>' + '<button class="btn btn-primary btn-sm" data-action="add-task">' + icon("i-plus") + "添加日程</button></div></div>";
    const head = pageHead("Schedule", "日程表", "把课程、任务与生活放进同一张周计划里。", "");
    if (!ui.scheduleLoaded) {
      return head + toolbar + '<div class="loading-panel"><div class="loader"></div><h3>正在载入课表与空课时间</h3><p>' + escapeHTML(noCourses ? "空白课表；导入后会自动计算空课。" : source.label + "；正在解析本周课程。") + '</p><div class="loading-steps"><span class="loading-step done">' + icon("i-check") + '载入本周课程</span><span class="loading-step">' + icon("i-clock") + '计算空课时段</span><span class="loading-step">' + icon("i-sparkles") + '合并已有日程</span></div></div>';
    }
    const syncBanner = isEmpty ?
      '<div class="sync-banner empty"><span class="sync-banner__icon">' + icon("i-calendar") + '</span><div class="sync-banner__copy"><strong>日程表还是空的</strong><p>从 HDUHELP「课表功能 → 订阅课表」复制链接，或上传 .ics 文件。导入前不会预设任何课程。</p></div><button class="btn btn-primary btn-sm" data-action="open-sync">' + icon("i-plus") + '导入课表</button></div>' :
      noCourses ?
      '<div class="sync-banner empty"><span class="sync-banner__icon">' + icon("i-calendar") + '</span><div class="sync-banner__copy"><strong>课程表尚未导入</strong><p>任务日程已显示，但空课时间还不准确。导入课表后，AI 整理会避开你的课程。</p></div><button class="btn btn-primary btn-sm" data-action="open-sync">' + icon("i-plus") + '导入课表</button></div>' :
      '<div class="sync-banner synced"><span class="sync-banner__icon">' + icon("i-check") + '</span><div class="sync-banner__copy"><strong>已连接个人课表</strong><p>' + escapeHTML(source.term || "个人课表") + ' · ' + (source.count || state.classes.length) + ' 门课程 · ' + escapeHTML(relativeTime(source.syncedAt || new Date().toISOString())) + '更新</p></div><button class="btn btn-secondary btn-sm" data-action="open-sync">' + icon("i-refresh") + '更新课表</button></div>';
    const weekStart = addDays(startOfWeek(today), ui.weekOffset * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekTasks = state.tasks.filter(t => !t.archived && !t.deleted && t.placement && isDateInWeek(t.placement.date, weekStart)).sort((a, b) => minutesOf(a.placement.start) - minutesOf(b.placement.start));
    const displayWeek = effectiveTeachingWeek(weekStart);
    const weekClasses = state.classes.filter(c => c.day < 7 && (!c.weeks || !c.weeks.length || c.weeks.includes(displayWeek)));
    const freeChips = computeWeekFreeChips(weekStart);
    const isCurrentWeek = ui.weekOffset === 0;
    const titleRange = fmtMonthDay(weekStart) + " — " + fmtMonthDay(weekEnd);
    const toolbar2 = '<div class="calendar-topbar"><div class="calendar-title-wrap"><div><div class="calendar-title">' + (isCurrentWeek ? "本周计划" : "周计划") + '<small>' + titleRange + " · " + (isCurrentWeek ? "第 " + effectiveTeachingWeek(now) + " 教学周" : "历史 / 未来周") + '</small></div></div><div class="week-nav"><button class="icon-btn" data-action="week-prev" aria-label="上一周">' + icon("i-chevron-left") + '</button><button class="today-btn" data-action="week-today">今天</button><button class="icon-btn" data-action="week-next" aria-label="下一周">' + icon("i-chevron-right") + '</button></div></div><div style="display:flex;align-items:center;gap:9px;margin-left:auto"><div class="view-switch"><button class="' + (ui.scheduleView === "week" ? "active" : "") + '" data-action="schedule-view" data-view="week">' + icon("i-columns") + '周视图</button><button class="' + (ui.scheduleView === "list" ? "active" : "") + '" data-action="schedule-view" data-view="list">' + icon("i-list") + "清单</button></div></div></div>";
    const view = ui.scheduleView === "week" ? calendarHTML(weekStart, weekClasses, weekTasks) : scheduleListHTML(weekStart, weekClasses, weekTasks);
    const freeRow = '<div class="free-slot-row"><span>' + icon("i-sparkles") + '可排空档</span>' + (noCourses ? '<span class="free-chip empty">导入课表后自动计算空课时间</span>' : (freeChips.length ? freeChips.map(g => '<span class="free-chip">' + WEEKDAY_NAMES[(g.date.getDay() + 6) % 7] + " " + timeFromMinutes(g.start) + "–" + timeFromMinutes(g.end) + " · " + fmtDurationShort(g.minutes) + "</span>").join("") : '<span class="free-chip" style="background:var(--warning-soft);color:#8A5200">本周完整空档较少，建议手动调整</span>')) + "</div>";
    return head + toolbar + syncBanner + '<div class="schedule-toolbar" style="margin-top:-4px"><div class="sync-pill"><span class="status-dot"></span>已解析 ' + state.classes.length + ' 节课 · ' + freeChips.length + ' 段完整空档</div><span style="font-size:9.5px;color:var(--muted-2)">' + (isCurrentWeek ? '今日高亮 · 时间轴 08:00–22:00' : '查看 ' + titleRange) + '</span></div>' + freeRow + '<section class="calendar-card">' + toolbar2 + view + '<div class="calendar-legend"><div class="legend-items"><span class="legend-item"><i class="legend-dot class"></i>课程</span><span class="legend-item"><i class="legend-dot task"></i>我的任务</span><span class="legend-item"><i class="legend-dot free"></i>可排空档</span></div><span class="calendar-hint">' + icon("i-image") + '任务图片显示在方格右侧，不遮挡文字</span></div></section>';
  }
  function calendarHTML(weekStart, classes, tasks) {
    const totalH = (CAL_END - CAL_START) * PX_PER_MIN;
    const times = [];
    for (let m = CAL_START; m <= CAL_END; m += 60) times.push('<span class="cal-time" style="top:' + ((m - CAL_START) * PX_PER_MIN) + 'px">' + timeFromMinutes(m) + "</span>");
    const dayHeads = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const ds = toISODate(d);
      const todayCls = ds === todayISO ? "today" : "";
      return '<div class="cal-day-head ' + todayCls + '"><small>' + DAY_NAMES[d.getDay()] + '</small><strong>' + d.getDate() + "</strong>" + (ds === todayISO ? '<span class="today-pill">今天</span>' : "") + "</div>";
    }).join("");
    const dayCols = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i), ds = toISODate(d);
      const dow = d.getDay();
      const dayClasses = classes.filter(c => c.day === (dow === 0 ? 6 : dow - 1));
      const dayTasks = tasks.filter(t => t.placement.date === ds);
      const isToday = ds === todayISO;
      let currentLine = "";
      const nowM = now.getHours() * 60 + now.getMinutes();
      if (isToday && nowM >= CAL_START && nowM <= CAL_END) {
        currentLine = '<div class="now-line" style="top:' + ((nowM - CAL_START) * PX_PER_MIN) + 'px"><span>现在</span></div>';
      }
      return '<div class="cal-day ' + (isToday ? "today" : "") + " " + (dow === 0 || dow === 6 ? "weekend" : "") + '" data-date="' + ds + '">' + currentLine + '<div class="cal-events">' + dayClasses.map(classEventHTML).join("") + dayTasks.map(taskEventHTML).join("") + "</div></div>";
    }).join("");
    return '<div class="calendar-scroll"><div class="calendar" style="--cal-height:' + totalH + 'px"><div class="cal-head"><div class="cal-gutter">GMT+8</div><div class="cal-day-heads">' + dayHeads + '</div></div><div class="cal-body"><div class="cal-times">' + times.join("") + '</div><div class="cal-days">' + dayCols + "</div></div></div></div>";
  }
  function classEventHTML(c) {
    const top = (minutesOf(c.start) - CAL_START) * PX_PER_MIN;
    const h = (minutesOf(c.end) - minutesOf(c.start)) * PX_PER_MIN;
    const tint = CLASS_TINTS[c.tint] || CLASS_TINTS.slate;
    return '<div class="ev ev--class" style="top:' + top + "px;height:" + h + "px;--class-bg:" + tint.bg + ";--class-ink:" + tint.ink + ";--class-line:" + tint.line + '" data-action="view-class" data-class-id="' + c.id + '" title="' + escapeHTML(c.name) + " · " + escapeHTML(c.room) + '"><div class="ev-title">' + escapeHTML(c.name) + '</div><div class="ev-meta">' + escapeHTML(c.room) + " · " + escapeHTML(c.teacher) + '</div><div class="ev-time">' + icon("i-clock") + c.start + "–" + c.end + "</div></div>";
  }
  function taskEventHTML(t) {
    const top = (minutesOf(t.placement.start) - CAL_START) * PX_PER_MIN;
    const h = (minutesOf(t.placement.end) - minutesOf(t.placement.start)) * PX_PER_MIN;
    const compact = h < 72;
    const c = typeInfo(t.type);
    const hasImg = t.image && !compact;
    return '<div class="ev ev--task ' + (compact ? "ev--compact" : "") + " " + (t.done ? "is-done" : "") + '" style="top:' + top + "px;height:" + h + "px;--type-color:" + c.color + ';border-left-color:' + c.color + '" data-action="view-task" data-task-id="' + t.id + '" title="' + escapeHTML(t.name) + '"><div class="ev-copy"><div class="ev-title">' + escapeHTML(t.name) + '</div><div class="ev-meta">' + escapeHTML(t.type) + " · " + (PRIORITIES[t.priority] || "中") + '优先级</div><div class="ev-time">' + icon("i-clock") + t.placement.start + "–" + t.placement.end + "</div></div>" + (hasImg ? '<div class="ev-image"><img src="' + t.image + '" alt=""></div>' : "") + '<div class="ev-actions"><button type="button" data-action="edit-task" data-task-id="' + t.id + '" aria-label="编辑任务" title="编辑">' + icon("i-edit") + "</button></div></div>";
  }
  function scheduleListHTML(weekStart, classes, tasks) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return '<div class="schedule-list">' + days.map((d, i) => {
      const ds = toISODate(d);
      const dayClasses = classes.filter(c => c.day === i);
      const dayTasks = tasks.filter(t => t.placement.date === ds);
      const count = dayClasses.length + dayTasks.length;
      return '<div class="schedule-day-group"><div class="schedule-day-head"><strong>' + DAY_NAMES[d.getDay()] + " · " + fmtMonthDay(d) + (ds === todayISO ? ' <span class="badge" style="background:var(--primary-soft);color:var(--primary-strong);margin-left:5px">今天</span>' : "") + '</strong><span>' + (count ? count + " 项安排" : "无安排") + "</span></div>" + (count ? '<div class="schedule-day-body">' + dayClasses.map(c => '<div class="schedule-list-row"><span class="schedule-list-time">' + c.start + "–" + c.end + '</span><span class="agenda-line" style="--type-color:' + (CLASS_TINTS[c.tint] || CLASS_TINTS.slate).line + '"></span><div class="schedule-list-copy"><strong>' + escapeHTML(c.name) + "</strong><small>" + escapeHTML(c.room) + " · " + escapeHTML(c.teacher) + '</small></div><span class="badge type-badge type-other">课程</span></div>').join("") + dayTasks.map(t => '<div class="schedule-list-row"><span class="schedule-list-time">' + t.placement.start + "–" + t.placement.end + '</span><span class="agenda-line" style="--type-color:' + typeColor(t.type) + '"></span><div class="schedule-list-copy"><strong>' + escapeHTML(t.name) + "</strong><small>" + escapeHTML(t.type) + " · " + fmtDuration(t.duration) + " · " + (PRIORITIES[t.priority] || "中") + '优先级</small></div><button class="icon-action" data-action="view-task" data-task-id="' + t.id + '" aria-label="查看任务">' + icon("i-eye") + "</button></div>").join("") + "</div>" : '<div class="schedule-day-body" style="padding:13px 14px;color:var(--muted-2);font-size:10.5px">这一天还没有安排，适合留白或补一项小任务。</div>') + "</div>";
    }).join("") + "</div>";
  }

  /* ---------- 任务列表 ---------- */
  function renderTasks() {
    return pageHead("Tasks", "我的任务", "按类型、优先级与截止时间，管理每一件要做的事。", '<button class="btn btn-secondary" data-action="open-organize">' + icon("i-sparkles") + 'AI 一键整理</button><button class="btn btn-secondary" data-action="export">' + icon("i-download") + '导出日程</button><button class="btn btn-primary" data-action="add-task">' + icon("i-plus") + "添加任务</button>") +
      '<div class="task-summary">' + summaryPill("全部", state.tasks.filter(t => !t.deleted && !t.archived).length) + summaryPill("进行中", state.tasks.filter(t => !t.done && !t.archived && !t.deleted).length, "var(--primary)") + summaryPill("已完成", state.tasks.filter(t => t.done && !t.archived && !t.deleted).length, "var(--success)") + summaryPill("已归档", state.tasks.filter(t => t.archived || t.deleted).length, "var(--muted-2)") + '<span style="margin-left:auto;font-size:9.5px;color:var(--muted-2);display:flex;align-items:center;gap:5px">' + icon("i-database") + "任务数据保存在本机</span></div>" +
      taskFiltersHTML() + taskListCardHTML();
  }
  function summaryPill(label, count, color) {
    return '<span class="summary-pill"><i class="dot" style="background:' + (color || "var(--primary)") + '"></i>' + label + "<strong>" + count + "</strong></span>";
  }
  function taskFiltersHTML() {
    return '<section class="card filter-card"><div class="filter-top"><div class="search-field">' + icon("i-search") + '<input id="taskSearch" type="search" placeholder="搜索任务名称、备注…" value="' + escapeHTML(ui.taskQuery) + '"></div><select class="select-control" id="priorityFilter"><option value="all"' + (ui.taskPriority === "all" ? " selected" : "") + '>全部优先级</option><option value="high"' + (ui.taskPriority === "high" ? " selected" : "") + '>高优先级</option><option value="medium"' + (ui.taskPriority === "medium" ? " selected" : "") + '>中优先级</option><option value="low"' + (ui.taskPriority === "low" ? " selected" : "") + '>低优先级</option></select><select class="select-control" id="sortFilter"><option value="due"' + (ui.taskSort === "due" ? " selected" : "") + '>按截止时间</option><option value="priority"' + (ui.taskSort === "priority" ? " selected" : "") + '>按优先级</option><option value="created"' + (ui.taskSort === "created" ? " selected" : "") + '>按创建时间</option></select></div><div class="chip-row"><button class="chip ' + (ui.taskType === "all" ? "active" : "") + '" data-action="task-type" data-type="all">全部类型</button>' + TYPE_NAMES.map(tp => '<button class="chip ' + (ui.taskType === tp ? "active" : "") + '" data-action="task-type" data-type="' + tp + '">' + tp + '<span class="count">' + state.tasks.filter(t => !t.deleted && !t.archived && t.type === tp).length + "</span></button>").join("") + "</div></section>";
  }
  function taskListCardHTML() {
    const tab = ui.taskTab;
    let list = state.tasks.filter(t => {
      if (tab === "active") return !t.done && !t.archived && !t.deleted;
      if (tab === "done") return t.done && !t.archived && !t.deleted;
      return t.archived || t.deleted;
    });
    if (ui.taskType !== "all") list = list.filter(t => t.type === ui.taskType);
    if (ui.taskPriority !== "all") list = list.filter(t => t.priority === ui.taskPriority);
    if (ui.taskQuery.trim()) {
      const q = ui.taskQuery.trim().toLowerCase();
      list = list.filter(t => (t.name + " " + (t.notes || "") + " " + t.type).toLowerCase().includes(q));
    }
    const order = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => {
      if (ui.taskSort === "priority") return (order[a.priority] || 1) - (order[b.priority] || 1) || dueDate(a) - dueDate(b);
      if (ui.taskSort === "created") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return dueDate(a) - dueDate(b);
    });
    const counts = {
      active: state.tasks.filter(t => !t.done && !t.archived && !t.deleted).length,
      done: state.tasks.filter(t => t.done && !t.archived && !t.deleted).length,
      archived: state.tasks.filter(t => t.archived || t.deleted).length
    };
    return '<section class="card task-list-card" id="taskListCard"><div class="task-tabs"><button class="task-tab ' + (tab === "active" ? "active" : "") + '" data-action="task-tab" data-tab="active">进行中 <span>' + counts.active + '</span></button><button class="task-tab ' + (tab === "done" ? "active" : "") + '" data-action="task-tab" data-tab="done">已完成 <span>' + counts.done + '</span></button><button class="task-tab ' + (tab === "archived" ? "active" : "") + '" data-action="task-tab" data-tab="archived">归档与已删除 <span>' + counts.archived + "</span></button></div>" +
      (list.length ? '<div class="task-list">' + list.map(taskRowHTML).join("") + '</div><div class="task-list-footer"><span>显示 ' + list.length + " 项 · 按" + (ui.taskSort === "due" ? "截止时间" : ui.taskSort === "priority" ? "优先级" : "创建时间") + '排序</span><span class="link" data-action="clear-filters" style="cursor:pointer">清空筛选</span></div>' : '<div class="empty-state filter-empty"><div class="empty-state__icon">' + icon(tab === "active" ? "i-check-square" : "i-search") + '</div><h3>' + (tab === "active" ? "没有符合条件的进行中任务" : tab === "done" ? "还没有已完成的任务" : "归档区是空的") + "</h3><p>" + (tab === "active" ? "调整筛选条件，或新建一个任务开始规划。" : tab === "done" ? "完成任务后，它会出现在这里，方便你回顾。" : "完成或删除的任务会在这里保留，误删也能恢复。") + "</p>" + (tab === "active" ? '<button class="btn btn-primary btn-sm" data-action="add-task">' + icon("i-plus") + "添加任务</button>" : '<button class="btn btn-secondary btn-sm" data-action="clear-filters">查看全部任务</button>') + "</div>") + "</section>";
  }
  function toggleTaskCompletion(id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? new Date().toISOString() : null;
    t.reminded = false;
    saveState();
    renderPage();
    updateChrome();
    showToast(t.done ? "任务已完成，做得不错" : "任务已恢复为进行中", "success");
  }
  function taskRowHTML(t) {
    const isArchived = t.archived || t.deleted;
    const overdue = isOverdue(t);
    const placement = t.placement ? (t.placement.date === todayISO ? "今天 " : fmtShort(fromISODate(t.placement.date)) + " ") + t.placement.start : "未安排";
    return '<div class="task-row ' + (t.done ? "done" : "") + " " + (isArchived ? "task-row-archived" : "") + '">' +
      '<label class="task-check"' + (isArchived ? "" : ' data-action="toggle-task" data-task-id="' + t.id + '"') + '><input type="checkbox" data-task-check data-task-id="' + t.id + '" ' + (t.done ? "checked" : "") + " " + (isArchived ? "disabled" : "") + ' aria-label="完成任务"><span class="checkmark">' + icon("i-check") + "</span></label>" +
      '<div class="task-main"><div class="task-name">' + escapeHTML(t.name) + (t.source === "ai" ? '<span class="ai-mark">' + icon("i-sparkles") + "AI</span>" : "") + (t.deleted ? '<span class="badge" style="background:var(--danger-soft);color:var(--danger)">已删除</span>' : t.archived ? '<span class="badge">已归档</span>' : "") + '</div><div class="task-sub">' + typeBadge(t.type) + '<span class="dot"></span><span>' + fmtDuration(t.duration) + "</span>" + (t.notes ? '<span class="dot"></span><span>' + escapeHTML(t.notes.slice(0, 34)) + (t.notes.length > 34 ? "…" : "") + "</span>" : "") + "</div></div>" +
      '<div class="task-meta task-due-meta ' + (overdue ? "overdue" : "") + '"><strong>' + escapeHTML(dueLabel(t)) + "</strong><small>" + (overdue ? "需要尽快处理" : "截止时间") + "</small></div>" +
      '<div class="task-meta task-when-meta"><strong>' + escapeHTML(placement) + "</strong><small>已排入日程</small></div>" +
      '<div class="task-priority-cell">' + priorityBadge(t.priority) + "</div>" +
      '<div class="task-actions">' + (isArchived ? '<button type="button" class="icon-action" data-action="restore-task" data-task-id="' + t.id + '" title="恢复任务" aria-label="恢复任务">' + icon("i-refresh") + "</button>" : iconAction("i-edit", "edit-task", "编辑任务", t.id) + (t.done ? '<button type="button" class="icon-action" data-action="archive-task" data-task-id="' + t.id + '" title="归档" aria-label="归档">' + icon("i-archive") + "</button>" : iconAction("i-trash", "delete-task", "删除任务", t.id, true))) + "</div></div>";
  }
  function bindTaskFilterEvents() { /* 事件委托统一处理，保留此函数便于扩展 */ }

  /* ---------- 数据统计 ---------- */
  function renderStats() {
    const tasks = state.tasks.filter(t => !t.deleted && !t.archived);
    const done = tasks.filter(t => t.done);
    const total = tasks.length;
    const donutColors = ["#2563EB", "#0F9F6E", "#7C3AED", "#F59E0B", "#DB2777", "#64748B"];
    const totals = TYPE_NAMES.map((type, i) => ({
      type, color: donutColors[i], count: tasks.filter(t => t.type === type).length
    })).filter(x => x.count > 0);
    let accum = 0;
    const segments = totals.map(x => {
      const start = total ? accum / total * 100 : 0;
      accum += x.count;
      const end = total ? accum / total * 100 : 0;
      return x.color + " " + start.toFixed(2) + "% " + end.toFixed(2) + "%";
    }).join(",");
    const pieBg = total ? "conic-gradient(" + segments + ")" : "conic-gradient(#E2E8F0 0 100%)";
    return pageHead("Insights", "数据统计", "只保留两件最关心的事：完成了多少，任务都花在哪里。", "") +
      '<div class="stats-simple">' +
        '<section class="card stats-done-card"><div class="stats-done-top"><span class="stat-icon stats-done-icon">' + icon("i-check-square") + '</span><span class="badge type-badge type-study">全部时间</span></div><div class="stats-done-value">' + done.length + '<small>项</small></div><div class="stats-done-label">已完成任务</div><p class="stats-done-note">共 ' + total + ' 项任务，' + (total ? Math.round(done.length / total * 100) : 0) + '% 已完成。完成任务数默认为 0，完成一项才会增加。</p></section>' +
        '<section class="card stats-pie-card"><div class="card-head"><div><h3 class="card-title">' + icon("i-chart", "icon--sm") + '任务饼图</h3><p class="card-sub">按任务类型统计数量</p></div><span class="stats-total-pill">共 ' + total + ' 项</span></div>' +
          '<div class="task-pie-wrap"><div class="task-pie" style="background:' + pieBg + '"><div class="task-pie-center"><strong>' + total + '</strong><span>全部任务</span></div></div>' +
          '<div class="task-pie-legend">' + (totals.length ? totals.map(x => '<div class="task-pie-row"><i class="swatch" style="background:' + x.color + '"></i><span>' + x.type + '</span><strong>' + x.count + ' 项</strong><small>' + (total ? Math.round(x.count / total * 100) : 0) + '%</small></div>').join("") : '<div class="stats-empty">还没有任务，添加任务后会显示类型分布。</div>') + '</div></div>' +
        '</section>' +
      '</div>';
  }
  function metricCard(iconName, label, value, foot, trend, values) {
    const max = Math.max.apply(null, values);
    return '<div class="metric-card"><div class="metric-label"><span>' + label + '</span>' + icon(iconName) + '</div><div class="metric-value">' + value + '</div><div class="metric-foot"><span class="' + (trend === "up" ? "up" : "") + '">' + foot + '</span></div><div class="metric-spark">' + values.map((v, i) => '<span class="' + (i > 3 ? "hot" : "") + '" style="height:' + Math.max(8, v / max * 22) + 'px"></span>').join("") + '</div></div>';
  }
  function lineChartSVG(values) {
    const W = 560, H = 180, padX = 26, padY = 18, max = Math.max.apply(null, values.concat([1])) * 1.15;
    const stepX = (W - padX * 2) / (values.length - 1);
    const pts = values.map((v, i) => ({ x: padX + i * stepX, y: H - padY - v / max * (H - padY * 2) }));
    const path = pts.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
    const area = path + " L " + (W - padX) + " " + (H - padY) + " L " + padX + " " + (H - padY) + " Z";
    const grid = [0, 1, 2, 3].map(i => { const y = padY + i * (H - padY * 2) / 3; return '<line class="line-grid" x1="' + padX + '" y1="' + y + '" x2="' + (W - padX) + '" y2="' + y + '"/>'; }).join("");
    const labels = ["一", "二", "三", "四", "五", "六", "日"].map((d, i) => '<text class="line-label" x="' + (padX + i * stepX) + '" y="' + (H - 3) + '" text-anchor="middle">' + d + "</text>").join("");
    return '<svg class="line-chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-label="专注时长趋势"><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".3"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>' + grid + '<path class="line-area" d="' + area + '"/><path class="line-path" d="' + path + '"/>' + pts.map(p => '<circle class="line-dot" cx="' + p.x + '" cy="' + p.y + '" r="3"/>').join("") + labels + "</svg>";
  }

  /* ---------- 主题 ---------- */
  function renderThemes() {
    const current = state.theme;
    const currentName = current.id === "custom" ? "自定义主色" : (THEMES.find(t => t.id === current.id) || THEMES[0]).name;
    return pageHead("Personalize", "主题更换", "选择一种更像你的节奏。切换即时生效，设置会保存在本机。", '<button class="btn btn-secondary" data-action="theme-reset">' + icon("i-refresh") + "恢复默认</button>") +
      '<div class="theme-layout"><section class="card theme-picker"><div class="card-head" style="margin-bottom:0"><div><h3 class="card-title">' + icon("i-palette", "icon--sm") + '界面主题</h3><p class="card-sub">当前：' + currentName + '</p></div></div><div class="theme-options">' +
        THEMES.map(t => '<button class="theme-option ' + (current.id === t.id ? "active" : "") + '" data-action="theme-select" data-theme-id="' + t.id + '"><span class="theme-color-block ' + t.cls + '" style="background:' + t.color + '">' + (t.id === "mystery" ? "奶" : "Aa") + '</span><span class="theme-copy"><strong>' + t.name + '</strong><small>' + t.desc + '</small></span><span class="theme-check">' + icon("i-check") + "</span></button>").join("") +
        '<button class="theme-option ' + (current.id === "custom" ? "active" : "") + '" data-action="theme-select" data-theme-id="custom"><span class="theme-color-block" style="background:' + (current.id === "custom" ? current.color : "#0F766E") + '">自</span><span class="theme-copy"><strong>自定义主色</strong><small>用取色器定义你的强调色</small></span><span class="theme-check">' + icon("i-check") + "</span></button>" +
      '</div><div class="color-controls"><label>快速取色</label><div class="swatch-row">' + CUSTOM_SWATCHES.map(c => '<button class="swatch-btn ' + (current.id === "custom" && current.color.toLowerCase() === c.toLowerCase() ? "active" : "") + '" style="background:' + c + '" data-action="custom-color" data-color="' + c + '" aria-label="选择颜色 ' + c + '"></button>').join("") + '</div><div class="color-input-wrap"><input type="color" id="customColorInput" value="' + (current.color || "#2563EB") + '" aria-label="自定义主色"><input class="text-input" id="customColorText" value="' + escapeHTML(current.color || "#2563EB") + '" aria-label="颜色十六进制值" style="flex:1"></div></div>' +
      '<p class="theme-custom-note">主色会同步影响按钮、导航高亮、进度条与图表。深色文字和浅色背景会自动保持可读性。</p></section>' +
      '<div class="theme-preview-wrap"><div class="preview-label"><span><i class="live-dot"></i>实时预览 · 主题会立即应用</span><span>' + currentName + '</span></div>' + previewHTML() + '<section class="card theme-upload-card"><div class="card-head"><div><h3 class="card-title">' + icon("i-image", "icon--sm") + '上传主题背景</h3><p class="card-sub">支持 JPG / PNG / WebP，自动压缩后仅保存在本机。文字区域会自动加遮罩，保持可读。</p></div></div><div class="upload-box"><label class="upload-drop" for="themeUpload"><span class="upload-icon">' + icon("i-upload") + '</span><span><strong>选择一张图片</strong><small>建议横版，小于 8MB</small></span><input id="themeUpload" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>' +
        (state.theme.image ? '<div class="upload-preview"><img src="' + state.theme.image + '" alt="主题背景预览"><button class="remove-upload" data-action="remove-theme-image" aria-label="移除背景">' + icon("i-x") + "</button></div>" : '<div class="upload-preview">' + icon("i-image", "icon--lg") + "</div>") +
      '</div><div class="upload-options" style="margin-top:12px"><label class="radio-line"><input type="radio" name="themeScope" value="background" ' + (state.theme.scope !== "button" ? "checked" : "") + '>作为页面背景</label><label class="radio-line"><input type="radio" name="themeScope" value="button" ' + (state.theme.scope === "button" ? "checked" : "") + '>作为按钮纹理</label><span style="color:var(--muted-2)">背景图会叠加白色遮罩，不影响文字</span></div>' +
      '<div class="mystery-note">' + icon("i-sparkles") + '<span>选择「奶娃黄」主题后，右下角会出现可互动的奶娃立绘；它会跟随鼠标轻轻摆动，并回应点击。</span></div></section>' + naiwaProfileHTML() + '</div></div>';
  }
  function naiwaProfileHTML() {
    return '<section class="card naiwa-profile-card"><div class="naiwa-portrait"><img src="assets/naiwa.png" alt="奶娃表情包形象"><span class="naiwa-sticker">奶娃</span></div><div class="naiwa-profile-copy"><div class="naiwa-kicker">MYSTERY THEME · 奶娃档案</div><h3>奶娃 / 奶蛙</h3><p>又称“大笑奶龙”“变异奶龙”。2026 年初从 B 站、抖音走红的 AI 二创形象：黄色身体、绿色大眼、圆润又略带“抽象”的比例。它与奶龙、奶蛋等一起被网友称作“奶式家族”，表情包常见于 memecub 等梗图社区。</p><div class="tech-tags"><span class="tech-tag">黄色身体</span><span class="tech-tag">绿色大眼</span><span class="tech-tag">AI 二创</span><span class="tech-tag">抽象可爱</span></div><a class="naiwa-source" href="https://memecub.com/zh/tag/%E5%A5%B6%E5%A8%83" target="_blank" rel="noopener noreferrer">素材与网络资料：memecub 奶娃表情包 ' + icon("i-external") + '</a><p class="naiwa-legal">表情包素材版权归原作者 / 权利人所有，本原型仅用于非商业主题演示。</p></div></section>';
  }
  function previewHTML() {
    return '<div class="browser-frame"><div class="browser-bar"><i class="browser-dot"></i><i class="browser-dot"></i><i class="browser-dot"></i><div class="browser-url">' + icon("i-lock") + 'www.myhduschedule.com</div></div><div class="preview-app"><div class="preview-sidebar"><div class="preview-brand"><img src="assets/logo.svg" alt=""><strong>HDU 日程表</strong></div><div class="preview-nav active">' + icon("i-grid") + '概览</div><div class="preview-nav">' + icon("i-calendar") + '日程表</div><div class="preview-nav">' + icon("i-check-square") + '任务</div><div class="preview-nav">' + icon("i-chart") + '统计</div><div class="preview-ai">' + icon("i-sparkles") + 'AI 智能排版</div></div><div class="preview-main"><div class="preview-head"><div><h4>把这一周，安排得刚刚好</h4><p>周四 · 11月19日 · 第 12 教学周</p></div><span class="preview-pill">AI 帮我安排</span></div><div class="preview-stats"><div class="preview-stat"><span>今日任务</span><strong>3</strong><div class="mini-bar"><i style="width:68%"></i></div></div><div class="preview-stat"><span>本周专注</span><strong>6.3h</strong><div class="mini-bar"><i style="width:54%"></i></div></div><div class="preview-stat"><span>完成率</span><strong>72%</strong><div class="mini-bar"><i style="width:72%"></i></div></div></div><div class="preview-cal"><div class="preview-cal-head"><span>本周计划</span><span>11/16 – 11/22</span></div><div class="preview-grid">' + ["一", "二", "三", "四", "五", "六", "日"].map(d => '<div class="preview-grid-head">' + d + '</div>').join("") + Array.from({ length: 14 }, (_, i) => '<div class="preview-cell ' + (i === 9 ? "hot" : (i === 3 || i === 12 ? "event" : "")) + '"></div>').join("") + '</div></div></div></div></div>';
  }

  /* ---------- 休闲时间 ---------- */
  function renderLeisure() {
    const nextFree = findNextFreeBlock(60);
    const messages = ensureChat();
    const places = filteredPlaces(ui.leisureCampus, ui.leisureRange, ui.leisureCategory);
    const discovery = places.slice(0, 4);
    const scope = ui.leisureCampus === "全部" ? "全部校区" : ui.leisureCampus + "校区";
    const recs = (state.userPlaces && state.userPlaces.recommend) || [];
    const avoids = (state.userPlaces && state.userPlaces.avoid) || [];
    const categories = ["全部", "食堂", "咖啡", "散步", "自习", "夜宵", "景点", "人文", "商圈", "商场", "面食"];
    const campusButtons = ["下沙", "绍兴", "全部"].map(c => '<button class="segment ' + (ui.leisureCampus === c ? "active" : "") + '" data-action="leisure-campus" data-campus="' + c + '">' + (c === "全部" ? "全部" : c + "校区") + "</button>").join("");
    const rangeOptions = [1, 3, 5, 10, 50].map(n => '<option value="' + n + '"' + (Number(ui.leisureRange) === n ? " selected" : "") + ">" + (n === 50 ? "全城" : n + " km") + "</option>").join("");
    const categoryOptions = categories.map(c => '<option value="' + c + '"' + (ui.leisureCategory === c ? " selected" : "") + ">" + c + "</option>").join("");
    const discoveryHTML = discovery.length ? '<div class="discovery-grid">' + discovery.map(recCardHTML).join("") + "</div>" : '<div class="empty-state" style="padding:28px 18px"><div class="empty-state__icon">' + icon("i-coffee") + '</div><h3>这个范围里还没有推荐</h3><p>试试放宽距离、切换校区，或自己推荐一家。</p><button class="btn btn-secondary btn-sm" data-action="open-place-recommend">' + icon("i-plus") + "推荐一家</button></div>";
    return pageHead("Break time", "休闲时间", "不只下沙：下沙、绍兴校区周边与全城灵感，也支持你自己推荐和避雷。", '<button class="btn btn-secondary btn-sm" data-action="reset-chat">' + icon("i-refresh") + "重新推荐</button>") +
      '<div class="leisure-filter"><div class="leisure-filter__group"><span class="filter-label">' + icon("i-map-pin") + '校区</span><div class="segmented">' + campusButtons + '</div></div><div class="leisure-filter__group"><span class="filter-label">' + icon("i-walk") + '距离</span><select class="select-control" id="leisureRange">' + rangeOptions + '</select></div><div class="leisure-filter__group"><span class="filter-label">' + icon("i-coffee") + '类型</span><select class="select-control" id="leisureCategory">' + categoryOptions + '</select></div><div class="leisure-filter__meta">' + icon("i-star") + '综合参考评分 · 可自己补充</div></div>' +
      '<section class="discovery-section"><div class="discovery-head"><div><h2>' + escapeHTML(scope) + ' · ' + (Number(ui.leisureRange) === 50 ? "全城" : ui.leisureRange + " km") + '内</h2><p>' + (ui.leisureCategory === "全部" ? "按评分与距离排序" : "筛选「" + escapeHTML(ui.leisureCategory) + "」") + ' · 共 ' + places.length + ' 个地点</p></div><div class="discovery-actions"><button class="btn btn-secondary btn-sm" data-action="open-place-recommend">' + icon("i-plus") + '推荐一家</button><button class="btn btn-ghost btn-sm avoid-btn" data-action="open-place-avoid">' + icon("i-x") + '避雷</button></div></div>' + discoveryHTML + '</section>' +
      '<div class="leisure-layout"><section class="chat-card"><div class="chat-head"><div class="chat-avatar">' + icon("i-sparkles") + '</div><div class="chat-head-copy"><strong>AI 休闲搭子</strong><small>结合你的日程、校区与空档 · 在线</small></div><div class="chat-head-actions"><button class="icon-btn" data-page="sources" aria-label="查看信息来源" title="查看信息来源">' + icon("i-database") + '</button></div></div><div class="chat-scroll" id="chatScroll">' + messages.map(messageHTML).join("") + (ui.chatTyping ? '<div class="message message--ai"><div class="message-avatar">' + icon("i-sparkles") + '</div><div class="message-body"><div class="message-meta">AI 休闲搭子 · 正在想</div><div class="message-bubble"><span class="typing"><span></span><span></span><span></span></span></div></div></div>' : "") + '</div><div class="chat-composer"><div class="quick-chips"><button class="quick-chip" data-action="quick-chip" data-text="想找近一点的、人均 20 元以内的晚饭">近一点 · 人均 20 内</button><button class="quick-chip" data-action="quick-chip" data-text="想喝杯咖啡，最好能安静坐一会儿">咖啡 · 安静坐坐</button><button class="quick-chip" data-action="quick-chip" data-text="想饭后散步，最好离学校不太远">散步 · 不太远</button><button class="quick-chip" data-action="quick-chip" data-text="今天有点累，想吃点辣的">想吃点辣的</button><button class="quick-chip" data-action="quick-chip" data-text="绍兴校区附近有什么推荐？">绍兴 · 附近</button></div><div class="composer-box"><textarea class="composer-input" id="leisureInput" rows="1" placeholder="说说你的口味、预算、距离或此刻的心情…" aria-label="输入休闲需求"></textarea><button class="composer-send" id="leisureSend" data-action="chat-send" aria-label="发送">' + icon("i-send") + '</button></div><p class="chat-note">' + icon("i-shield") + "推荐指数为综合参考评分，不代表大众点评 / 美团官方数据。AI 推荐仅供参考。</p></div></section>" +
      '<aside class="leisure-side"><section class="card context-card"><div class="context-location">' + icon("i-map-pin") + escapeHTML(scope) + ' · ' + (discovery[0] ? escapeHTML(discovery[0].area || "附近") : "未选择区域") + '</div><div class="context-row"><span>最近空档</span><strong class="free">' + (nextFree ? escapeHTML(nextFree.label) : "本周空档较少") + '</strong></div><div class="context-row"><span>可用时长</span><strong>' + (nextFree ? fmtDuration(nextFree.minutes) : "—") + '</strong></div><div class="context-row"><span>推荐范围</span><strong>' + (Number(ui.leisureRange) === 50 ? "全城" : ui.leisureRange + " km") + ' · ' + (ui.leisureCategory === "全部" ? "全类型" : escapeHTML(ui.leisureCategory)) + '</strong></div><div class="context-row"><span>综合预算</span><strong>¥0 – ¥90</strong></div><div class="member-note">' + icon("i-clock") + '推荐会优先匹配你的空档时长，避免吃到一半赶去上课。</div></section>' +
      '<section class="card user-places-card"><div class="card-head"><div><h3 class="card-title">' + icon("i-star", "icon--sm") + '我的推荐与避雷</h3><p class="card-sub">只保存在本机，可随时删除</p></div><button class="card-link" data-action="open-place-recommend">' + icon("i-plus") + '添加</button></div>' +
      (recs.length ? '<div class="user-place-list">' + recs.map(p => '<div class="user-place"><span class="user-place__pin">' + icon("i-thumb-up") + '</span><div><strong>' + escapeHTML(p.name) + '</strong><small>' + escapeHTML(p.campus || "") + ' · ' + escapeHTML(p.category || "") + ' · ' + escapeHTML(p.reason || "") + '</small></div><button class="icon-action" data-action="delete-place" data-place-kind="recommend" data-place-id="' + p.id + '" aria-label="删除推荐">' + icon("i-trash") + '</button></div>').join("") + '</div>' : '<p class="user-place-empty">还没有我的推荐。吃到好吃的、发现好逛的地方，可以加进来。</p>') +
      (avoids.length ? '<div class="avoid-list"><div class="avoid-title">' + icon("i-x") + '避雷清单</div>' + avoids.map(p => '<div class="user-place avoid"><span class="user-place__pin">' + icon("i-alert") + '</span><div><strong>' + escapeHTML(p.name) + '</strong><small>' + escapeHTML(p.reason || "已加入避雷") + '</small></div><button class="icon-action" data-action="delete-place" data-place-kind="avoid" data-place-id="' + p.id + '" aria-label="删除避雷">' + icon("i-trash") + '</button></div>').join("") + '</div>' : '<button class="avoid-add" data-action="open-place-avoid">' + icon("i-x") + '添加避雷地点</button>') +
      '</section><div class="source-note"><strong>' + icon("i-database") + '数据口径说明</strong>推荐指数综合了人均消费、距离、品类与公开评价信息，是产品内的「综合参考评分」，并非平台官方评分。查看完整 <a href="#sources" data-page="sources">信息来源</a>。' + (recs.length ? '<br><br>你上传的推荐会参与 AI 推荐；避雷地点会自动从推荐中排除。' : '') + '</div><div class="card leisure-tip"><strong>今天的小建议</strong>如果只有 1 小时，优先选 3 km 内的店；如果有一个下午，下沙可以去金沙湖，绍兴可以去东湖或古城慢慢走。</div></aside></div>';
  }
  function allPlaces() {
    const user = (state.userPlaces && state.userPlaces.recommend) || [];
    return Object.values(RECOMMENDATIONS).concat(user).filter(Boolean);
  }

  function placeKm(place) {
    const n = Number(place && place.km);
    return Number.isFinite(n) ? n : 99;
  }

  function filteredPlaces(campus, maxKm, category) {
    const avoid = new Set(((state.userPlaces && state.userPlaces.avoid) || []).map(x => String(x.name || "").trim().toLowerCase()).filter(Boolean));
    return allPlaces().filter(p => {
      if (!p || !p.name) return false;
      if (avoid.has(String(p.name).trim().toLowerCase())) return false;
      if (campus && campus !== "全部" && p.campus !== campus) return false;
      if (maxKm && placeKm(p) > Number(maxKm)) return false;
      if (category && category !== "全部" && p.category !== category) return false;
      return true;
    }).sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || placeKm(a) - placeKm(b));
  }

  function resetLeisureChat(message) {
    state.chat = [];
    ensureChat();
    saveState();
    if (message) showToast(message, "info");
  }

  function ensureChat() {
    if (!Array.isArray(state.chat) || !state.chat.length) {
      const next = findNextFreeBlock(60);
      const where = next ? next.label : "本周的某个空档";
      const places = filteredPlaces(ui.leisureCampus, ui.leisureRange, "全部").slice(0, 3);
      const scope = ui.leisureCampus === "全部" ? "全部校区" : ui.leisureCampus + "校区";
      const text = "我看了下你的课表，最近的完整空档是 <strong>" + escapeHTML(where) + "</strong>。" +
        (places.length ? "在<strong>" + scope + " · " + ui.leisureRange + " km</strong>范围内，我先在上方整理了 " + places.length + " 个适合现在去的地方，也支持你自己推荐或避雷。" : "当前筛选范围内没有可推荐的地点，可以放宽距离或切换校区。");
      state.chat = [{
        id: uid("msg"), role: "ai", createdAt: new Date().toISOString(),
        text: text, cards: []
      }];
      saveState();
    }
    return state.chat;
  }
  function messageHTML(m) {
    if (m.role === "user") {
      return '<div class="message message--user"><div class="message-avatar">' + escapeHTML(initials(state.user ? state.user.name : "我")) + '</div><div class="message-body"><div class="message-meta">你 · ' + relativeTime(m.createdAt) + '</div><div class="message-bubble">' + escapeHTML(m.text).replace(/\n/g, "<br>") + "</div></div></div>";
    }
    const available = new Map(filteredPlaces(ui.leisureCampus, ui.leisureRange, "全部").map(p => [p.id, p]));
    const cards = (m.cards || []).map(id => available.get(id)).filter(Boolean);
    return '<div class="message message--ai"><div class="message-avatar">' + icon("i-sparkles") + '</div><div class="message-body"><div class="message-meta">AI 休闲搭子 · ' + relativeTime(m.createdAt) + '</div><div class="message-bubble">' + m.text + "</div>" + (cards.length ? '<div class="recommendation-grid">' + cards.map(recCardHTML).join("") + "</div>" : "") + "</div></div>";
  }
  function recCardHTML(r) {
    if (!r) return "";
    const rating = Number(r.rating) || 0;
    return '<button class="rec-card" data-action="rec-detail" data-rec-id="' + r.id + '"><div class="rec-image"><img src="' + (r.image || "assets/leisure-city.svg") + '" alt="' + escapeHTML(r.name) + '"></div><div class="rec-body"><div class="rec-title">' + escapeHTML(r.name) + (r.source === "user" ? ' <span class="rec-user">我推荐</span>' : "") + '</div><div class="rec-meta"><span class="rating">' + icon("i-star") + (rating ? rating.toFixed(1) : "新") + '</span><span>·</span><span>' + escapeHTML(r.campus || "") + '</span><span>·</span><span>' + escapeHTML(r.distance || (placeKm(r) + " km")) + '</span></div><div class="rec-reason">' + escapeHTML(r.reason) + "</div></div></button>";
  }
  function sendLeisure(text) {
    if (ui.chatTyping) return;
    const trimmed = String(text || "").trim();
    if (!trimmed) { showToast("先告诉我你的偏好，比如“想吃辣、人均 20”", "info"); return; }
    ensureChat();
    if (/绍兴|越城|皋埠/.test(trimmed)) { ui.leisureCampus = "绍兴"; if (Number(ui.leisureRange) < 10) ui.leisureRange = 10; }
    else if (/下沙|钱塘/.test(trimmed)) { ui.leisureCampus = "下沙"; }
    state.chat.push({ id: uid("msg"), role: "user", text: trimmed, createdAt: new Date().toISOString() });
    ui.chatTyping = true;
    saveState();
    renderPage();
    setTimeout(() => {
      const reply = leisureReply(trimmed);
      state.chat.push({ id: uid("msg"), role: "ai", text: reply.text, cards: reply.cards, createdAt: new Date().toISOString() });
      ui.chatTyping = false;
      saveState();
      if (ui.currentPage === "leisure") renderPage();
    }, 980);
  }
  function leisureReply(text) {
    const t = text.toLowerCase();
    const next = findNextFreeBlock(45);
    const timeNote = next ? "你最近的空档是 <strong>" + escapeHTML(next.label) + "</strong>，时间上完全来得及。" : "你可以先看下这周的课表空档，再决定去多远。";
    const scope = ui.leisureCampus === "全部" ? "全部校区" : ui.leisureCampus + "校区";
    const pool = filteredPlaces(ui.leisureCampus, ui.leisureRange, "全部");
    if (!pool.length) {
      return { text: timeNote + " 但在<strong>" + scope + " · " + ui.leisureRange + " km</strong>内暂时没有符合条件的地点。可以放宽距离、切换校区，或自己推荐一家。", cards: [] };
    }
    const pick = (predicate, count = 2) => {
      const preferred = pool.filter(predicate);
      const list = [...preferred, ...pool].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
      return list.slice(0, count).map(p => p.id);
    };
    const intro = "按<strong>" + scope + " · " + ui.leisureRange + " km</strong>筛选，并已排除你的避雷清单。";
    if (/辣|川|火锅|重口|冒菜/.test(t)) {
      return { text: timeNote + intro + " 想吃辣的话，我会优先挑口味更重、出餐更快的地方；如果没有合适的，也会退回到附近评分最高的选择。", cards: pick(p => /辣|川|面食|夜宵/.test((p.name || "") + (p.category || "") + (p.tags || []).join(" "))) };
    }
    if (/咖啡|安静|自习|坐坐|插座|学习/.test(t)) {
      return { text: timeNote + intro + " 想安静坐一会儿，优先看咖啡馆与自习空间；前者适合慢慢整理思路，后者更适合长时间专注。", cards: pick(p => /咖啡|自习|图书/.test((p.category || "") + (p.name || "") + (p.tags || []).join(" "))) };
    }
    if (/散步|走|湖|公园|透气|累|景点/.test(t)) {
      return { text: timeNote + intro + " 想透气的话，优先推荐公园、湖边和古城步道；如果不想走远，也会给一个校区周边的轻量选择。", cards: pick(p => /散步|景点|人文|公园|湖/.test((p.category || "") + (p.name || ""))) };
    }
    if (/便宜|预算|20|15|省|平价/.test(t)) {
      return { text: timeNote + intro + " 预算优先的话，我会优先找校内食堂、平价小店和免费地点。", cards: pick(p => /平价|食堂|免费/.test((p.tags || []).join(" ") + (p.price || ""))) };
    }
    if (/近|距离|校内|步行|快/.test(t)) {
      return { text: timeNote + intro + " 只看距离的话，我按由近到远排序，优先给步行可达的选项。", cards: pool.slice().sort((a, b) => placeKm(a) - placeKm(b)).slice(0, 2).map(p => p.id) };
    }
    if (/夜宵|晚上|烧烤|室友/.test(t)) {
      return { text: timeNote + intro + " 晚上想热闹一点，可以看夜市、商圈和营业到较晚的餐饮；如果只想快速解决，也有更省时间的选择。", cards: pick(p => /夜宵|食堂|商圈|商场/.test((p.category || "") + (p.name || ""))) };
    }
    if (/绍兴|越城|皋埠/.test(t)) {
      return { text: timeNote + " 已切换到绍兴校区的推荐池。绍兴校区的优点是校内食堂和皋埠商圈都比较近，想走远一点还可以去东湖或古城。", cards: filteredPlaces("绍兴", ui.leisureRange, "全部").slice(0, 3).map(p => p.id) };
    }
    return { text: timeNote + intro + " 我先按“距离、评分、当前空档”筛了这几个；你也可以补充口味、预算或想做的事情，我会继续缩小范围。", cards: pool.slice(0, 3).map(p => p.id) };
  }

  function openPlaceModal(kind) {
    if (!state.user) { requireAuth(() => openPlaceModal(kind)); return; }
    ui.placeKind = kind;
    ui.placeDraftImage = "";
    const isAvoid = kind === "avoid";
    const campusOptions = ["下沙", "绍兴", "其他"].map(c => '<option value="' + c + '">' + (c === "其他" ? "其他区域" : c + "校区") + "</option>").join("");
    const cats = isAvoid ? ["餐饮", "咖啡", "景点", "商场", "其他"] : ["食堂", "咖啡", "散步", "自习", "夜宵", "景点", "人文", "商圈", "商场", "面食", "其他"];
    const html = '<div class="modal modal--wide" role="dialog" aria-modal="true" aria-label="' + (isAvoid ? "添加避雷" : "推荐一家") + '">' +
      modalHeader(isAvoid ? "Avoid list" : "My recommendation", isAvoid ? "添加避雷地点" : "推荐一家", isAvoid ? "你踩过的坑，会从后续 AI 推荐中自动排除。" : "分享一个你去过、觉得值得的地方，AI 会参考它继续推荐。") +
      '<div class="modal-body"><div class="form-grid">' +
        '<div class="field full"><label for="placeName">地点名称</label><input class="text-input" id="placeName" placeholder="例如：绍味堂、东湖景区"><span class="form-error" id="placeNameError">请填写地点名称</span></div>' +
        '<div class="field"><label for="placeCampus">校区 / 区域</label><select class="select-control" id="placeCampus" style="width:100%">' + campusOptions + '</select></div>' +
        '<div class="field"><label for="placeCategory">类型</label><select class="select-control" id="placeCategory" style="width:100%">' + cats.map(c => '<option>' + c + "</option>").join("") + '</select></div>' +
        '<div class="field"><label for="placeKm">距离（km）</label><input class="text-input" id="placeKm" type="number" min="0" max="50" step="0.1" value="1.0"></div>' +
        '<div class="field"><label for="placePrice">人均预算</label><input class="text-input" id="placePrice" placeholder="例如：¥25 / 免费"></div>' +
        (isAvoid ? '' : '<div class="field"><label for="placeRating">你的评分（1–5）</label><input class="text-input" id="placeRating" type="number" min="1" max="5" step="0.1" value="4.5"></div>') +
        '<div class="field full"><label for="placeReason">' + (isAvoid ? "避雷原因" : "推荐理由") + '</label><textarea class="textarea-input" id="placeReason" placeholder="' + (isAvoid ? "例如：排队太久、环境嘈杂、价格不透明…" : "例如：靠窗有插座、牛肉面分量足、傍晚落日很好看…") + '"></textarea></div>' +
        '<div class="field full"><label>地点图片 <span class="optional">选填</span></label><div class="image-upload-field"><div class="image-preview-mini" id="placeImagePreview">' + icon("i-image") + '</div><label class="file-btn" for="placeImage">' + icon("i-upload") + '上传图片</label><input id="placeImage" type="file" accept="image/png,image/jpeg,image/webp" hidden><span class="file-name" id="placeFileName">JPG / PNG / WebP</span></div></div>' +
      '</div><div class="member-note" style="margin-top:12px">' + icon("i-shield") + (isAvoid ? "避雷内容只保存在本机，会参与 AI 过滤，不会对外公开。" : "推荐内容只保存在本机，会参与 AI 推荐；图片不会上传。") + '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-secondary" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="place-save">' + icon("i-check") + (isAvoid ? "保存避雷" : "保存推荐") + "</button></div></div>";
    openModal(html, { focus: "#placeName" });
  }

  function savePlace() {
    const kind = ui.placeKind === "avoid" ? "avoid" : "recommend";
    const name = document.getElementById("placeName")?.value.trim() || "";
    const campus = document.getElementById("placeCampus")?.value || "下沙";
    const category = document.getElementById("placeCategory")?.value || "其他";
    const km = Number(document.getElementById("placeKm")?.value) || 0;
    const price = document.getElementById("placePrice")?.value.trim() || "—";
    const rating = Number(document.getElementById("placeRating")?.value) || 0;
    const reason = document.getElementById("placeReason")?.value.trim() || "";
    if (!name) { showToast("请填写地点名称", "error"); document.getElementById("placeName")?.focus(); return; }
    if (km < 0 || km > 50) { showToast("距离请填写 0–50 km", "error"); return; }
    if (!state.userPlaces) state.userPlaces = { recommend: [], avoid: [] };
    state.userPlaces[kind].push({
      id: uid("place"), name, campus, category, km, distance: km + " km", price,
      rating: kind === "avoid" ? 0 : Math.max(1, Math.min(5, rating || 4)),
      reason: reason || (kind === "avoid" ? "已加入避雷" : "我的私藏推荐"),
      image: ui.placeDraftImage || "assets/leisure-city.svg",
      tags: kind === "avoid" ? ["避雷"] : ["我的推荐"], source: "user"
    });
    saveState();
    closeModal();
    renderPage();
    showToast(kind === "avoid" ? "已加入避雷清单，后续推荐会自动排除" : "已添加推荐，AI 会参考你的选择", "success");
  }

  function deletePlace(kind, id) {
    requireAuth(() => {
      if (!state.userPlaces || !state.userPlaces[kind]) return;
      const item = state.userPlaces[kind].find(x => x.id === id);
      if (!item) return;
      openConfirm({
        title: kind === "avoid" ? "移除避雷地点？" : "删除这条推荐？",
        message: "「" + escapeHTML(item.name) + "」将从本机列表中移除。",
        confirmText: "确认移除", danger: true,
        onConfirm: () => { state.userPlaces[kind] = state.userPlaces[kind].filter(x => x.id !== id); saveState(); renderPage(); showToast("已移除", "success"); }
      });
    });
  }

  /* ---------- 通知中心 ---------- */
  function renderNotifications() {
    const unread = state.notifications.filter(n => !n.read).length;
    let list = state.notifications.slice();
    if (ui.notifFilter === "unread") list = list.filter(n => !n.read);
    if (ui.notifFilter === "ai") list = list.filter(n => n.type === "ai");
    if (ui.notifFilter === "reminder") list = list.filter(n => n.type === "reminder");
    if (ui.notifFilter === "system") list = list.filter(n => n.type === "system" || n.type === "leisure");
    return pageHead("Inbox", "通知中心", unread ? "有 " + unread + " 条未读消息，别错过重要的截止提醒。" : "所有消息都已读，保持清爽。", '<button class="btn btn-secondary" data-action="mark-all-read">' + icon("i-check") + "全部已读</button>") +
      '<section class="card notification-card"><div class="notification-toolbar"><div class="filter-pills"><button class="filter-pill ' + (ui.notifFilter === "all" ? "active" : "") + '" data-action="notif-filter" data-filter="all">全部 <span class="count">' + state.notifications.length + '</span></button><button class="filter-pill ' + (ui.notifFilter === "unread" ? "active" : "") + '" data-action="notif-filter" data-filter="unread">未读 <span class="count">' + unread + '</span></button><button class="filter-pill ' + (ui.notifFilter === "reminder" ? "active" : "") + '" data-action="notif-filter" data-filter="reminder">截止提醒</button><button class="filter-pill ' + (ui.notifFilter === "ai" ? "active" : "") + '" data-action="notif-filter" data-filter="ai">AI 排程</button><button class="filter-pill ' + (ui.notifFilter === "system" ? "active" : "") + '" data-action="notif-filter" data-filter="system">系统</button></div><span style="font-size:9.5px;color:var(--muted-2)">站内通知 · 邮件提醒为演示模式</span></div>' +
      (list.length ? '<div class="notification-list">' + list.map(n => '<button class="notification-row ' + (!n.read ? "unread" : "") + '" data-action="read-notification" data-notification-id="' + n.id + '"><span class="notification-icon ' + (n.type || "system") + '">' + icon(n.type === "ai" ? "i-sparkles" : n.type === "reminder" ? "i-bell" : n.type === "leisure" ? "i-coffee" : "i-message") + '</span><span class="notification-body"><strong>' + escapeHTML(n.title) + '</strong><p>' + escapeHTML(n.body) + '</p></span><span class="notification-time">' + relativeTime(n.createdAt) + "</span>" + (n.read ? "" : '<i class="unread-dot"></i>') + "</button>").join("") + "</div>" : '<div class="empty-state filter-empty"><div class="empty-state__icon">' + icon("i-bell") + '</div><h3>这里暂时没有消息</h3><p>新的截止提醒、AI 排程结果和系统通知会出现在这里。</p><button class="btn btn-secondary btn-sm" data-action="notif-filter" data-filter="all">查看全部消息</button></div>') + "</section>";
  }

  /* ---------- 个人中心 ---------- */
  function renderProfile() {
    const p = state.profile;
    const guest = !state.user;
    return pageHead("Profile", "个人中心", "管理你的资料、提醒偏好与通知渠道。", guest ? '<button class="btn btn-primary" data-action="open-login">' + icon("i-user") + "登录 / 注册</button>" : "") +
      (guest ? '<div class="source-note" style="margin-bottom:14px;display:flex;align-items:center;gap:9px"><strong style="margin:0">' + icon("i-info") + '演示模式</strong><span>当前设置修改只保存在本机，登录后可绑定账号。保存与提醒需要登录。</span><button class="btn btn-primary btn-sm" data-action="open-login" style="margin-left:auto">立即登录</button></div>' : "") +
      '<div class="profile-hero">' + avatarHTML(p, "avatar--lg") + '<div class="profile-hero-copy"><h2>' + escapeHTML(p.nickname || (state.user ? state.user.name : "同学")) + '</h2><p>' + (([p.major, p.grade].filter(Boolean).join(" · ")) || "完善专业与年级") + (state.user ? ' · 已登录' : ' · 未登录') + '</p><div class="member-note" style="display:inline-flex;margin-top:6px">' + icon("i-mail") + (state.user ? escapeHTML(state.user.email) : "登录后绑定邮箱，开启截止提醒") + '</div></div><div class="profile-hero-actions"><label class="btn btn-secondary btn-sm" for="avatarUpload">' + icon("i-image") + '更换头像</label><input id="avatarUpload" type="file" accept="image/png,image/jpeg,image/webp" hidden>' + (state.user ? '<button class="btn btn-ghost btn-sm" data-action="logout">' + icon("i-logout") + '退出</button>' : "") + '</div></div>' +
      '<div class="profile-grid"><div><section class="card profile-card"><div class="card-head"><div><h3 class="card-title">基本资料</h3><p class="card-sub">这些信息只用于界面展示与个性化</p></div></div><div class="form-grid"><div class="field"><label for="profileName">昵称</label><input class="text-input" id="profileName" value="' + escapeHTML(p.nickname || "") + '" placeholder="怎么称呼你"></div><div class="field"><label for="profileMajor">专业</label><input class="text-input" id="profileMajor" value="' + escapeHTML(p.major || "") + '" placeholder="填写你的专业"></div><div class="field"><label for="profileGrade">年级</label><select class="select-control" id="profileGrade" style="width:100%"><option value="">未选择</option><option' + (p.grade === "2024级" ? " selected" : "") + '>2024级</option><option' + (p.grade === "2025级" ? " selected" : "") + '>2025级</option><option' + (p.grade === "2023级" ? " selected" : "") + '>2023级</option><option' + (p.grade === "2026级" ? " selected" : "") + '>2026级</option></select></div><div class="field"><label for="profileEmail">邮箱</label><input class="text-input" id="profileEmail" value="' + escapeHTML(p.email || (state.user ? state.user.email : "")) + '" placeholder="未绑定" readonly title="请通过绑定按钮完成邮箱验证"></div></div><div class="form-actions"><button class="btn btn-primary" data-action="profile-save">保存资料</button></div></section>' +
      '<section class="card profile-card"><div class="card-head"><div><h3 class="card-title">提醒偏好</h3><p class="card-sub">日程将至时，通过站内或邮件提醒你</p></div><label class="switch ' + (p.reminders ? "on" : "") + '" data-action="toggle-reminders" role="switch" aria-checked="' + p.reminders + '" tabindex="0" aria-label="提醒开关"></label></div><div class="preference-row"><div class="preference-copy"><strong>日程提醒</strong><small>在任务开始前推送提醒，避免错过安排</small></div><div class="preference-inline">提前 <select class="select-control" id="reminderLead"><option value="10"' + (p.lead === 10 ? " selected" : "") + '>10 分钟</option><option value="30"' + (p.lead === 30 ? " selected" : "") + '>30 分钟</option><option value="60"' + (p.lead === 60 ? " selected" : "") + '>1 小时</option><option value="120"' + (p.lead === 120 ? " selected" : "") + '>2 小时</option></select></div></div><div class="preference-row"><div class="preference-copy"><strong>通知渠道</strong><small>可同时开启，站内消息始终保留</small></div></div><div class="channel-row"><label class="channel-option"><input type="checkbox" id="channelInApp" ' + (p.channels.inApp ? "checked" : "") + '>站内通知</label><label class="channel-option"><input type="checkbox" id="channelEmail" ' + (p.channels.email ? "checked" : "") + '>邮件提醒</label></div><div class="preference-row" style="margin-top:7px"><div class="preference-copy"><strong>绑定邮箱</strong><small>' + (p.email || (state.user ? state.user.email : "尚未绑定，无法接收邮件提醒")) + '</small></div><button class="btn btn-secondary btn-sm" data-action="bind-email">' + icon("i-mail") + (p.email || (state.user && state.user.email) ? "更换" : "绑定") + '</button></div><div class="form-actions"><button class="btn btn-secondary btn-sm" data-action="test-reminder">' + icon("i-send") + '发送测试提醒</button></div></section>' +
      '<section class="card profile-card danger-zone"><div class="card-head"><div><h3 class="card-title">数据与隐私</h3><p class="card-sub">你的任务、邮箱与图片均保存在本机浏览器</p></div></div><p>清除后会恢复默认状态（空白课表与空任务列表），且无法撤销。正式版中，你可以随时导出或删除账号数据。</p><div class="page-actions" style="justify-content:flex-start"><button class="btn btn-secondary btn-sm" data-action="export">' + icon("i-download") + '导出我的数据</button><button class="btn btn-danger btn-sm" data-action="clear-data">' + icon("i-trash") + "清除本机数据</button></div></section></div>" +
      '<aside><section class="card profile-card"><div class="card-head"><div><h3 class="card-title">我的使用数据</h3><p class="card-sub">仅作原型展示</p></div></div><div class="context-row"><span>任务总数</span><strong>' + state.tasks.filter(t => !t.deleted).length + ' 项</strong></div><div class="context-row"><span>已完成</span><strong>' + state.tasks.filter(t => t.done && !t.deleted).length + ' 项</strong></div><div class="context-row"><span>本周专注</span><strong>' + fmtDurationShort(weekFocusMinutes()) + '</strong></div><div class="context-row"><span>提醒提前量</span><strong>' + p.lead + ' 分钟</strong></div><div class="context-row"><span>主题</span><strong>' + (state.theme.id === "custom" ? "自定义" : (THEMES.find(t => t.id === state.theme.id) || {}).name || "晴空蓝") + '</strong></div><div class="member-note">' + icon("i-shield") + '邮箱仅用于日程提醒，不用于营销；AI 请求不含密码等敏感信息。</div></section><section class="card profile-card"><div class="card-head"><div><h3 class="card-title">快捷入口</h3></div></div><div class="policy-list"><button class="policy-item" data-page="notifications" style="text-align:left">' + icon("i-bell") + '查看通知中心</button><button class="policy-item" data-page="help" style="text-align:left">' + icon("i-help") + '帮助与反馈</button><button class="policy-item" data-page="about" style="text-align:left">' + icon("i-shield") + 'AI 使用与隐私说明</button><button class="policy-item" data-page="sources" style="text-align:left">' + icon("i-database") + '信息来源网站</button></div></section></aside></div>';
  }
  function avatarHTML(p, cls = "") {
    if (p.avatarImage) return '<span class="avatar ' + cls + '" style="overflow:hidden;padding:0"><img src="' + p.avatarImage + '" alt="" style="width:100%;height:100%;object-fit:cover"></span>';
    return '<span class="avatar ' + cls + '">' + escapeHTML(initials(p.nickname || (state.user ? state.user.name : "同学"))) + "</span>";
  }

  /* ---------- 帮助与关于 ---------- */
  function renderHelp() {
    return pageHead("Support", "帮助与反馈", "关于 AI 排程、提醒与隐私的常见问题，都在这里。", '<button class="btn btn-secondary" data-page="about">' + icon("i-shield") + "AI 使用说明</button>") +
      '<div class="help-grid"><div><section class="card profile-card"><div class="card-head"><div><h3 class="card-title">常见问题</h3><p class="card-sub">点击问题展开答案</p></div></div><div class="faq-list">' + FAQS.map(([q, a]) => '<details class="faq-item"><summary>' + escapeHTML(q) + '</summary><div class="faq-answer">' + escapeHTML(a) + "</div></details>").join("") + '</div></section><section class="card feedback-card"><div class="card-head"><div><h3 class="card-title">' + icon("i-message", "icon--sm") + '意见反馈</h3><p class="card-sub">告诉我们哪里不顺手，帮助这个原型变得更好</p></div></div><div class="feedback-options">' + ["功能建议", "AI 排程", "界面体验", "数据问题", "其他"].map(c => '<button class="feedback-option ' + (ui.feedbackCategory === c ? "active" : "") + '" data-action="feedback-category" data-category="' + c + '">' + c + "</button>").join("") + '</div><textarea class="textarea-input" id="feedbackText" placeholder="可以描述具体场景，例如：AI 把我的实验报告排到了晚上 10 点之后…" maxlength="500"></textarea><div class="form-actions"><span style="font-size:9px;color:var(--muted-2);margin-right:auto">反馈保存在本机，不会上传</span><button class="btn btn-primary btn-sm" data-action="submit-feedback">' + icon("i-send") + "提交反馈</button></div></section></div>" +
      '<aside><section class="card profile-card"><div class="card-head"><div><h3 class="card-title">AI 排程规则</h3><p class="card-sub">一个可解释的简单模型</p></div></div><div class="help-rule-list">' + [
        ["读取空课", "从课表减去课程与已有日程，得到 08:00–22:00 的连续空档。"],
        ["理解任务", "根据名称与补充信息判断类型，估算 30–240 分钟的可执行时长。"],
        ["计算优先级", "截止时间 40% · 任务类型 25% · 空档质量 20% · 用户优先级 15%。"],
        ["避开冲突", "优先选择 19:00–21:30 的完整时段，并为相邻安排保留至少 15 分钟缓冲。"],
        ["人工确认", "所有结果都可由用户修改；AI 不自动删除、不改动已有日程。"]
      ].map((x, i) => '<div class="rule-step"><span class="rule-num">' + (i + 1) + '</span><div><strong>' + x[0] + '</strong><p>' + x[1] + '</p></div></div>').join("") + '</div><div class="member-note">' + icon("i-alert") + '当前原型的 AI 判断由本地规则模拟，不调用外部大模型。正式接入后仍需保留人工确认。</div></section><section class="card profile-card"><div class="card-head"><div><h3 class="card-title">仍然需要帮助？</h3></div></div><p style="font-size:10.5px;color:var(--muted);line-height:1.7">这是一个课程竞赛原型，若你发现数据、交互或 AI 说明上的问题，欢迎通过左侧反馈告诉我们。也可以查看 <button class="card-link" data-page="sources" style="display:inline">信息来源</button> 了解数据口径。</p></section></aside></div>';
  }
  function renderAbout() {
    return '<section class="about-hero"><span class="about-tag">' + icon("i-sparkles") + 'HDU · 第二届 AIGC 应用创新大赛</span><h1 class="hero-title">把零散任务，<br>放进恰好的空课时间。</h1><p class="hero-desc">HDU 日程表是一款面向杭州电子科技大学学生的 AI 校园任务与时间规划工具。它把课表、作业、实验、竞赛与社团任务放在同一张周计划里，让时间安排不再靠记忆和焦虑。</p><div class="about-site">' + icon("i-lock") + SITE_URL + '</div><div class="hero-actions"><button class="btn btn-white" data-page="schedule">打开日程表</button><button class="btn btn-soft" data-page="sources">查看信息来源</button></div></section>' +
      '<div class="about-grid"><div class="about-value">' + icon("i-calendar") + '<strong>真实场景</strong><p>从杭电学生的课表与多任务堆叠出发，解决“知道要做，但不知道什么时候做”的问题。</p></div><div class="about-value">' + icon("i-sparkles") + '<strong>AI 做减法</strong><p>AI 负责判断类型、估算时长、寻找空档；用户保留最终决定权，关键时间可手动修正。</p></div><div class="about-value">' + icon("i-shield") + '<strong>透明可控</strong><p>模拟数据、综合评分与 AI 生成内容均明确标注，不伪造外部平台原始数据。</p></div></div>' +
      '<section class="card about-section"><h3>AIGC 使用说明</h3><p class="sub">按照大赛学术诚信与 AI 使用规范，以下说明本作品在设计与开发中使用 AI 的环节、方式与人工核查情况。</p><table class="disclosure-table"><thead><tr><th>使用环节</th><th>使用方式</th><th>人工核查</th></tr></thead><tbody><tr><td>需求梳理</td><td>使用通用大模型辅助拆解用户场景、功能节点与验收标准。</td><td>团队成员逐条对照课程要求与真实校园场景，删除不切实际的自动化承诺。</td></tr><tr><td>界面与代码</td><td>使用 AI 编码助手生成页面结构、样式与交互逻辑的初稿。</td><td>人工完成视觉走查、交互测试、响应式检查与代码修复。</td></tr><tr><td>产品内 AI</td><td>规划接入 DeepSeek 完成类型判断、时长预估、优先级建议与休闲推荐。</td><td>当前原型使用可解释的本地规则模拟；正式接口接入前不宣称实时大模型能力。</td></tr><tr><td>演示数据</td><td>任务、商家距离、评分与天气等为模拟或综合参考数据；课表只来自用户主动导入。</td><td>所有演示字段均在页面或文档中标注，不冒充真实平台接口与官方评分。</td></tr></tbody></table></section>' +
      '<div class="about-grid" style="grid-template-columns:1fr 1fr"><section class="card about-section"><h3>隐私与数据安全</h3><p class="sub">当前为纯前端原型；任务、邮箱与上传图片留在浏览器，课表订阅链接只在本机用于解析课程。</p><div class="policy-list"><div class="policy-item">' + icon("i-check") + '任务、邮箱、上传图片仅保存在 localStorage，不上传服务器。</div><div class="policy-item">' + icon("i-check") + 'AI 请求预留接口，不包含密码、Cookie 或与功能无关的个人信息。</div><div class="policy-item">' + icon("i-check") + '邮件提醒为演示模拟，不会真实发送邮件；正式版需用户明确授权。</div><div class="policy-item">' + icon("i-check") + '用户可随时清除本机数据，恢复空白课表与空任务列表。</div></div></section><section class="card about-section"><h3>知识产权与边界</h3><p class="sub">尊重原创，也清楚说明原型的边界。</p><div class="policy-list"><div class="policy-item">' + icon("i-check") + '校徽风格标识为原型自制示意，不使用未经授权的官方视觉资产。</div><div class="policy-item">' + icon("i-check") + '推荐指数为「综合参考评分」，不代表大众点评、美团等平台官方数据。</div><div class="policy-item">' + icon("i-check") + '课表同步需你主动提供 HDUHELP 订阅链接或导入 ICS；订阅链接不写入本地存储。</div><div class="policy-item">' + icon("i-check") + '奶娃表情包素材来自用户提供，并参考 memecub 等公开迷因资料；版权归原作者，仅作非商业主题演示。</div><div class="policy-item">' + icon("i-check") + 'AI 生成内容仅供参考，不构成选课、消费或安全决策建议。</div></div></section></div>' +
      '<section class="card about-section"><h3>技术实现</h3><p class="sub">轻量、可迭代、为真实接口预留扩展位。</p><div class="tech-tags"><span class="tech-tag">原生 HTML / CSS / JavaScript</span><span class="tech-tag">localStorage</span><span class="tech-tag">响应式布局</span><span class="tech-tag">Canvas 日程导出</span><span class="tech-tag">ICS / CSV</span><span class="tech-tag">DeepSeek 接口预留</span><span class="tech-tag">HDUHELP 订阅同步</span><span class="tech-tag">ICS 导入</span><span class="tech-tag">可解释排程规则</span></div><div class="member-note">' + icon("i-info") + "本作品为课程竞赛原型，不提供生产级账号安全、邮件投递或第三方平台数据抓取能力。相关能力需在正式上线前完成合规评估与技术接入。" + "</div></section>";
  }
  function renderSources() {
    return pageHead("Data sources", "信息来源", "产品中的课表、校园生活、餐饮休闲与 AI 能力，来自以下公开网站与预留接口。", '<button class="btn btn-secondary" data-page="about">' + icon("i-shield") + "数据使用说明</button>") +
      '<section class="sources-hero"><div class="sources-hero__copy"><strong>我们如何标注数据</strong><p>原型中的课表、任务、距离、评分与天气信息均为模拟或综合参考数据。外部平台若没有公开可直接调用的接口，我们不会伪造平台原始数据，而是明确标注为「综合参考评分」。</p></div><span class="sources-badge">' + icon("i-check") + "口径透明</span></section>" +
      '<div class="source-grid">' + SOURCES.map(s => '<a class="source-card" href="' + s.url + '" target="_blank" rel="noopener noreferrer"><span class="source-logo ' + s.cls + '">' + s.letter + '</span><span class="source-copy"><strong>' + escapeHTML(s.name) + '<span class="tag">' + escapeHTML(s.tag) + '</span></strong><span class="source-url">' + escapeHTML(s.url.replace("https://", "")) + '</span><span class="source-desc">' + escapeHTML(s.desc) + '</span></span><span class="source-open">' + icon("i-external") + "</span></a>").join("") + "</div>" +
      '<section class="transparency-card"><h3>数据口径与免责声明</h3><p>本产品是杭州电子科技大学第二届 AIGC 应用创新大赛的课程竞赛原型。任务默认为空、由你自行添加，课表默认为空白；同步个人课表后，页面会显示你主动从 HDUHELP 读取的课程。商家、距离、评分、天气等仍为演示或综合参考数据，不构成真实服务承诺。</p><div class="transparency-list"><div class="transparency-item">' + icon("i-database") + '课表数据：可通过 HDUHELP「订阅课表」链接或 ICS 文件导入；未导入时保持空白。订阅链接仅在本机解析，不写入本地存储。</div><div class="transparency-item">' + icon("i-star") + '推荐指数：综合距离、人均、品类与公开评价的产品内参考评分，非平台官方评分。</div><div class="transparency-item">' + icon("i-sparkles") + 'AI 内容：当前由本地可解释规则模拟；正式版接入 DeepSeek，输出需人工确认。</div><div class="transparency-item">' + icon("i-mail") + '邮件提醒：原型不发送真实邮件；正式版需配置邮件服务与用户授权。</div></div><p class="last-updated">' + icon("i-clock") + '信息核验日期：' + fmtMonthDay(now) + ' ' + now.getFullYear() + ' · 如有链接失效，请以网站实际内容为准。</p></section>' +
      '<div class="insight-wide" style="margin-top:14px"><span class="insight-spark">' + icon("i-link") + '</span><div><h4>来源链接使用原则</h4><p>我们仅链接到公开网站，不抓取需要登录、付费或明确禁止爬取的内容。若未来接入第三方数据，将优先使用官方开放接口，并在页面中展示数据更新时间与口径。</p></div><button class="btn btn-secondary btn-sm" data-page="about">阅读合规说明</button></div>';
  }

  /* ---------- 弹窗基础 ---------- */
  function openModal(html, opts = {}) {
    const root = document.getElementById("modalRoot");
    if (!root) return;
    ui.lastFocused = document.activeElement;
    root.innerHTML = '<div class="modal-overlay" data-modal-overlay>' + html + "</div>";
    document.body.classList.add("modal-open");
    if (opts.focus) setTimeout(() => { const el = document.querySelector(opts.focus); if (el) el.focus({ preventScroll: true }); }, 30);
    else setTimeout(() => { const el = root.querySelector("button,input,select,textarea"); if (el) el.focus({ preventScroll: true }); }, 30);
    const overlay = root.querySelector("[data-modal-overlay]");
    if (overlay) overlay.addEventListener("mousedown", e => { if (e.target === overlay) closeModal(); });
  }
  function closeModal() {
    if (ui.aiTimer) { clearInterval(ui.aiTimer); ui.aiTimer = null; }
    if (ui.organizeTimer) { clearInterval(ui.organizeTimer); ui.organizeTimer = null; }
    const root = document.getElementById("modalRoot");
    if (root) root.innerHTML = "";
    document.body.classList.remove("modal-open");
    ui.pendingConfirm = null;
    if (ui.lastFocused && document.contains(ui.lastFocused)) {
      try { ui.lastFocused.focus({ preventScroll: true }); } catch (e) { }
    }
  }
  function modalHeader(eyebrow, title, sub) {
    return '<div class="modal-head"><div class="modal-head-copy"><div class="modal-eyebrow">' + eyebrow + '</div><div class="modal-title">' + title + '</div>' + (sub ? '<p class="modal-sub">' + sub + "</p>" : "") + '</div><button class="modal-close" data-action="close-modal" aria-label="关闭">' + icon("i-x") + "</button></div>";
  }
  function openConfirm(opts) {
    ui.pendingConfirm = opts.onConfirm;
    const html = '<div class="modal" role="dialog" aria-modal="true" aria-label="确认操作">' + modalHeader("Confirm", opts.title || "确认操作", "") + '<div class="modal-body"><div class="confirm-icon">' + icon(opts.icon || "i-alert") + '</div><p class="confirm-copy">' + opts.message + '</p></div><div class="modal-foot"><button class="btn btn-secondary" data-action="close-modal">取消</button><button class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '" data-action="confirm-action">' + escapeHTML(opts.confirmText || "确认") + '</button></div></div>';
    openModal(html);
  }

  /* ---------- 任务 / 日程弹窗 ---------- */
  function openTaskModal(taskId = null, presetDate = null) {
    const existing = taskId ? state.tasks.find(t => t.id === taskId) : null;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const defaultStart = presetDate && presetDate !== todayISO ? "19:00" : timeFromMinutes(Math.min(20 * 60 + 30, Math.ceil((nowMin + 30) / 30) * 30));
    const base = existing || {
      name: "", type: "学习", priority: "medium", duration: 90, notes: "", image: "", link: "",
      due: toISODate(addDays(today, 1)) + "T23:59",
      placement: { date: presetDate || todayISO, start: defaultStart, end: timeFromMinutes(Math.min(23 * 60 + 59, minutesOf(defaultStart) + 90)) }
    };
    const due = existing ? dueDate(existing) : addDays(today, 1);
    const placementDate = base.placement ? base.placement.date : (presetDate || todayISO);
    const start = base.placement ? base.placement.start : "19:00";
    const html = '<div class="modal modal--lg" role="dialog" aria-modal="true" aria-label="添加或编辑日程">' + modalHeader(existing ? "Edit schedule" : "New schedule", existing ? "编辑日程" : "添加日程", "名称、时长、开始时间与图片都可以随时修改。") +
      '<div class="modal-body"><form id="taskForm" data-task-id="' + (existing ? existing.id : "") + '"><div class="event-modal-grid">' +
        '<div class="field full"><label for="eventName">日程名称</label><input class="text-input" id="eventName" value="' + escapeHTML(base.name) + '" placeholder="例如：计算机网络实验报告" required><span class="form-error" id="eventNameError">请填写日程名称</span></div>' +
        '<div class="field"><label for="eventType">任务类型</label><select class="select-control" id="eventType" style="width:100%">' + TYPE_NAMES.map(tp => '<option' + (base.type === tp ? " selected" : "") + ">" + tp + "</option>").join("") + "</select></div>" +
        '<div class="field"><label for="eventPriority">优先级</label><select class="select-control" id="eventPriority" style="width:100%"><option value="high"' + (base.priority === "high" ? " selected" : "") + '>高</option><option value="medium"' + (base.priority === "medium" ? " selected" : "") + '>中</option><option value="low"' + (base.priority === "low" ? " selected" : "") + '>低</option></select></div>' +
        '<div class="field"><label for="eventDate">开始日期</label><input class="text-input" type="date" id="eventDate" value="' + placementDate + '"></div>' +
        '<div class="field"><label for="eventStart">开始时间</label><input class="text-input" type="time" id="eventStart" value="' + start + '"></div>' +
        '<div class="field"><label for="eventDuration">时长（分钟）</label><input class="text-input" type="number" id="eventDuration" min="15" max="360" step="15" value="' + (base.duration || 90) + '"></div>' +
        '<div class="field"><label for="eventDueDate">截止日期</label><input class="text-input" type="date" id="eventDueDate" value="' + toISODate(due) + '"></div>' +
        '<div class="field"><label for="eventDueTime">截止时间</label><input class="text-input" type="time" id="eventDueTime" value="' + fmtHM(due) + '"></div>' +
        '<div class="field full"><label for="eventNotes">备注 <span class="optional">选填</span></label><textarea class="textarea-input" id="eventNotes" placeholder="补充作业要求、实验步骤或需要带的材料…">' + escapeHTML(base.notes || "") + "</textarea></div>" +
        '<div class="field full"><label>日程图片 <span class="optional">选填，显示在方格右侧</span></label><div class="image-upload-field"><div class="image-preview-mini" id="eventImagePreview">' + (base.image ? '<img src="' + base.image + '" alt="">' : icon("i-image")) + '</div><label class="file-btn" for="eventImage">' + icon("i-upload") + '上传图片</label><input id="eventImage" type="file" accept="image/png,image/jpeg,image/webp" hidden><span class="file-name" id="eventFileName">' + (base.image ? "已添加图片" : "JPG / PNG / WebP") + "</span>" + (base.image ? '<button type="button" class="btn btn-ghost btn-sm" data-action="remove-event-image">移除</button>' : "") + "</div></div>" +
      '</div></form></div><div class="modal-foot"><div class="modal-actions-split"><div>' + (existing ? '<button class="btn btn-danger" data-action="delete-task" data-task-id="' + existing.id + '">' + icon("i-trash") + "删除" : "") + '</div><div class="right"><button class="btn btn-secondary" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="event-save">' + icon("i-check") + (existing ? "保存修改" : "添加日程") + "</button></div></div></div></div>";
    openModal(html, { focus: "#eventName" });
    ui.eventDraftImage = base.image || "";
    ui.eventDraftTaskId = existing ? existing.id : null;
  }
  function saveTaskEvent() {
    const name = document.getElementById("eventName")?.value.trim();
    const type = document.getElementById("eventType")?.value || "学习";
    const priority = document.getElementById("eventPriority")?.value || "medium";
    const date = document.getElementById("eventDate")?.value || todayISO;
    const start = document.getElementById("eventStart")?.value || "19:00";
    const duration = Math.max(15, Math.min(360, Number(document.getElementById("eventDuration")?.value) || 90));
    const dueD = document.getElementById("eventDueDate")?.value || toISODate(addDays(today, 1));
    const dueT = document.getElementById("eventDueTime")?.value || "23:59";
    const notes = document.getElementById("eventNotes")?.value.trim() || "";
    if (!name) { showToast("请填写日程名称", "error"); const el = document.getElementById("eventName"); if (el) el.focus(); return; }
    let startMin = minutesOf(start);
    if (startMin > 23 * 60 + 45) { showToast("开始时间太晚，请调整到 23:45 之前", "error"); return; }
    const maxDuration = 24 * 60 - startMin;
    let finalDuration = duration;
    if (finalDuration > maxDuration) { finalDuration = maxDuration; showToast("时长已调整到当天结束前", "info"); }
    const end = timeFromMinutes(startMin + finalDuration);
    const existingId = document.getElementById("taskForm")?.dataset.taskId;
    if (existingId) {
      const t = state.tasks.find(x => x.id === existingId);
      if (!t) return;
      Object.assign(t, { name, type, priority, duration: finalDuration, notes, due: dueD + "T" + dueT, image: ui.eventDraftImage || "", placement: { date, start, end } });
    } else {
      state.tasks.push(makeTask({ name, type, priority, duration: finalDuration, notes, due: dueD + "T" + dueT, image: ui.eventDraftImage || "", placement: { date, start, end } }));
    }
    saveState();
    closeModal();
    renderPage();
    updateChrome();
    showToast(existingId ? "日程已更新" : "已添加「" + name + "」到日程", "success");
  }

  /* ---------- 任务详情 ---------- */
  function openTaskDetail(id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    const c = typeInfo(t.type);
    const html = '<div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="detailTitle">' + modalHeader("Task detail", "日程详情", "") +
      '<div class="modal-body"><div style="display:flex;gap:14px;align-items:flex-start"><span class="stat-icon" style="width:44px;height:44px;background:' + c.soft + ";color:" + c.color + '">' + icon(c.icon) + '</span><div style="min-width:0"><div class="modal-title" id="detailTitle" style="font-size:20px">' + escapeHTML(t.name) + '</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">' + typeBadge(t.type) + priorityBadge(t.priority) + (t.source === "ai" ? '<span class="badge" style="background:var(--ai-soft);color:var(--ai)">' + icon("i-sparkles") + "AI 排程</span>" : "") + "</div></div></div>" +
      (t.image ? '<div style="margin-top:16px;border-radius:12px;overflow:hidden;border:1px solid var(--line);max-height:210px"><img src="' + t.image + '" alt="" style="width:100%;height:210px;object-fit:cover"></div>' : "") +
      '<div class="form-grid" style="margin-top:17px">' +
        detailItem("截止时间", escapeHTML(dueLabel(t))) +
        detailItem("计划时长", fmtDuration(t.duration)) +
        detailItem("开始时间", t.placement ? fmtMonthDay(fromISODate(t.placement.date)) + " " + t.placement.start + "–" + t.placement.end : "未安排") +
        detailItem("优先级", PRIORITIES[t.priority] + "优先级") +
        '<div class="field full"><label>备注</label><div style="font-size:11px;color:var(--muted);line-height:1.7;background:var(--surface-2);border-radius:8px;padding:10px">' + (t.notes ? escapeHTML(t.notes) : "没有备注") + "</div></div>" +
      "</div></div>" +
      '<div class="modal-foot"><div class="modal-actions-split"><div><button class="btn btn-ghost" data-action="close-modal">关闭</button></div><div class="right"><button class="btn btn-secondary" data-action="edit-task" data-task-id="' + t.id + '">' + icon("i-edit") + '编辑日程</button><button class="btn btn-primary" data-action="toggle-task-detail" data-task-id="' + t.id + '">' + icon(t.done ? "i-refresh" : "i-check") + (t.done ? "恢复为进行中" : "标记完成") + "</button></div></div></div></div>";
    openModal(html);
  }
  function detailItem(label, value) {
    return '<div class="field"><label>' + label + '</label><div style="font-size:12px;color:var(--text-2);padding:8px 10px;background:var(--surface-2);border-radius:8px">' + value + "</div></div>";
  }
  function openClassDetail(id) {
    const c = state.classes.find(x => x.id === id);
    if (!c) return;
    const tint = CLASS_TINTS[c.tint] || CLASS_TINTS.slate;
    openModal('<div class="modal" role="dialog" aria-modal="true">' + modalHeader("Course", "课程信息", "") + '<div class="modal-body"><div style="display:flex;gap:12px;align-items:center"><span class="stat-icon" style="width:44px;height:44px;background:' + tint.bg + ";color:" + tint.ink + '">' + icon("i-book") + '</span><div><div style="font-size:18px;font-weight:780;letter-spacing:-.03em">' + escapeHTML(c.name) + '</div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">' + DAY_NAMES[(c.day + 1) % 7] + " · " + c.start + "–" + c.end + '</div></div></div><div class="form-grid" style="margin-top:16px">' + detailItem("上课地点", c.room) + detailItem("任课教师", c.teacher) + detailItem("课程时长", fmtDuration(minutesOf(c.end) - minutesOf(c.start))) + detailItem("上课周次", c.weeks && c.weeks.length ? c.weeks.join("、") + " 周" : "未标注") + detailItem("课程来源", getScheduleSource().label) + '</div><div class="member-note">' + icon("i-info") + "课程来自你导入的个人课表，若信息有误请在 HDUHELP 中更新后重新同步。" + '</div></div><div class="modal-foot"><button class="btn btn-secondary" data-action="close-modal">关闭</button></div></div>');
  }

  /* ---------- AI 智能排版 ---------- */
  function createAIDraft() {
    return {
      name: "", types: [], userTouchedTypes: false, detected: null, duration: null, estimated: 90,
      dueDate: toISODate(addDays(today, 2)), dueTime: "23:59", priority: "medium",
      link: "", notes: "", image: "", stage: "form", progressStep: 0, result: null, selectedSlot: 0,
      suggestedPriority: "medium", userTouchedPriority: false
    };
  }
  function openAIModal(mode = "single") {
    ui.aiMode = mode === "organize" ? "organize" : "single";
    if (ui.aiMode === "single") ui.aiDraft = createAIDraft();
    if (ui.aiMode === "organize") { ui.organizeStage = "idle"; ui.organizeResult = null; }
    renderAIModal();
  }
  function aiModeTabsHTML() {
    return '<div class="ai-mode-tabs"><button type="button" class="ai-mode-tab ' + (ui.aiMode === "single" ? "active" : "") + '" data-action="ai-mode" data-mode="single"><span class="ai-mode-icon">' + icon("i-sparkles") + '</span><span><strong>单任务排程</strong><small>原功能 · 描述一个任务</small></span></button><button type="button" class="ai-mode-tab ' + (ui.aiMode === "organize" ? "active" : "") + '" data-action="ai-mode" data-mode="organize"><span class="ai-mode-icon organize">' + icon("i-calendar") + '</span><span><strong>一键整理日程</strong><small>全部任务 · 最佳时间排布</small></span></button></div>';
  }
  function renderAIModal() {
    if (ui.aiMode === "organize") { renderOrganizeModal(); return; }
    const d = ui.aiDraft;
    if (!d) return;
    if (d.stage === "result") { renderAIResultModal(); return; }
    const stageLabel = d.stage === "loading" ? "第 2 步 / 共 2 步" : "第 1 步 / 共 2 步";
    const free = computeWeekFreeChips(startOfWeek(today));
    const busyCount = state.classes.length + state.tasks.filter(t => t.placement && !t.archived && !t.deleted).length;
    const estimated = d.detected ? d.detected.duration : d.estimated;
    const html = '<div class="modal modal--xl ai-modal" role="dialog" aria-modal="true" aria-label="AI 智能排版">' +
      modalHeader("AI scheduler", "AI 智能排版", "描述任务，AI 会结合你的课表空档、截止时间与优先级给出可调整的方案。") +
      '<div class="modal-body">' +
        aiModeTabsHTML() +
        '<div class="ai-progress-head"><span class="step-badge">AI</span><div><strong>' + (d.stage === "loading" ? "正在生成排程方案" : "让 AI 先理解这件事") + '</strong><p>' + (d.stage === "loading" ? "读取课表、避开冲突、寻找合适空档…" : "补充信息越具体，时长预估越接近真实") + '</p></div><span class="progress-line">' + stageLabel + '</span></div>' +
        (d.stage === "loading" ? aiLoadingHTML(d) : aiFormHTML(d, free, busyCount, estimated)) +
      '</div>' +
      '<div class="modal-foot"><div class="modal-actions-split"><div><button class="btn btn-ghost" data-action="close-modal">取消</button></div><div class="right">' + (d.stage === "loading" ? '<button class="btn btn-secondary" data-action="close-modal">后台继续</button>' : '<button class="btn btn-primary" data-action="ai-generate">' + icon("i-sparkles") + "生成排程方案</button>") + "</div></div></div></div>";
    openModal(html, { focus: d.stage === "form" ? "#aiName" : null });
  }
  function aiFormHTML(d, free, busyCount, estimated) {
    const selectedDuration = d.duration || "";
    return '<div class="ai-grid"><div class="ai-form"><div class="field"><label class="ai-field-label" for="aiName">任务名称 <span class="optional">必填</span></label><input class="text-input ai-name-input" id="aiName" value="' + escapeHTML(d.name) + '" placeholder="例如：计算机网络实验报告、AIGC 大赛方案梳理…" autocomplete="off"><div class="ai-detection" id="aiDetection">' + aiDetectionHTML(d) + '</div></div>' +
      '<div class="field"><div class="ai-field-label">任务类型 <span class="optional">AI 判断可手动修正</span></div><div class="type-tags" id="aiTypeTags">' + TYPE_NAMES.map(tp => { const c = CATEGORIES[tp]; return '<button type="button" class="type-tag ' + c.cls + " " + (d.types.includes(tp) ? "active" : "") + '" data-action="ai-type" data-type="' + tp + '">' + icon(c.icon) + tp + "</button>"; }).join("") + '</div></div>' +
      '<div class="field"><div class="ai-field-label">预期时间 <span class="optional">非必填，留空由 AI 预估</span></div><div class="ai-duration-row" id="aiDurationRow"><button type="button" class="duration-chip ' + (!d.duration ? "active" : "") + '" data-action="ai-duration" data-duration="auto">' + icon("i-sparkles") + "AI 预估 " + estimated + " 分钟</button>" + [30, 60, 90, 120].map(n => '<button type="button" class="duration-chip ' + (d.duration === n ? "active" : "") + '" data-action="ai-duration" data-duration="' + n + '">' + n + " 分钟</button>").join("") + '</div><div style="display:flex;align-items:center;gap:6px;margin-top:7px"><input class="duration-input" id="aiDuration" type="number" min="15" max="240" step="15" value="' + selectedDuration + '" placeholder="自定义"><span style="font-size:9px;color:var(--muted-2)">分钟</span></div></div>' +
      '<div class="ai-two-col"><div class="field"><label for="aiDueDate">截止日期</label><input class="text-input" type="date" id="aiDueDate" value="' + d.dueDate + '"></div><div class="field"><label for="aiDueTime">截止时间</label><input class="text-input" type="time" id="aiDueTime" value="' + d.dueTime + '"></div></div>' +
      '<div class="field"><div class="ai-field-label">优先级</div><div class="priority-segment" id="aiPriority"><button type="button" data-action="ai-priority" data-priority="high" class="' + (d.priority === "high" ? "active" : "") + '">高</button><button type="button" data-action="ai-priority" data-priority="medium" class="' + (d.priority === "medium" ? "active" : "") + '">中</button><button type="button" data-action="ai-priority" data-priority="low" class="' + (d.priority === "low" ? "active" : "") + '">低</button></div><p class="field-hint" id="aiPriorityHint">AI 建议：' + (PRIORITIES[d.suggestedPriority] || "中") + '优先级 · 可手动修正</p></div>' +
      '<div class="ai-supplement"><div class="ai-field-label" style="margin-bottom:2px">补充信息 <span class="optional">选填</span></div><p class="field-hint">可输入网址、上传图片或文字描述，帮助 AI 更准确地估时。例如学习视频链接、作业本与题目。</p><input class="supplement-input" id="aiLink" type="url" value="' + escapeHTML(d.link) + '" placeholder="粘贴参考链接，如学习视频 / 作业页面"><textarea class="supplement-text" id="aiNotes" placeholder="补充任务要求、题目数量、需要产出的结果…">' + escapeHTML(d.notes) + '</textarea><div class="supplement-actions"><label class="upload-mini" for="aiImage">' + icon("i-upload") + '上传题目 / 作业图片</label><input id="aiImage" type="file" accept="image/png,image/jpeg,image/webp" hidden><span class="upload-mini-name" id="aiImageName">' + (d.image ? "已添加图片" : "") + '</span></div></div></div>' +
      '<aside class="ai-aside"><div class="ai-aside-title">' + icon("i-sparkles") + 'AI 会读取什么</div><div class="ai-mini-stat"><span>本周课程</span><strong>' + state.classes.length + ' 节</strong></div><div class="ai-mini-stat"><span>已有日程</span><strong>' + state.tasks.filter(t => t.placement && !t.archived && !t.deleted).length + ' 项</strong></div><div class="ai-mini-stat"><span>可用空档</span><strong>' + free.length + ' 段</strong></div><div class="ai-mini-stat"><span>冲突检查</span><strong style="color:var(--success)">已开启</strong></div><p class="ai-aside-note"><strong>排程偏好</strong><br>优先 19:00–21:30 的晚间空档，周末上午作为备选；为相邻课程保留 15 分钟缓冲。</p><p class="ai-aside-note"><strong>隐私</strong><br>当前为本地模拟，不会把任务名称上传到第三方。正式 AI 接口接入后将单独征得授权。</p></aside></div>';
  }
  function aiDetectionHTML(d) {
    if (!d.name.trim()) return icon("i-sparkles") + "<span>输入任务名称后，AI 会自动判断类型并估算时长。</span>";
    if (d.detected) {
      return icon("i-sparkles") + "<span><strong>AI 判断：" + escapeHTML(d.detected.type) + "</strong> · 预计 " + d.detected.duration + " 分钟<br>" + escapeHTML(d.detected.reason) + '</span><span class="ai-confidence">' + Math.round(d.detected.confidence * 100) + "% 置信度</span>";
    }
    return icon("i-sparkles") + "<span>AI 正在识别任务类型…</span>";
  }
  function aiLoadingHTML(d) {
    const steps = ["解析任务语义与补充信息", "读取本周课表与已有日程", "计算可用空档并避开冲突", "生成可调整的排程方案"];
    return '<div class="ai-loading"><div class="ai-steps">' + steps.map((s, i) => '<div class="ai-step ' + (i < d.progressStep ? "done" : i === d.progressStep ? "active" : "") + '"><span class="step-icon">' + (i < d.progressStep ? icon("i-check") : "") + '</span><span>' + s + '</span><span class="step-note">' + (i < d.progressStep ? "完成" : i === d.progressStep ? "进行中" : "等待") + "</span></div>").join("") + '</div><p class="field-hint" style="text-align:center;margin-top:18px">AI 生成结果仅供参考，保存前你可以手动调整时间与优先级。</p></div>';
  }
  function renderAIResultModal() {
    const d = ui.aiDraft;
    if (!d || !d.result) { renderAIModal(); return; }
    const res = d.result;
    const noSlots = !res.slots.length;
    const html = '<div class="modal modal--xl ai-modal" role="dialog" aria-modal="true" aria-label="AI 智能排版">' +
      modalHeader("AI scheduler", "AI 排程方案", "已结合课表空档、截止时间与优先级生成。请确认后再加入日程。") +
      '<div class="modal-body">' + aiModeTabsHTML() + '<div class="ai-progress-head"><span class="step-badge">AI</span><div><strong>方案已生成</strong><p>' + (noSlots ? "截止前没有找到足够长的完整空档" : "找到 " + res.slots.length + " 个可行时段") + '</p></div><span class="progress-line">第 2 步 / 共 2 步</span></div>' +
      (noSlots ? '<div class="ai-warning">' + icon("i-alert") + "<span>截止时间前没有找到连续 " + res.duration + " 分钟的空档。建议缩短单次时长、把截止时间延后 1–2 天，或拆成两次 45 分钟完成。</span></div>" : '<div class="ai-result-head"><span class="result-icon">' + icon("i-check") + '</span><div><strong>已为你避开所有课程与已有日程</strong><p>按“截止时间 + 空档质量 + 优先级”综合排序，推荐以下时段。</p></div><span class="confidence">无冲突</span></div>') +
      (noSlots ? "" : '<div class="slot-list">' + res.slots.map((s, i) => '<button class="slot-option ' + (i === d.selectedSlot ? "selected" : "") + '" data-action="ai-slot" data-index="' + i + '"><span class="slot-date-block"><strong>' + String(s.date.getDate()).padStart(2, "0") + '</strong><small>' + (s.date.getMonth() + 1) + '月</small></span><span class="slot-info"><strong>' + DAY_NAMES[s.date.getDay()] + ' · ' + s.start + '–' + s.end + '</strong><small>' + escapeHTML(s.reason) + '</small></span><span class="slot-score">推荐度 ' + s.score + '</span></button>').join("") + "</div>") +
      '<div class="ai-aside" style="position:static;margin-top:12px;background:var(--surface)"><div class="ai-aside-title">' + icon("i-sparkles") + 'AI 的排程依据</div><div class="ai-mini-stat"><span>任务判断</span><strong>' + escapeHTML(d.types.join(" / ") || d.detected?.type || "未分类") + '</strong></div><div class="ai-mini-stat"><span>预计时长</span><strong>' + fmtDuration(res.duration) + '</strong></div><div class="ai-mini-stat"><span>截止时间</span><strong>' + d.dueDate + ' ' + d.dueTime + '</strong></div><div class="ai-mini-stat"><span>优先级</span><strong>' + (PRIORITIES[d.priority] || "中") + '优先级</strong></div></div>' +
      '<div class="slot-reason"><strong>为什么是这个时间：</strong>' + (noSlots ? "现有课表与任务占用了大部分可用时段，建议调整约束后重试。" : escapeHTML(res.slots[d.selectedSlot]?.reason || "")) + "</div>" +
      (res.conflictNote ? '<div class="ai-conflict">' + icon("i-alert") + "<span>" + escapeHTML(res.conflictNote) + "</span></div>" : "") +
      '<div class="ai-result-actions"><button class="btn btn-secondary" data-action="ai-back">' + icon("i-edit") + '调整条件</button><button class="btn btn-ghost" data-action="ai-retry">' + icon("i-refresh") + "换一个方案</button>" + (noSlots ? "" : '<button class="btn btn-primary" data-action="ai-confirm">' + icon("i-check") + "确认加入日程</button>") + '</div><p class="ai-result-disclaimer">' + icon("i-shield") + "AI 生成内容仅供参考，保存前请确认时间；你可以在日程表中随时修改。" + "</p></div>" +
      '<div class="modal-foot"><div class="modal-actions-split"><div><button class="btn btn-ghost" data-action="close-modal">取消</button></div><div class="right"><button class="btn btn-secondary" data-action="ai-back">返回修改</button></div></div></div></div>';
    openModal(html);
  }
  function suggestPriority(name, type, dueDateStr) {
    let p = type === "竞赛" ? "high" : (type === "实验" || type === "作业" ? "medium" : "low");
    const diff = daysUntil(fromISODate(dueDateStr || todayISO));
    if (diff <= 2) p = "high";
    else if (diff <= 4 && p === "low") p = "medium";
    if (/紧急|尽快|明天|今晚|截止/.test(name)) p = "high";
    return p;
  }

  /* ---------- 一键整理日程 ---------- */
  function planBusyIntervals(date, assigned) {
    const dow = date.getDay();
    const dayIndex = dow === 0 ? 6 : dow - 1;
    const week = effectiveTeachingWeek(date);
    const iso = toISODate(date);
    const busy = [];
    (state.classes || []).filter(c => c.day === dayIndex && (!c.weeks || !c.weeks.length || c.weeks.includes(week))).forEach(c => {
      busy.push({ start: minutesOf(c.start), end: minutesOf(c.end), kind: "class", name: c.name });
    });
    (assigned || []).filter(a => a.dateISO === iso).forEach(a => {
      busy.push({ start: minutesOf(a.start), end: minutesOf(a.end), kind: "task", name: a.name });
    });
    return busy.sort((a, b) => a.start - b.start);
  }

  function planFreeGaps(date, minMinutes, assigned) {
    const busy = planBusyIntervals(date, assigned);
    const gaps = [];
    let cursor = CAL_START;
    for (const b of busy) {
      if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, CAL_END), minutes: Math.min(b.start, CAL_END) - cursor });
      cursor = Math.max(cursor, b.end);
      if (cursor >= CAL_END) break;
    }
    if (cursor < CAL_END) gaps.push({ start: cursor, end: CAL_END, minutes: CAL_END - cursor });
    return gaps.filter(g => g.end - g.start >= minMinutes);
  }

  function placementConflict(task, activeTasks) {
    if (!task.placement) return false;
    const date = fromISODate(task.placement.date);
    const dow = date.getDay();
    const dayIndex = dow === 0 ? 6 : dow - 1;
    const week = effectiveTeachingWeek(date);
    const s = minutesOf(task.placement.start), e = minutesOf(task.placement.end);
    const classConflict = (state.classes || []).some(c => c.day === dayIndex && (!c.weeks || !c.weeks.length || c.weeks.includes(week)) && s < minutesOf(c.end) && e > minutesOf(c.start));
    if (classConflict) return true;
    return activeTasks.some(other => other.id !== task.id && other.placement && other.placement.date === task.placement.date && s < minutesOf(other.placement.end) && e > minutesOf(other.placement.start));
  }

  function placementText(placement) {
    if (!placement) return "尚未安排";
    return DAY_NAMES[fromISODate(placement.date).getDay()] + " " + placement.start + "–" + placement.end;
  }

  function buildOrganizePlan() {
    const active = state.tasks.filter(t => !t.done && !t.archived && !t.deleted);
    const priorityRank = { high: 0, medium: 1, low: 2 };
    const ordered = active.slice().sort((a, b) => {
      const ad = dueDate(a).getTime(), bd = dueDate(b).getTime();
      if (ad !== bd) return ad - bd;
      const pr = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
      if (pr !== 0) return pr;
      return (b.duration || 0) - (a.duration || 0);
    });
    const assigned = [];
    const items = [];
    const unscheduled = [];
    ordered.forEach(task => {
      const duration = Math.max(15, Math.min(240, Math.round((Number(task.duration) || 60) / 15) * 15));
      const due = dueDate(task);
      const diff = daysUntil(due);
      const limit = diff < 0 ? 3 : Math.min(14, Math.max(2, diff + 1));
      let best = null;
      for (let i = 0; i <= limit; i++) {
        const date = addDays(today, i);
        if (diff >= 0 && startOfDay(date) > startOfDay(due)) break;
        const gaps = planFreeGaps(date, duration, assigned);
        for (const gap of gaps) {
          let earliest = gap.start;
          if (i === 0) earliest = Math.max(earliest, now.getHours() * 60 + now.getMinutes() + 20);
          const first = Math.ceil(earliest / 15) * 15;
          for (let start = first; start + duration <= gap.end; start += 15) {
            const end = start + duration;
            if (diff >= 0 && startOfDay(date).getTime() === startOfDay(due).getTime() && end > due.getHours() * 60 + due.getMinutes()) continue;
            let score = 60;
            score += Math.max(0, 16 - i * 2);
            if (task.priority === "high") score += 12; else if (task.priority === "medium") score += 5;
            if (diff <= 1) score += 16; else if (diff <= 3) score += 9; else if (diff <= 7) score += 3;
            if (start >= 19 * 60 && end <= 22 * 60) score += 9;
            if (date.getDay() === 0 || date.getDay() === 6) score += 3;
            if (start >= 12 * 60 && start < 13 * 60 + 30) score -= 18;
            if (start >= 21 * 60 + 30) score -= 9;
            if (!best || score > best.score) best = { date, start, end, score };
          }
        }
      }
      if (best) {
        const dateISO = toISODate(best.date);
        const item = {
          id: task.id,
          name: task.name,
          type: task.type,
          priority: task.priority,
          duration,
          date: best.date,
          dateISO,
          start: timeFromMinutes(best.start),
          end: timeFromMinutes(best.end),
          score: Math.min(99, Math.max(50, Math.round(best.score))),
          oldPlacement: task.placement ? { ...task.placement } : null,
          reason: diff <= 1 ? "临近截止，优先安排" : (task.priority === "high" ? "高优先级任务优先占用完整空档" : "避开课程，安排在完整空档"),
          conflict: placementConflict(task, active)
        };
        assigned.push({ dateISO, start: item.start, end: item.end, name: task.name });
        items.push(item);
      } else {
        unscheduled.push({
          id: task.id,
          name: task.name,
          priority: task.priority,
          reason: diff < 0 ? "截止时间已过，未来 3 天没有足够空档" : "截止前没有连续 " + duration + " 分钟空档"
        });
      }
    });
    items.sort((a, b) => a.date - b.date || minutesOf(a.start) - minutesOf(b.start));
    const conflictsFixed = items.filter(x => x.conflict).length;
    return {
      items,
      unscheduled,
      summary: {
        total: active.length,
        scheduled: items.length,
        unscheduled: unscheduled.length,
        conflictsFixed,
        hours: Math.round(items.reduce((s, x) => s + x.duration, 0) / 60 * 10) / 10,
        classCount: state.classes.length
      },
      generatedAt: new Date().toISOString()
    };
  }

  function organizeLoadingHTML() {
    const steps = ["读取全部进行中任务", "合并课程与已有安排", "按截止 / 优先级计算空档", "生成新的最佳周计划"];
    const p = ui.organizeStep || 0;
    return '<div class="ai-loading organize-loading"><div class="ai-steps">' + steps.map((s, i) => '<div class="ai-step ' + (i < p ? "done" : i === p ? "active" : "") + '"><span class="step-icon">' + (i < p ? icon("i-check") : "") + '</span><span>' + s + '</span><span class="step-note">' + (i < p ? "完成" : i === p ? "进行中" : "等待") + "</span></div>").join("") + '</div><p class="field-hint" style="text-align:center;margin-top:18px">正在为你重新安排全部进行中的任务，课表不会被修改。</p></div>';
  }

  function organizeResultHTML(res) {
    if (!res) return "";
    const s = res.summary;
    const dayGroups = [];
    res.items.forEach(item => {
      let g = dayGroups.find(x => x.dateISO === item.dateISO);
      if (!g) { g = { dateISO: item.dateISO, date: item.date, items: [] }; dayGroups.push(g); }
      g.items.push(item);
    });
    return '<div class="organize-summary"><div class="organize-metric"><span>已安排</span><strong>' + s.scheduled + '<small>项</small></strong></div><div class="organize-metric"><span>修复冲突</span><strong>' + s.conflictsFixed + '<small>项</small></strong></div><div class="organize-metric"><span>待手动处理</span><strong>' + s.unscheduled + '<small>项</small></strong></div><div class="organize-metric"><span>计划时长</span><strong>' + s.hours + '<small>h</small></strong></div></div>' +
      (dayGroups.length ? '<div class="organize-days">' + dayGroups.map(g => '<section class="organize-day"><div class="organize-day-head"><strong>' + DAY_NAMES[g.date.getDay()] + '</strong><span>' + fmtMonthDay(g.date) + '</span></div><div class="organize-day-body">' + g.items.map(item => '<div class="organize-row"><span class="organize-time">' + item.start + '–' + item.end + '</span><div class="organize-task"><strong>' + escapeHTML(item.name) + '</strong><small>原：' + escapeHTML(placementText(item.oldPlacement)) + ' → 新：' + item.start + '–' + item.end + '</small></div><span class="badge type-badge ' + typeInfo(item.type).cls + '">' + escapeHTML(item.type) + '</span><span class="organize-score">' + item.score + '</span></div>').join("") + '</div></section>').join("") + '</div>' : '<div class="organize-empty">' + icon("i-alert") + '<p>目前没有可重新安排的任务。</p></div>') +
      (res.unscheduled.length ? '<div class="organize-unscheduled"><strong>' + icon("i-alert") + '需要你手动处理</strong>' + res.unscheduled.map(x => '<p>' + escapeHTML(x.name) + ' · ' + escapeHTML(x.reason) + '</p>').join("") + '</div>' : "") +
      '<p class="organize-disclaimer">' + icon("i-shield") + '一键整理会移动所有进行中任务；已完成、归档任务与课程不会被修改。未安排的任务会保留原时间。</p>';
  }

  function renderOrganizeModal() {
    const active = state.tasks.filter(t => !t.done && !t.archived && !t.deleted);
    const scheduled = active.filter(t => t.placement).length;
    const conflicts = active.filter(t => placementConflict(t, active)).length;
    const stage = ui.organizeStage || "idle";
    const res = ui.organizeResult;
    const previewTasks = active.slice(0, 5);
    let body = "";
    if (stage === "loading") {
      body = organizeLoadingHTML();
    } else if (stage === "result" && res) {
      body = organizeResultHTML(res);
    } else {
      body = '<div class="organize-intro"><div class="organize-intro__copy"><span class="ai-kicker">' + icon("i-sparkles") + 'AI 一键整理</span><h3>把已经添加的日程，重新排成一张更顺的周计划。</h3><p>读取全部进行中的任务，结合课表空档、截止时间、优先级和任务时长，给出新的时间排布。课程固定不动，任务可手动调整。</p></div><div class="organize-intro__stats"><div><strong>' + active.length + '</strong><span>进行中任务</span></div><div><strong>' + scheduled + '</strong><span>已排入日程</span></div><div><strong class="' + (conflicts ? "danger" : "") + '">' + conflicts + '</strong><span>当前冲突</span></div></div></div>' +
        '<div class="organize-preview-card"><div class="organize-preview-head"><strong>这次会整理</strong><span>' + active.length + ' 项任务 · ' + state.classes.length + ' 节课程</span></div>' +
        (previewTasks.length ? '<div class="organize-task-chips">' + previewTasks.map(t => '<span class="organize-task-chip"><i style="background:' + typeColor(t.type) + '"></i>' + escapeHTML(t.name) + '<small>' + (t.placement ? (t.placement.date === todayISO ? "今天 " : "") + t.placement.start : "未安排") + '</small></span>').join("") + (active.length > 5 ? '<span class="organize-task-chip more">+' + (active.length - 5) + ' 项</span>' : "") + '</div>' : '<div class="organize-empty">' + icon("i-check") + '<p>没有进行中的任务需要整理。</p></div>') +
        '</div>' +
        '<div class="organize-rules"><span>' + icon("i-calendar") + '课程固定</span><span>' + icon("i-clock") + '优先完整空档</span><span>' + icon("i-check") + '按截止与优先级排序</span><span>' + icon("i-shield") + '应用前可预览</span></div>';
    }
    const canApply = stage === "result" && res && res.items.length;
    const html = '<div class="modal modal--xl ai-modal" role="dialog" aria-modal="true" aria-label="AI 智能排版">' +
      modalHeader("AI organizer", "AI 智能排版", stage === "result" ? "新的时间排布已经生成，确认后才会写入日程。" : "两个入口：单任务排程，或一次整理全部已有日程。") +
      '<div class="modal-body">' + aiModeTabsHTML() + body + '</div>' +
      '<div class="modal-foot"><div class="modal-actions-split"><div><button class="btn btn-ghost" data-action="close-modal">取消</button></div><div class="right">' +
        (stage === "idle" ? '<button class="btn btn-primary" data-action="organize-run"' + (active.length ? "" : " disabled") + '>' + icon("i-sparkles") + '开始一键整理</button>' : stage === "loading" ? '<button class="btn btn-secondary" data-action="close-modal">后台继续</button>' : '<button class="btn btn-secondary" data-action="organize-regenerate">' + icon("i-refresh") + '重新生成</button>' + (canApply ? '<button class="btn btn-primary" data-action="organize-apply">' + icon("i-check") + '应用全部排布</button>' : "")) +
      '</div></div></div></div>';
    openModal(html);
  }

  function runOrganize() {
    ui.organizeStage = "loading";
    ui.organizeStep = 0;
    renderAIModal();
    if (ui.organizeTimer) clearInterval(ui.organizeTimer);
    let step = 0;
    ui.organizeTimer = setInterval(() => {
      if (ui.aiMode !== "organize" || ui.organizeStage !== "loading") { clearInterval(ui.organizeTimer); ui.organizeTimer = null; return; }
      step++;
      ui.organizeStep = step;
      if (step >= 4) {
        clearInterval(ui.organizeTimer);
        ui.organizeTimer = null;
        ui.organizeResult = buildOrganizePlan();
        ui.organizeStage = "result";
        renderAIModal();
      } else {
        const steps = document.querySelectorAll(".organize-loading .ai-step");
        steps.forEach((el, i) => { el.className = "ai-step " + (i < step ? "done" : i === step ? "active" : ""); });
      }
    }, 420);
  }

  function applyOrganizePlan() {
    requireAuth(() => {
      const res = ui.organizeResult;
      if (!res || !res.items.length) return;
      res.items.forEach(item => {
        const task = state.tasks.find(t => t.id === item.id);
        if (!task) return;
        task.placement = { date: item.dateISO, start: item.start, end: item.end };
        task.reminded = false;
      });
      state.notifications.unshift({
        id: uid("n"), type: "ai", title: "AI 已重新整理你的日程",
        body: "重新安排了 " + res.items.length + " 项任务" + (res.summary.conflictsFixed ? "，修复 " + res.summary.conflictsFixed + " 个冲突" : "") + (res.unscheduled.length ? "；" + res.unscheduled.length + " 项需要手动处理。" : "。"),
        createdAt: new Date().toISOString(), read: false
      });
      saveState();
      closeModal();
      ui.aiMode = "single";
      ui.organizeStage = "idle";
      ui.organizeResult = null;
      ui.scheduleLoaded = true;
      navigate("schedule");
      updateChrome();
      showToast("已应用新的时间排布：" + res.items.length + " 项任务", "success", 4200);
    });
  }

  function detectTaskType(name) {
    const n = name.toLowerCase();
    if (/竞赛|大赛|比赛|挑战杯|互联网+|acm|数学建模|创业/.test(n)) return { type: "竞赛", confidence: .9, reason: "名称包含竞赛 / 大赛等关键词，通常需要连续、较长的准备时间。" };
    if (/实验|仿真|测量|电路|化学|物理实验|lab/.test(n)) return { type: "实验", confidence: .88, reason: "名称包含实验相关词，通常需要动手操作与结果整理。" };
    if (/社团|例会|志愿|学生会|活动|招新|联谊|班会/.test(n)) return { type: "社团任务", confidence: .86, reason: "名称指向社团 / 集体活动，时间通常较固定。" };
    if (/作业|习题|报告|论文|课程设计|练习|题库|pre|ppt|展示/.test(n)) return { type: "作业", confidence: .84, reason: "名称指向需要交付的作业或报告，建议留出完整书写时间。" };
    if (/复习|预习|学习|听力|单词|阅读|视频|课程|考试|笔记|网课|慕课|刷题/.test(n)) return { type: "学习", confidence: .82, reason: "名称包含学习 / 复习类词语，适合拆成短而连续的专注段。" };
    return { type: "其他", confidence: .58, reason: "没有命中明确关键词，先归入「其他」，你可以手动修正类型。" };
  }
  function estimateDuration(name, type, notes = "") {
    let base = { "学习": 60, "作业": 90, "实验": 120, "竞赛": 120, "社团任务": 60, "其他": 60 }[type] || 60;
    const n = (name + " " + notes).toLowerCase();
    if (/报告|论文|课程设计|方案|策划/.test(n)) base += 45;
    if (/实验|仿真|测量|电路/.test(n)) base += 30;
    if (/复习|预习|阅读|视频|听力|刷题/.test(n)) base += 30;
    if (/习题|题目|题库|练习/.test(n)) base += 30;
    if (/例会|会议|班会/.test(n)) base = 60;
    if (/大赛|比赛|竞赛/.test(n)) base += 30;
    base = Math.max(30, Math.min(240, Math.round(base / 15) * 15));
    return base;
  }
  function updateAIDetection() {
    const d = ui.aiDraft;
    if (!d) return;
    const det = document.getElementById("aiDetection");
    if (det) det.innerHTML = aiDetectionHTML(d);
    const tags = document.getElementById("aiTypeTags");
    if (tags) [...tags.querySelectorAll(".type-tag")].forEach(el => el.classList.toggle("active", d.types.includes(el.dataset.type)));
    const hint = document.getElementById("aiPriorityHint");
    if (hint) hint.textContent = "AI 建议：" + (PRIORITIES[d.suggestedPriority] || "中") + "优先级 · 可手动修正";
    document.querySelectorAll("#aiPriority button").forEach(b => b.classList.toggle("active", b.dataset.priority === d.priority));
    const row = document.getElementById("aiDurationRow");
    if (row) {
      const est = d.detected ? d.detected.duration : d.estimated;
      const first = row.querySelector('[data-duration="auto"]');
      if (first) first.innerHTML = icon("i-sparkles") + "AI 预估 " + est + " 分钟";
      [...row.querySelectorAll(".duration-chip")].forEach(el => el.classList.toggle("active", el.dataset.duration === "auto" ? !d.duration : Number(el.dataset.duration) === d.duration));
    }
  }
  function generateAISchedule() {
    const d = ui.aiDraft;
    if (!d) return;
    d.name = document.getElementById("aiName")?.value.trim() || d.name;
    if (!d.name) { showToast("先给任务起个名字，AI 才好判断", "error"); document.getElementById("aiName")?.focus(); return; }
    if (!d.types.length) { showToast("至少选择一个任务类型，或重新输入名称让 AI 判断", "error"); return; }
    d.dueDate = document.getElementById("aiDueDate")?.value || d.dueDate;
    d.dueTime = document.getElementById("aiDueTime")?.value || d.dueTime;
    d.link = document.getElementById("aiLink")?.value || "";
    d.notes = document.getElementById("aiNotes")?.value || "";
    const custom = document.getElementById("aiDuration")?.value;
    if (custom) d.duration = Math.max(15, Math.min(240, Number(custom) || 0));
    if (!d.duration) d.duration = d.detected ? d.detected.duration : estimateDuration(d.name, d.types[0], d.notes);
    d.stage = "loading"; d.progressStep = 0;
    renderAIModal();
    if (ui.aiTimer) clearInterval(ui.aiTimer);
    let step = 0;
    ui.aiTimer = setInterval(() => {
      if (!ui.aiDraft || ui.aiDraft !== d) { clearInterval(ui.aiTimer); ui.aiTimer = null; return; }
      step++;
      d.progressStep = Math.min(4, step);
      const steps = document.querySelectorAll(".ai-step");
      if (steps.length) {
        steps.forEach((el, i) => {
          el.className = "ai-step " + (i < d.progressStep ? "done" : i === d.progressStep ? "active" : "");
          const note = el.querySelector(".step-note");
          if (note) note.textContent = i < d.progressStep ? "完成" : i === d.progressStep ? "进行中" : "等待";
          const circle = el.querySelector(".step-icon");
          if (circle && i < d.progressStep && !circle.innerHTML) circle.innerHTML = icon("i-check");
        });
      }
      if (step >= 4) {
        clearInterval(ui.aiTimer); ui.aiTimer = null;
        d.result = buildAISchedule(d);
        d.stage = "result";
        d.selectedSlot = 0;
        renderAIResultModal();
      }
    }, 470);
  }
  function buildAISchedule(d) {
    const duration = d.duration || 90;
    const last = fromISODate(d.dueDate, Number((d.dueTime || "23:59").split(":")[0]), Number((d.dueTime || "23:59").split(":")[1]));
    const lastMinutes = last.getHours() * 60 + last.getMinutes();
    const candidates = [];
    for (let i = 0; i <= 10; i++) {
      const date = addDays(today, i);
      if (startOfDay(date) > startOfDay(last)) break;
      const gaps = freeGapsForDate(date, duration);
      for (const g of gaps) {
        let possible = g.start;
        if (toISODate(date) === todayISO) possible = Math.max(possible, now.getHours() * 60 + now.getMinutes() + 20);
        if (g.end - possible < duration) continue;
        const startTimes = [];
        for (let s = Math.ceil(possible / 15) * 15; s + duration <= g.end; s += 15) startTimes.push(s);
        if (!startTimes.length) continue;
        let best = null;
        for (const s of startTimes) {
          const score = scoreSlot(date, s, duration, d);
          if (!best || score > best.score) best = { start: s, score };
        }
        if (best) {
          const end = best.start + duration;
          if (startOfDay(date).getTime() === startOfDay(last).getTime() && end > lastMinutes) continue;
          candidates.push({
            date, start: timeFromMinutes(best.start), end: timeFromMinutes(end),
            score: Math.min(99, Math.round(best.score)),
            reason: slotReason(date, best.start, end, d)
          });
        }
      }
    }
    const byDay = new Map();
    candidates.forEach(c => { const k = toISODate(c.date); if (!byDay.has(k) || byDay.get(k).score < c.score) byDay.set(k, c); });
    let slots = [...byDay.values()].sort((a, b) => b.score - a.score || a.date - b.date).slice(0, 3);
    slots.sort((a, b) => a.date - b.date || minutesOf(a.start) - minutesOf(b.start));
    const conflictNote = slots.length ? "已为相邻课程预留至少 15 分钟缓冲；若临时有变，可在确认前手动调整。" : "";
    return { slots, duration, conflictNote, generatedAt: new Date().toISOString() };
  }
  function scoreSlot(date, start, duration, d) {
    let score = 62;
    const end = start + duration;
    const diffDays = daysUntil(date);
    score += Math.max(0, 14 - diffDays * 2);
    if (start >= 19 * 60 && end <= 22 * 60) score += 15;
    if (start >= 8 * 60 && end <= 11 * 60) score += 5;
    if (date.getDay() === 0 || date.getDay() === 6) score += 7;
    if (start >= 12 * 60 && start < 13 * 60 + 30) score -= 22;
    if (start >= 21 * 60 + 30) score -= 10;
    const busy = getDayBusy(date);
    for (const b of busy) {
      if (Math.abs(start - b.end) <= 20) score += 9;
      if (Math.abs(b.start - end) <= 20) score += 5;
    }
    if (d.priority === "high") score += 4;
    if (duration >= 120 && start >= 19 * 60) score += 3;
    return score;
  }
  function slotReason(date, start, end, d) {
    const day = DAY_NAMES[date.getDay()];
    const period = start >= 18 * 60 ? "晚间" : start < 12 * 60 ? "上午" : "下午";
    const afterClass = getDayBusy(date).some(b => b.kind === "class" && Math.abs(start - b.end) <= 25);
    return day + period + "完整空档，距截止还有 " + Math.max(0, daysUntil(date)) + " 天" + (afterClass ? "，紧接下课时间，减少切换成本" : "，前后无课程冲突");
  }
  function commitAISchedule() {
    requireAuth(() => {
      const d = ui.aiDraft;
      if (!d || !d.result || !d.result.slots.length) return;
      const s = d.result.slots[d.selectedSlot];
      const types = d.types.length ? d.types : [d.detected?.type || "其他"];
      const task = makeTask({
        name: d.name, type: types[0], types, priority: d.priority, duration: d.result.duration,
        due: d.dueDate + "T" + d.dueTime, notes: d.notes, link: d.link, image: d.image,
        source: "ai", placement: { date: toISODate(s.date), start: s.start, end: s.end }
      });
      state.tasks.push(task);
      state.notifications.unshift({ id: uid("n"), type: "ai", title: "AI 已为你排好「" + task.name + "」", body: DAY_NAMES[s.date.getDay()] + " " + s.start + "–" + s.end + "，已避开课程与已有日程。", createdAt: new Date().toISOString(), read: false });
      saveState();
      closeModal();
      ui.aiDraft = null;
      ui.scheduleLoaded = true;
      navigate("schedule");
      updateChrome();
      showToast("已加入日程：" + DAY_NAMES[s.date.getDay()] + " " + s.start + "–" + s.end, "success", 4200);
    });
  }
  function cleanAIOnClose() { if (ui.aiTimer) { clearInterval(ui.aiTimer); ui.aiTimer = null; } if (ui.organizeTimer) { clearInterval(ui.organizeTimer); ui.organizeTimer = null; } }

  /* ---------- 邮箱绑定 / 提醒 ---------- */
  function openBindEmail() {
    if (!state.user) { requireAuth(() => openBindEmail()); return; }
    const current = state.profile.email || (state.user && state.user.email) || "";
    const html = '<div class="modal" role="dialog" aria-modal="true" aria-label="绑定提醒邮箱">' + modalHeader("Email", "绑定提醒邮箱", "用于在日程开始前接收提醒。原型不会真实发送邮件。") +
      '<div class="modal-body"><div class="bind-email-copy">当前邮箱：<strong>' + escapeHTML(current || "未绑定") + '</strong><br>更换邮箱后，请完成一次模拟验证码校验。</div><form id="bindEmailForm"><div class="field"><label for="bindEmailInput">新邮箱</label><input class="text-input" id="bindEmailInput" type="email" value="' + escapeHTML(current) + '" placeholder="name@example.com" required><span class="field-hint">建议使用常用邮箱，正式版会发送验证邮件。</span></div><div class="field" style="margin-top:10px"><label for="bindCode">验证码</label><div class="code-row"><input class="text-input" id="bindCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码"><button type="button" class="btn btn-secondary" data-action="send-code">获取验证码</button></div></div><p class="demo-code-note">' + icon("i-info") + '演示模式：点击获取后使用验证码 123456，不会真实发送。</p></form></div><div class="modal-foot"><button class="btn btn-secondary" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="verify-email">保存邮箱</button></div></div>';
    openModal(html, { focus: "#bindEmailInput" });
    ui.codeSent = false;
  }
  function sendBindCode() {
    const email = document.getElementById("bindEmailInput")?.value.trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("请先填写有效的邮箱地址", "error"); return; }
    ui.codeSent = true;
    showToast("演示验证码：123456（未真实发送邮件）", "info", 5200);
    const btn = document.querySelector('[data-action="send-code"]');
    if (btn) { btn.textContent = "已发送"; btn.disabled = true; }
  }
  function verifyEmail() {
    const email = document.getElementById("bindEmailInput")?.value.trim() || "";
    const code = document.getElementById("bindCode")?.value.trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("邮箱格式不正确", "error"); return; }
    if (!ui.codeSent) { showToast("请先点击「获取验证码」", "error"); return; }
    if (code !== "123456") { showToast("验证码不正确，演示验证码为 123456", "error"); return; }
    state.profile.email = email;
    if (state.user) state.user.email = email;
    saveState();
    closeModal();
    renderPage();
    updateChrome();
    showToast("邮箱已绑定：" + email + "（提醒为演示模式）", "success", 4200);
  }
  function toggleReminders() {
    requireAuth(() => {
      state.profile.reminders = !state.profile.reminders;
      saveState();
      renderPage();
      showToast(state.profile.reminders ? "提醒已开启" : "提醒已关闭", "success");
    });
  }
  function saveReminderPrefs() {
    if (!state.user) return;
    state.profile.lead = Number(document.getElementById("reminderLead")?.value || 30);
    state.profile.channels.inApp = !!document.getElementById("channelInApp")?.checked;
    state.profile.channels.email = !!document.getElementById("channelEmail")?.checked;
    saveState();
    showToast("提醒偏好已保存", "success");
  }
  function testReminder() {
    requireAuth(() => {
      state.notifications.unshift({ id: uid("n"), type: "reminder", title: "测试提醒 · 一切正常", body: "这是你的测试提醒。正式版会在日程开始前 " + state.profile.lead + " 分钟提醒你。邮件发送为演示模拟。", createdAt: new Date().toISOString(), read: false });
      saveState();
      updateChrome();
      showToast("站内测试提醒已生成；邮件通道为演示模式", "success", 4200);
      renderPage();
    });
  }

  /* ---------- 导出 ---------- */
  function openExportModal() {
    if (!state.user) { requireAuth(() => openExportModal()); return; }
    const upcoming = state.tasks.filter(t => !t.archived && !t.deleted);
    const opt = (fmt, letter, title, desc, style) => '<button class="slot-option" data-action="export-option" data-format="' + fmt + '"><span class="slot-date-block" style="' + style + '"><strong>' + letter + '</strong><small>' + (fmt === "ics" ? "日历" : fmt.toUpperCase()) + '</small></span><span class="slot-info"><strong>' + title + '</strong><small>' + desc + '</small></span><span class="source-open">' + icon("i-download") + '</span></button>';
    const html = '<div class="modal" role="dialog" aria-modal="true" aria-label="导出日程">' + modalHeader("Export", "导出日程", "选择适合你的格式。导出只包含本机保存的任务。") +
      '<div class="modal-body"><div class="source-note" style="margin-bottom:13px"><strong>' + icon("i-info") + '本次导出</strong>共 ' + upcoming.length + ' 项任务，覆盖本周与后续安排。日程图片会以蓝色周计划海报呈现。</div><div class="slot-list">' +
      opt("ics", "iC", ".ics 日历订阅文件", "导入 Apple 日历 / Outlook / 系统日历，含提前提醒", "background:var(--primary-soft);color:var(--primary-strong)") +
      opt("png", "P", "周计划图片", "生成一张 1600 × 1000 的分享海报，适合发群聊或存相册", "background:var(--success-soft);color:var(--success)") +
      opt("csv", "C", "任务清单 CSV", "用 Excel / WPS 打开，便于复盘和统计", "background:var(--warning-soft);color:var(--warning)") +
      '</div></div><div class="modal-foot"><button class="btn btn-secondary" data-action="close-modal">关闭</button></div></div>';
    openModal(html);
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function exportICS() {
    const tasks = state.tasks.filter(t => !t.archived && !t.deleted && t.placement);
    const pad = n => String(n).padStart(2, "0");
    const dt = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
    let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//HDU Schedule//CN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:HDU 日程表\r\n";
    tasks.forEach(t => {
      const start = atTime(fromISODate(t.placement.date), t.placement.start);
      const end = atTime(fromISODate(t.placement.date), t.placement.end);
      const desc = (t.notes || "") + "\n类型：" + t.type + "\n来源：HDU 日程表演示原型";
      ics += "BEGIN:VEVENT\r\nUID:" + t.id + "@hduschedule.local\r\nDTSTAMP:" + dt(new Date()) + "\r\nDTSTART:" + dt(start) + "\r\nDTEND:" + dt(end) + "\r\nSUMMARY:" + escapeICS(t.name) + "\r\nDESCRIPTION:" + escapeICS(desc) + "\r\nLOCATION:杭州电子科技大学\r\n";
      ics += "BEGIN:VALARM\r\nTRIGGER:-PT" + (state.profile.lead || 30) + "M\r\nACTION:DISPLAY\r\nDESCRIPTION:" + escapeICS("日程提醒：" + t.name) + "\r\nEND:VALARM\r\nEND:VEVENT\r\n";
    });
    ics += "END:VCALENDAR";
    downloadBlob(new Blob([ics], { type: "text/calendar;charset=utf-8" }), "HDU日程表-" + todayISO + ".ics");
    closeModal();
    showToast("已导出 .ics 日历文件", "success");
  }
  function escapeICS(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
  function exportCSV() {
    const rows = [["名称", "类型", "优先级", "时长(分钟)", "截止时间", "开始日期", "开始时间", "结束时间", "状态", "备注"]];
    state.tasks.filter(t => !t.deleted).forEach(t => rows.push([t.name, t.type, PRIORITIES[t.priority] || "中", t.duration, (t.due || "").replace("T", " "), t.placement?.date || "", t.placement?.start || "", t.placement?.end || "", t.done ? "已完成" : t.archived ? "已归档" : "进行中", t.notes || ""]));
    const csv = "\uFEFF" + rows.map(r => r.map(v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "HDU任务清单-" + todayISO + ".csv");
    closeModal();
    showToast("已导出 CSV 任务清单", "success");
  }
  function exportPNG() {
    const canvas = document.createElement("canvas");
    const W = 1600, H = 1000, dpr = 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const roundedPath = (x, y, w, h, r) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") { ctx.roundRect(x, y, w, h, r); return; }
      const rr = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
    };

    ctx.fillStyle = "#F4F6FB"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2563EB"; ctx.fillRect(0, 0, W, 156);
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.arc(1450, 10, 230, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.font = '800 42px "Microsoft YaHei", sans-serif'; ctx.fillText("HDU 日程表", 70, 82);
    ctx.font = '500 20px "Microsoft YaHei", sans-serif'; ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillText("把零散任务，放进恰好的空课时间 · 第 " + weekNumber(now) + " 教学周", 70, 118);
    ctx.textAlign = "right"; ctx.fillText(fmtMonthDay(now) + " " + DAY_NAMES[now.getDay()], W - 70, 86); ctx.textAlign = "left";
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    ctx.fillStyle = "#0F172A"; ctx.font = '700 25px "Microsoft YaHei", sans-serif'; ctx.fillText("本周计划", 70, 210);
    ctx.fillStyle = "#64748B"; ctx.font = '400 15px "Microsoft YaHei", sans-serif'; ctx.fillText(fmtMonthDay(weekStart) + " — " + fmtMonthDay(weekEnd), 70, 238);
    ctx.fillStyle = "#E7ECF3"; ctx.fillRect(70, 258, W - 140, 1);
    const colW = (W - 140 - 60) / 7, top = 280, colTop = 300, bottom = 845;
    const timeX = 70, daysX = 140;
    const hourH = (bottom - colTop) / 14;
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i), ds = toISODate(d);
      const x = daysX + i * colW;
      ctx.fillStyle = ds === todayISO ? "#2563EB" : "#FFFFFF";
      roundedPath(x + 4, top, colW - 8, 54, 10); ctx.fill();
      if (ds === todayISO) { ctx.fillStyle = "rgba(255,255,255,.72)"; } else { ctx.fillStyle = "#64748B"; }
      ctx.textAlign = "center"; ctx.font = '500 13px "Microsoft YaHei", sans-serif'; ctx.fillText(DAY_NAMES[d.getDay()], x + colW / 2, top + 22);
      ctx.font = '700 19px "Microsoft YaHei", sans-serif'; ctx.fillStyle = ds === todayISO ? "#FFFFFF" : "#0F172A"; ctx.fillText(String(d.getDate()), x + colW / 2, top + 44);
      ctx.fillStyle = "#EEF2F7"; ctx.fillRect(x, colTop, colW, bottom - colTop);
    }
    ctx.textAlign = "right";
    for (let h = 8; h <= 22; h++) {
      const y = colTop + (h - 8) * hourH;
      ctx.fillStyle = "#94A3B8"; ctx.font = '400 12px "Microsoft YaHei", sans-serif'; ctx.fillText(String(h).padStart(2, "0") + ":00", timeX + 50, y + 4);
      ctx.strokeStyle = "#E2E8F0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(daysX, y); ctx.lineTo(W - 70, y); ctx.stroke();
    }
    ctx.textAlign = "left";
    const drawBlock = (x, y, w, h, fill, ink, title, meta, border) => {
      ctx.fillStyle = fill; roundedPath(x, y, w, h, 7); ctx.fill();
      if (border) { ctx.fillStyle = border; roundedPath(x, y, 4, h, 2); ctx.fill(); }
      ctx.fillStyle = ink; ctx.font = '700 12px "Microsoft YaHei", sans-serif';
      const maxW = w - 14;
      let t = title; while (ctx.measureText(t).width > maxW && t.length > 2) t = t.slice(0, -1);
      ctx.fillText(t, x + 9, y + 18);
      if (h > 30 && meta) { ctx.fillStyle = "rgba(15,23,42,.52)"; ctx.font = '400 10px "Microsoft YaHei", sans-serif'; ctx.fillText(meta, x + 9, y + 33); }
    };
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i), ds = toISODate(d), x = daysX + i * colW;
      const dayClasses = state.classes.filter(c => c.day === i);
      dayClasses.forEach(c => {
        const y = colTop + (minutesOf(c.start) - CAL_START) / 60 * hourH;
        const h = (minutesOf(c.end) - minutesOf(c.start)) / 60 * hourH;
        const tint = CLASS_TINTS[c.tint] || CLASS_TINTS.slate;
        drawBlock(x + 3, y + 1, colW - 6, Math.max(18, h - 2), tint.bg, tint.ink, c.name, c.room, tint.line);
      });
      state.tasks.filter(t => !t.archived && !t.deleted && t.placement && t.placement.date === ds).forEach(t => {
        const y = colTop + (minutesOf(t.placement.start) - CAL_START) / 60 * hourH;
        const h = (minutesOf(t.placement.end) - minutesOf(t.placement.start)) / 60 * hourH;
        drawBlock(x + 3, y + 1, colW - 6, Math.max(18, h - 2), "#FFFFFF", "#0F172A", t.name, t.type + " · " + t.placement.start, typeColor(t.type));
      });
    }
    ctx.fillStyle = "#64748B"; ctx.font = '400 13px "Microsoft YaHei", sans-serif';
    ctx.fillText("数据来源：" + getScheduleSource().label + " · 杭电 Wiki · 大众点评 / 美团（综合参考）", 70, 910);
    ctx.fillStyle = "#94A3B8"; ctx.font = '400 12px "Microsoft YaHei", sans-serif';
    ctx.fillText("AI 排程结果仅供参考 · 信息核验 " + fmtMonthDay(now) + " " + now.getFullYear(), 70, 934);
    ctx.fillStyle = "#2563EB"; ctx.font = '700 13px "Microsoft YaHei", sans-serif'; ctx.fillText("HDU 日程表 · 演示原型", 70, 965);
    ctx.textAlign = "right"; ctx.fillStyle = "#94A3B8"; ctx.font = '400 12px "Microsoft YaHei", sans-serif'; ctx.fillText("来源与口径：应用底部「信息来源」", W - 70, 965); ctx.textAlign = "left";
    canvas.toBlob(blob => { if (blob) downloadBlob(blob, "HDU周计划-" + todayISO + ".png"); }, "image/png");
    closeModal();
    showToast("已生成周计划 PNG 海报", "success");
  }

  /* ---------- 事件绑定 ---------- */
  function handleClick(e) {
    const pageEl = e.target.closest("[data-page]");
    if (pageEl) {
      e.preventDefault();
      closeAccountPopover();
      navigate(pageEl.dataset.page);
      return;
    }
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "close-modal") { cleanAIOnClose(); closeModal(); return; }
    if (action === "toggle-sidebar") { toggleSidebar(); return; }
    if (action === "add-task") { if (!requireAuth(() => openTaskModal())) return; return; }
    if (action === "open-ai") { closeSidebar(); openAIModal(); return; }
    if (action === "open-login") { openLogin("login"); return; }
    if (action === "auth-mode") { ui.loginMode = actionEl.dataset.mode; openLogin(ui.loginMode); return; }
    if (action === "demo-login") { demoLogin(); return; }
    if (action === "toggle-password") { const el = document.getElementById(actionEl.dataset.target); if (el) { const show = el.type === "password"; el.type = show ? "text" : "password"; actionEl.innerHTML = icon(show ? "i-eye-off" : "i-eye"); } return; }
    if (action === "clear-schedule") { requireAuth(() => openConfirm({ title: "一键清空日程表？", message: "会移除所有课程与任务在日历上的时间安排，任务本身仍保留在「我的任务」，之后可以重新整理。", confirmText: "清空日程表", danger: true, onConfirm: clearSchedule })); return; }
    if (action === "sync-schedule" || action === "open-sync") { if (!requireAuth(() => openPersonalSync())) return; return; }
    if (action === "sync-ics-fetch") { fetchIcsUrl(); return; }
    if (action === "sync-ics-apply") { syncIcsFromPanel(); return; }
    if (action === "week-prev") { ui.weekOffset--; renderPage(); return; }
    if (action === "week-next") { ui.weekOffset++; renderPage(); return; }
    if (action === "week-today") { ui.weekOffset = 0; renderPage(); return; }
    if (action === "schedule-view") { ui.scheduleView = actionEl.dataset.view; renderPage(); return; }
    if (action === "export") { openExportModal(); return; }
    if (action === "export-option") {
      if (actionEl.dataset.format === "ics") exportICS();
      else if (actionEl.dataset.format === "csv") exportCSV();
      else exportPNG();
      return;
    }
    if (action === "view-task") { openTaskDetail(actionEl.dataset.taskId); return; }
    if (action === "view-class") { openClassDetail(actionEl.dataset.classId); return; }
    if (action === "edit-task") { const id = actionEl.dataset.taskId; closeModal(); requireAuth(() => openTaskModal(id)); return; }
    if (action === "delete-task") { const id = actionEl.dataset.taskId; const t = state.tasks.find(x => x.id === id); if (!t) return; closeModal(); requireAuth(() => openConfirm({ title: "删除这个日程？", message: "「" + escapeHTML(t.name) + "」会移入「归档与已删除」，之后仍可恢复。", confirmText: "移入归档", danger: true, onConfirm: () => { t.archived = true; t.deleted = true; t.done = false; saveState(); renderPage(); updateChrome(); showToast("已移入归档，可在「归档与已删除」中恢复", "success"); } })); return; }
    if (action === "archive-task") { requireAuth(() => { const t = state.tasks.find(x => x.id === actionEl.dataset.taskId); if (t) { t.archived = true; saveState(); renderPage(); updateChrome(); showToast("任务已归档", "success"); } }); return; }
    if (action === "restore-task") { requireAuth(() => { const t = state.tasks.find(x => x.id === actionEl.dataset.taskId); if (t) { t.archived = false; t.deleted = false; saveState(); renderPage(); updateChrome(); showToast("任务已恢复", "success"); } }); return; }
    if (action === "toggle-task") {
      e.preventDefault();
      const id = actionEl.dataset.taskId;
      requireAuth(() => toggleTaskCompletion(id));
      return;
    }
    if (action === "task-tab") { ui.taskTab = actionEl.dataset.tab; renderPage(); return; }
    if (action === "task-type") { ui.taskType = actionEl.dataset.type; renderPage(); return; }
    if (action === "clear-filters") { ui.taskQuery = ""; ui.taskType = "all"; ui.taskPriority = "all"; ui.taskSort = "due"; renderPage(); return; }
    if (action === "stat-range") { ui.statRange = actionEl.dataset.range; renderPage(); return; }
    if (action === "theme-select") { const id = actionEl.dataset.themeId; if (id === "custom") state.theme = { id: "custom", color: state.theme.id === "custom" ? state.theme.color : "#0F766E", image: state.theme.image, scope: state.theme.scope }; else state.theme = { id, color: (THEMES.find(t => t.id === id) || THEMES[0]).color, image: state.theme.image, scope: state.theme.scope }; saveState(); applyTheme(); renderPage(); showToast("已切换为" + (id === "custom" ? "自定义主题" : (THEMES.find(t => t.id === id) || {}).name), "success"); return; }
    if (action === "custom-color") { state.theme = { id: "custom", color: actionEl.dataset.color, image: state.theme.image, scope: state.theme.scope }; saveState(); applyTheme(); renderPage(); return; }
    if (action === "theme-reset") { state.theme = { id: "blue", color: "#2563EB", image: "", scope: "background" }; saveState(); applyTheme(); renderPage(); showToast("已恢复默认晴空蓝主题", "success"); return; }
    if (action === "remove-theme-image") { state.theme.image = ""; saveState(); applyTheme(); renderPage(); showToast("已移除主题背景", "success"); return; }
    if (action === "remove-event-image") { ui.eventDraftImage = ""; const prev = document.getElementById("eventImagePreview"); if (prev) prev.innerHTML = icon("i-image"); const nameEl = document.getElementById("eventFileName"); if (nameEl) nameEl.textContent = "JPG / PNG / WebP"; return; }
    if (action === "mascot") { mascotInteract(); return; }
    if (action === "leisure-campus") { ui.leisureCampus = actionEl.dataset.campus || "下沙"; resetLeisureChat("已切换到" + (ui.leisureCampus === "全部" ? "全部校区" : ui.leisureCampus + "校区")); renderPage(); return; }
    if (action === "open-place-recommend") { if (!requireAuth(() => openPlaceModal("recommend"))) return; return; }
    if (action === "open-place-avoid") { if (!requireAuth(() => openPlaceModal("avoid"))) return; return; }
    if (action === "place-save") { savePlace(); return; }
    if (action === "delete-place") { deletePlace(actionEl.dataset.placeKind, actionEl.dataset.placeId); return; }
    if (action === "quick-chip") { sendLeisure(actionEl.dataset.text); return; }
    if (action === "chat-send") { const input = document.getElementById("leisureInput"); sendLeisure(input ? input.value : ""); return; }
    if (action === "reset-chat") { state.chat = []; ensureChat(); saveState(); renderPage(); showToast("已重新读取课表空档并生成推荐", "success"); return; }
    if (action === "rec-detail") {
      const r = allPlaces().find(x => x.id === actionEl.dataset.recId);
      if (r) openModal('<div class="modal" role="dialog" aria-modal="true">' + modalHeader("Recommendation", r.name, (r.source === "user" ? "我的推荐 · " : "综合参考评分 · ") + r.category) + '<div class="modal-body"><img src="' + r.image + '" alt="" style="width:100%;height:190px;object-fit:cover;border-radius:11px;border:1px solid var(--line)"><div style="display:flex;align-items:center;gap:6px;margin-top:13px"><span class="rating" style="font-size:13px">' + icon("i-star") + r.rating.toFixed(1) + '</span><span class="badge type-badge type-study">' + (r.source === "user" ? "我的评分" : "综合参考评分") + '</span></div><p style="font-size:12px;line-height:1.7;color:var(--text-2);margin-top:8px">' + escapeHTML(r.reason) + '</p><div class="form-grid" style="margin-top:12px">' + detailItem("距离", escapeHTML(r.distance)) + detailItem("人均", escapeHTML(r.price)) + '</div><div class="member-note">' + icon("i-info") + (r.source === "user" ? "这是你上传的推荐，评分代表你的个人体验，不代表平台评分。" : "推荐指数为产品内综合参考评分，不代表大众点评 / 美团平台官方评分。前往前请以商家实际信息为准。") + '</div></div><div class="modal-foot"><button class="btn btn-secondary" data-action="close-modal">关闭</button></div></div>');
      return;
    }
    if (action === "notif-filter") { ui.notifFilter = actionEl.dataset.filter; renderPage(); return; }
    if (action === "mark-all-read") { state.notifications.forEach(n => n.read = true); saveState(); updateChrome(); renderPage(); showToast("所有通知已标记为已读", "success"); return; }
    if (action === "read-notification") { const n = state.notifications.find(x => x.id === actionEl.dataset.notificationId); if (n && !n.read) { n.read = true; saveState(); updateChrome(); renderPage(); } return; }
    if (action === "feedback-category") { ui.feedbackCategory = actionEl.dataset.category; document.querySelectorAll(".feedback-option").forEach(el => el.classList.toggle("active", el === actionEl)); return; }
    if (action === "submit-feedback") { const text = document.getElementById("feedbackText")?.value.trim(); if (!text) { showToast("写点什么再提交吧", "error"); return; } state.feedback.push({ id: uid("fb"), category: ui.feedbackCategory, text, createdAt: new Date().toISOString() }); saveState(); showToast("反馈已保存，谢谢你的建议", "success"); renderPage(); return; }
    if (action === "profile-save") { requireAuth(() => { state.profile.nickname = document.getElementById("profileName")?.value.trim() || "同学"; state.profile.major = document.getElementById("profileMajor")?.value.trim() || ""; state.profile.grade = document.getElementById("profileGrade")?.value || ""; if (state.user) state.user.name = state.profile.nickname; saveState(); updateChrome(); renderPage(); showToast("个人资料已保存", "success"); }); return; }
    if (action === "bind-email") { openBindEmail(); return; }
    if (action === "send-code") { sendBindCode(); return; }
    if (action === "verify-email") { verifyEmail(); return; }
    if (action === "toggle-reminders") { toggleReminders(); return; }
    if (action === "test-reminder") { testReminder(); return; }
    if (action === "logout") { requireAuth(() => openConfirm({ title: "退出登录？", message: "你的任务仍会保存在本机，重新登录后可以继续使用。", confirmText: "退出登录", onConfirm: () => { state.user = null; saveState(); updateChrome(); renderPage(); showToast("已退出登录，当前为演示模式", "info"); } })); return; }
    if (action === "open-login") { openLogin("login"); return; }
    if (action === "clear-data") { openConfirm({ title: "清除本机数据？", message: "所有任务、主题、提醒与聊天记录都会被清除，并恢复空白课表与空任务列表。此操作不可撤销。", confirmText: "确认清除", danger: true, onConfirm: () => { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { } state = demoState(); saveState(); ui.scheduleLoaded = true; applyTheme(); updateChrome(); renderPage(); showToast("本机数据已清除，已恢复默认状态", "success"); } }); return; }
    if (action === "toggle-task-detail") { const id = actionEl.dataset.taskId; requireAuth(() => { const t = state.tasks.find(x => x.id === id); if (t) { t.done = !t.done; saveState(); closeModal(); renderPage(); updateChrome(); showToast(t.done ? "任务已完成，做得不错" : "任务已恢复为进行中", "success"); } }); return; }
    if (action === "event-save") { saveTaskEvent(); return; }
    if (action === "confirm-action") { const fn = ui.pendingConfirm; closeModal(); if (fn) fn(); return; }
    if (action === "ai-mode") { const mode = actionEl.dataset.mode; if (mode === "single" && !ui.aiDraft) ui.aiDraft = createAIDraft(); ui.aiMode = mode === "organize" ? "organize" : "single"; if (ui.aiMode === "organize" && ui.organizeStage === "result" && !ui.organizeResult) ui.organizeStage = "idle"; renderAIModal(); return; }
    if (action === "open-organize") { openAIModal("organize"); return; }
    if (action === "organize-run" || action === "organize-regenerate") { runOrganize(); return; }
    if (action === "organize-apply") { applyOrganizePlan(); return; }
    if (action === "ai-type") { const d = ui.aiDraft; if (!d) return; const tp = actionEl.dataset.type; d.userTouchedTypes = true; if (d.types.includes(tp)) d.types = d.types.filter(x => x !== tp); else d.types.push(tp); updateAIDetection(); return; }
    if (action === "ai-duration") { const d = ui.aiDraft; if (!d) return; const val = actionEl.dataset.duration; d.duration = val === "auto" ? null : Number(val); const input = document.getElementById("aiDuration"); if (input) input.value = d.duration || ""; updateAIDetection(); return; }
    if (action === "ai-priority") { const d = ui.aiDraft; if (!d) return; d.priority = actionEl.dataset.priority; d.userTouchedPriority = true; document.querySelectorAll("#aiPriority button").forEach(b => b.classList.toggle("active", b === actionEl)); return; }
    if (action === "ai-generate") { generateAISchedule(); return; }
    if (action === "ai-back") { if (ui.aiDraft) { ui.aiDraft.stage = "form"; renderAIModal(); } return; }
    if (action === "ai-retry") { if (ui.aiDraft && ui.aiDraft.result && ui.aiDraft.result.slots.length > 1) { ui.aiDraft.selectedSlot = (ui.aiDraft.selectedSlot + 1) % ui.aiDraft.result.slots.length; renderAIResultModal(); showToast("已切换到另一个可行时段", "info"); } else if (ui.aiDraft) { ui.aiDraft.stage = "loading"; ui.aiDraft.progressStep = 0; restartAIGeneration(); } return; }
    if (action === "ai-slot") { if (!ui.aiDraft) return; ui.aiDraft.selectedSlot = Number(actionEl.dataset.index) || 0; renderAIResultModal(); return; }
    if (action === "ai-confirm") { commitAISchedule(); return; }
  }
  function restartAIGeneration() {
    const d = ui.aiDraft; if (!d) return;
    d.result = null; d.stage = "loading"; d.progressStep = 0; renderAIModal();
    if (ui.aiTimer) clearInterval(ui.aiTimer);
    let step = 0;
    ui.aiTimer = setInterval(() => {
      if (!ui.aiDraft || ui.aiDraft !== d) { clearInterval(ui.aiTimer); ui.aiTimer = null; return; }
      step++;
      d.progressStep = Math.min(4, step);
      const steps = document.querySelectorAll(".ai-step");
      steps.forEach((el, i) => { el.className = "ai-step " + (i < d.progressStep ? "done" : i === d.progressStep ? "active" : ""); });
      if (step >= 4) {
        clearInterval(ui.aiTimer); ui.aiTimer = null;
        d.result = buildAISchedule(d);
        d.stage = "result"; d.selectedSlot = 0; renderAIResultModal();
      }
    }, 420);
  }
  function handleChange(e) {
    const el = e.target;
    if (el.matches && el.matches("input[data-task-check]")) {
      const id = el.dataset.taskId;
      if (!state.user) { el.checked = !el.checked; requireAuth(() => toggleTaskCompletion(id)); return; }
      toggleTaskCompletion(id);
      return;
    }
    if (el.id === "aiDueDate") { const d = ui.aiDraft; if (d) { d.dueDate = el.value; if (d.detected) { d.suggestedPriority = suggestPriority(d.name, d.types[0] || d.detected.type, d.dueDate); if (!d.userTouchedPriority) d.priority = d.suggestedPriority; updateAIDetection(); } } }
    if (el.id === "priorityFilter") { ui.taskPriority = el.value; renderPage(); }
    if (el.id === "sortFilter") { ui.taskSort = el.value; renderPage(); }
    if (el.id === "leisureRange") { ui.leisureRange = Number(el.value) || 5; resetLeisureChat("推荐范围已调整为 " + (ui.leisureRange === 50 ? "全城" : ui.leisureRange + " km")); renderPage(); }
    if (el.id === "leisureCategory") { ui.leisureCategory = el.value || "全部"; renderPage(); }
    if (el.id === "reminderLead" || el.id === "channelInApp" || el.id === "channelEmail") { saveReminderPrefs(); }
    if (el.name === "themeScope") { state.theme.scope = el.value; saveState(); applyTheme(); }
    if (el.id === "themeUpload" && el.files && el.files[0]) uploadThemeImage(el.files[0]);
    if (el.id === "avatarUpload" && el.files && el.files[0]) uploadAvatar(el.files[0]);
    if (el.id === "eventImage" && el.files && el.files[0]) uploadEventImage(el.files[0]);
    if (el.id === "aiImage" && el.files && el.files[0]) uploadAIImage(el.files[0]);
    if (el.id === "placeImage" && el.files && el.files[0]) {
      uploadImage(el.files[0], 900, .8).then(data => {
        ui.placeDraftImage = data;
        const preview = document.getElementById("placeImagePreview"); if (preview) preview.innerHTML = '<img src="' + data + '" alt="">';
        const nameEl = document.getElementById("placeFileName"); if (nameEl) nameEl.textContent = "已添加图片";
      }).catch(err => showToast(err.message, "error"));
    }
    if (el.id === "icsFile" && el.files && el.files[0]) {
      const file = el.files[0];
      readTextFile(file).then(text => {
        const area = document.getElementById("icsText");
        if (area) area.value = text;
        const nameEl = document.getElementById("icsFileName");
        if (nameEl) nameEl.textContent = file.name;
        syncMessage("ics", "已读取 " + file.name + "，请点击「解析并应用课表」。", "success");
      }).catch(err => syncMessage("ics", err.message, "error"));
    }
  }
  function handleInput(e) {
    const el = e.target;
    if (el.id === "taskSearch") { ui.taskQuery = el.value; const card = document.getElementById("taskListCard"); if (card) card.outerHTML = taskListCardHTML(); }
    if (el.id === "feedbackText") { /* no op */ }
    if (el.id === "leisureInput") { el.style.height = "auto"; el.style.height = Math.min(115, el.scrollHeight) + "px"; }
    if (el.id === "aiName") {
      const d = ui.aiDraft; if (!d) return; d.name = el.value;
      clearTimeout(ui.aiDetectTimer);
      if (!d.name.trim()) { d.detected = null; d.types = d.userTouchedTypes ? d.types : []; updateAIDetection(); return; }
      const det = document.getElementById("aiDetection"); if (det) det.innerHTML = icon("i-sparkles") + "<span>AI 正在识别任务类型…</span>";
      ui.aiDetectTimer = setTimeout(() => {
        if (!ui.aiDraft || ui.aiDraft !== d) return;
        const result = detectTaskType(d.name);
        const est = estimateDuration(d.name, result.type, d.notes || "");
        d.detected = { type: result.type, confidence: result.confidence, reason: result.reason, duration: est };
        d.estimated = est;
        d.suggestedPriority = suggestPriority(d.name, result.type, d.dueDate);
        if (!d.userTouchedPriority) d.priority = d.suggestedPriority;
        if (!d.userTouchedTypes) d.types = [result.type];
        updateAIDetection();
      }, 460);
    }
    if (el.id === "aiNotes") {
      const d = ui.aiDraft; if (!d) return; d.notes = el.value;
      if (d.detected) { const est = estimateDuration(d.name, d.types[0] || d.detected.type, d.notes); d.detected.duration = est; d.estimated = est; updateAIDetection(); }
    }
    if (el.id === "customColorText") {
      if (/^#[0-9a-fA-F]{6}$/.test(el.value)) { state.theme = { id: "custom", color: el.value, image: state.theme.image, scope: state.theme.scope }; saveState(); applyTheme(); const picker = document.getElementById("customColorInput"); if (picker) picker.value = el.value; }
    }
    if (el.id === "customColorInput") { state.theme = { id: "custom", color: el.value, image: state.theme.image, scope: state.theme.scope }; saveState(); applyTheme(); const txt = document.getElementById("customColorText"); if (txt) txt.value = el.value; }
  }
  function handleSubmit(e) {
    if (e.target.id === "loginForm") {
      e.preventDefault();
      const email = document.getElementById("loginEmail")?.value.trim();
      const pass = document.getElementById("loginPassword")?.value || "";
      if (!email) { showToast("请填写邮箱或手机号", "error"); return; }
      if (pass.length < 6) { showToast("密码至少 6 位", "error"); return; }
      const name = state.profile.nickname || "同学";
      finishLogin({ name, email, provider: "local", createdAt: new Date().toISOString() });
      return;
    }
    if (e.target.id === "registerForm") {
      e.preventDefault();
      const name = document.getElementById("regName")?.value.trim();
      const email = document.getElementById("regEmail")?.value.trim();
      const pass = document.getElementById("regPassword")?.value || "";
      if (!name) { showToast("请填写昵称", "error"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("请输入有效的邮箱地址", "error"); return; }
      if (pass.length < 6) { showToast("密码至少 6 位", "error"); return; }
      state.profile.nickname = name;
      state.profile.email = email;
      finishLogin({ name, email, provider: "local", createdAt: new Date().toISOString() });
      return;
    }
    if (e.target.id === "bindEmailForm") { e.preventDefault(); verifyEmail(); }
    if (e.target.id === "taskForm") { e.preventDefault(); saveTaskEvent(); }
  }
  function uploadImage(file, maxW = 1000, quality = .8) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { reject(new Error("仅支持 JPG / PNG / WebP 图片")); return; }
      if (file.size > 8 * 1024 * 1024) { reject(new Error("图片不能超过 8MB")); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("图片读取失败"));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }
  async function uploadThemeImage(file) {
    try {
      const data = await uploadImage(file, 1600, .78);
      state.theme.image = data; saveState(); applyTheme(); renderPage();
      showToast("主题背景已应用", "success");
    } catch (err) { showToast(err.message, "error"); }
  }
  async function uploadAvatar(file) {
    if (!state.user) { showToast("登录后可更换账号头像", "info"); return; }
    try {
      const data = await uploadImage(file, 320, .85);
      state.profile.avatarImage = data; saveState(); updateChrome(); renderPage();
      showToast("头像已更新", "success");
    } catch (err) { showToast(err.message, "error"); }
  }
  async function uploadEventImage(file) {
    try {
      const data = await uploadImage(file, 900, .8);
      ui.eventDraftImage = data;
      const prev = document.getElementById("eventImagePreview"); if (prev) prev.innerHTML = '<img src="' + data + '" alt="">';
      const nameEl = document.getElementById("eventFileName"); if (nameEl) nameEl.textContent = "已添加图片";
      showToast("图片已添加", "success");
    } catch (err) { showToast(err.message, "error"); }
  }
  async function uploadAIImage(file) {
    try {
      const data = await uploadImage(file, 900, .8);
      if (ui.aiDraft) ui.aiDraft.image = data;
      const nameEl = document.getElementById("aiImageName"); if (nameEl) nameEl.textContent = "已添加图片";
      showToast("补充图片已添加", "success");
    } catch (err) { showToast(err.message, "error"); }
  }

  /* ---------- 侧栏 / 账号菜单 / 吉祥物 ---------- */
  function toggleSidebar(force) {
    const sidebar = document.getElementById("sidebar"), scrim = document.getElementById("sidebarScrim"), btn = document.getElementById("mobileMenuButton");
    const open = typeof force === "boolean" ? force : !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", open);
    scrim.hidden = !open;
    if (btn) btn.setAttribute("aria-expanded", String(open));
  }
  function closeSidebar() {
    const sidebar = document.getElementById("sidebar"); if (sidebar) sidebar.classList.remove("open");
    const scrim = document.getElementById("sidebarScrim"); if (scrim) scrim.hidden = true;
    const btn = document.getElementById("mobileMenuButton"); if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function openAccountPopover() {
    closeAccountPopover();
    if (!state.user) { openLogin("login"); return; }
    const pop = document.createElement("div");
    pop.className = "account-popover"; pop.id = "accountPopover";
    pop.innerHTML = '<div class="account-popover__head">' + (state.profile.avatarImage ? '<img class="account-avatar" src="' + state.profile.avatarImage + '" alt="" style="object-fit:cover">' : '<span class="account-avatar">' + escapeHTML(initials(state.user.name)) + '</span>') + '<div><strong>' + escapeHTML(state.user.name) + '</strong><small>' + escapeHTML(state.user.email) + '</small></div></div><button class="popover-item" data-page="profile">' + icon("i-user") + '个人中心</button><button class="popover-item" data-action="bind-email">' + icon("i-mail") + '绑定 / 更换邮箱</button><button class="popover-item" data-page="help">' + icon("i-help") + '帮助与反馈</button><div class="popover-divider"></div><button class="popover-item danger" data-action="logout">' + icon("i-logout") + "退出登录</button>";
    document.body.appendChild(pop);
    const btn = document.getElementById("accountButton");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }
  function closeAccountPopover() {
    const pop = document.getElementById("accountPopover");
    if (pop) pop.remove();
    const btn = document.getElementById("accountButton");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function mascotInteract() {
    const bubble = document.getElementById("mascotBubble");
    const lines = ["我是奶娃，不是奶龙，但会陪你排日程。", "抽象归抽象，DDL 还是要面对的。", "先完成最重要的一件事，剩下的会变简单。", "连续学习别超过 90 分钟，记得起来走两步～", "如果排不下，就砍掉一件不重要的。", "要不要去金沙湖吹吹风？", "你已经做得很好了，别急。"];
    if (bubble) bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
    const m = document.getElementById("mascot");
    if (m) { m.classList.add("is-talking"); clearTimeout(ui.mascotTimer); ui.mascotTimer = setTimeout(() => m.classList.remove("is-talking"), 3200); }
    const fig = document.querySelector(".mascot__figure");
    if (fig) { fig.style.transform = "scale(1.08) rotate(2deg)"; setTimeout(() => fig.style.transform = "", 260); }
  }
  function initMascot() {
    const mascot = document.getElementById("mascot");
    if (!mascot) return;
    mascot.addEventListener("mousemove", e => {
      const img = mascot.querySelector(".mascot-img");
      const r = mascot.getBoundingClientRect();
      const dx = Math.max(-3, Math.min(3, (e.clientX - (r.left + r.width / 2)) / 28));
      const dy = Math.max(-2, Math.min(2, (e.clientY - (r.top + r.height / 2)) / 34));
      if (img) img.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (dx * 1.1) + "deg)";
    });
    mascot.addEventListener("mouseleave", () => { const img = mascot.querySelector(".mascot-img"); if (img) img.style.transform = ""; });
    if (state.theme.id === "mystery" && state.profile.mascot !== false) {
      setTimeout(() => { const m = document.getElementById("mascot"); if (m) m.classList.add("is-talking"); setTimeout(() => m.classList.remove("is-talking"), 5200); }, 1800);
    }
  }

  /* ---------- 提醒检查 ---------- */
  function checkReminders() {
    if (!state.profile.reminders || !state.user) return;
    const lead = state.profile.lead || 30;
    const nowMs = Date.now();
    state.tasks.filter(t => !t.done && !t.archived && !t.deleted && t.placement && !t.reminded).forEach(t => {
      const start = atTime(fromISODate(t.placement.date), t.placement.start);
      const diff = start.getTime() - nowMs;
      if (diff > 0 && diff <= lead * 60000) {
        t.reminded = true;
        state.notifications.unshift({ id: uid("n"), type: "reminder", title: "「" + t.name + "」即将开始", body: (t.placement.start || "") + " 开始，提前 " + lead + " 分钟提醒你。邮件通道为演示模式。", createdAt: new Date().toISOString(), read: false });
        saveState(); updateChrome();
        if (ui.currentPage === "notifications" || ui.currentPage === "overview") renderPage();
        showToast("日程提醒：" + t.name, "info", 4200);
      }
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    try { localStorage.removeItem("hdu_schedule_prototype_v1"); } catch (e) {}
    state = loadState();
    applyTheme();
    updateChrome();
    const hash = (location.hash || "#overview").replace("#", "");
    ui.currentPage = ROUTES[hash] ? hash : "overview";
    // 第一次显示日程表时展示同步过程
    if (ui.currentPage === "schedule") { ui.scheduleLoaded = false; }
    renderPage();
    updateChrome();
    initMascot();
    document.addEventListener("click", e => {
      handleClick(e);
      if (!e.target.closest("#accountButton") && !e.target.closest("#accountPopover")) closeAccountPopover();
    });
    document.addEventListener("change", handleChange);
    document.addEventListener("input", handleInput);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeSidebar(); closeAccountPopover(); if (document.getElementById("modalRoot").innerHTML) { cleanAIOnClose(); closeModal(); } }
    });
    const accountBtn = document.getElementById("accountButton");
    if (accountBtn) {
      accountBtn.onclick = e => {
        e.stopPropagation();
        if (state.user) { const pop = document.getElementById("accountPopover"); if (pop) closeAccountPopover(); else openAccountPopover(); }
        else openLogin("login");
      };
    }
    const mobileBtn = document.getElementById("mobileMenuButton");
    if (mobileBtn) {
      mobileBtn.dataset.action = "toggle-sidebar";
    }
    const scrim = document.getElementById("sidebarScrim");
    if (scrim) scrim.addEventListener("click", () => closeSidebar());
    const leisureInput = document.getElementById("leisureInput");
    document.addEventListener("keydown", e => {
      if (e.target && e.target.id === "leisureInput" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendLeisure(e.target.value);
      }
    });
    window.addEventListener("hashchange", () => {
      const page = (location.hash || "#overview").replace("#", "");
      if (ROUTES[page] && page !== ui.currentPage) navigate(page, { fromHash: true });
    });
    setInterval(checkReminders, 60000);
    setTimeout(checkReminders, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
