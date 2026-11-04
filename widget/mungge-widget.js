// 뭉게뭉게 위젯 (아이폰 Scriptable 앱용)
// 앱 설정의 "위젯 코드 복사"로 복사하면 아래 두 줄이 이미 채워져 있어요.
// 직접 붙여넣었다면 구글 시트 웹 앱 URL과 비밀번호를 따옴표 안에 넣어주세요.
const SHEET_URL = "__URL__";
const SECRET = "__KEY__";
const APP_URL = "https://5082-8282.github.io/mungge/";

const C = {
  bgTop: Color.dynamic(new Color("#FBFDFF"), new Color("#1D3A57")),
  bgBottom: Color.dynamic(new Color("#E1F1FC"), new Color("#121A22")),
  ink: Color.dynamic(new Color("#1E2E3D"), new Color("#E6EEF5")),
  muted: Color.dynamic(new Color("#6B7E8F"), new Color("#93A6B7")),
  accent: Color.dynamic(new Color("#2A6FA8"), new Color("#8DC4F0")),
  alert: Color.dynamic(new Color("#E07A4F"), new Color("#F09068")),
  soft: Color.dynamic(new Color("#FFFFFF", 0.75), new Color("#FFFFFF", 0.08))
};
const CAT = { sky: "#5AAAE6", rose: "#3A6796", leaf: "#3E9DB0", tang: "#7F94DB", lilac: "#9DB4CC", sand: "#6F8699" };

const pad = n => String(n).padStart(2, "0");
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const nowM = now.getHours() * 60 + now.getMinutes();
const rk = t => t.rank || (t.top ? 1 : 0);
const mins = t => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
const at = t => { const d = new Date(now); d.setHours(Math.floor(mins(t) / 60), mins(t) % 60, 0, 0); return d; };

async function load() {
  const url = `${SHEET_URL}?key=${encodeURIComponent(SECRET)}&only=settings,d-${today}&t=${Date.now()}`;
  const req = new Request(url);
  req.timeoutInterval = 20;
  const j = await req.loadJSON();
  if (!j.ok) throw new Error(j.error === "key" ? "비밀번호가 달라요" : "불러오지 못했어요");
  return j.docs || {};
}

function summarize(docs) {
  const st = Object.assign({ start: "14:00", end: "17:50", mailEvery: 30, cats: [], close: [] }, docs.settings || {});
  const day = docs["d-" + today] || { tasks: [], checks: {} };
  const tasks = (day.tasks || []).filter(t => !t.moved && !t.dropped);
  const left = tasks.filter(t => !t.done)
    .sort((a, b) => (rk(a) || 9) - (rk(b) || 9) || (a.pri || 2) - (b.pri || 2) || (a.c || 0) - (b.c || 0));
  const checks = day.checks || {};
  const ok = t => { const c = checks[t]; return !!(c && (c.ok || (c.mail && c.appr))); };
  let clouds = 0;
  tasks.forEach(t => { if (t.done) clouds += t.top ? 2 : 1; });
  Object.keys(checks).forEach(t => { if (ok(t)) clouds += 1; });
  const step = Math.max(10, Number(st.mailEvery) || 30), slots = [];
  for (let m = mins(st.start); m < mins(st.end); m += step) slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  const late = slots.find(t => mins(t) <= nowM && nowM < mins(t) + step && !ok(t));
  const next = slots.find(t => mins(t) > nowM);
  const closeNext = (st.close || []).filter(c => c.time && mins(c.time) >= nowM)
    .sort((a, b) => mins(a.time) - mins(b.time))[0];
  const color = id => { const c = (st.cats || []).find(x => x.id === id); return new Color(CAT[(c && c.color) || "sand"] || CAT.sand); };
  const catName = id => { const c = (st.cats || []).find(x => x.id === id); return c && c.name ? String(c.name).replace(/ ?업무$/, "") : "기타"; };
  const focus = tasks.find(t => t.id === day.focus && !t.done);
  const topT = tasks.find(t => t.top);
  return { st, catName, top: topT && !topT.done ? topT : null, topDone: !!(topT && topT.done), left, done: tasks.length - left.length, total: tasks.length, clouds, late, next, closeNext, color, focus, wrapped: !!day.wrapped, slots };
}

/* ---------- 그리기 ---------- */
/* 둥근 글씨체가 없으면 기본 글씨체로 */
function mkFont(weight, size) {
  const names = weight === "bold" ? ["boldRoundedSystemFont", "boldSystemFont"]
    : weight === "semi" ? ["semiboldRoundedSystemFont", "semiboldSystemFont", "boldSystemFont"]
    : weight === "medium" ? ["mediumRoundedSystemFont", "mediumSystemFont", "regularRoundedSystemFont", "systemFont"]
    : ["regularRoundedSystemFont", "regularSystemFont", "systemFont"];
  for (const n of names) if (typeof Font[n] === "function") return Font[n](size);
  return Font.systemFont(size);
}
function txt(stack, s, size, color, weight, lines) {
  const t = stack.addText(String(s));
  t.font = mkFont(weight, size);
  t.textColor = color;
  t.lineLimit = lines || 1;
  t.minimumScaleFactor = 0.7;
  return t;
}
function icon(stack, name, size, color) {
  const sym = SFSymbol.named(name);
  sym.applyFont(Font.systemFont(size));
  const img = stack.addImage(sym.image);
  img.imageSize = new Size(size * 1.15, size);
  img.tintColor = color;
  return img;
}
/* 오늘 모은 구름이 쌓인 유리병 */
function jarImage(n) {
  const W = 120, H = 156, dc = new DrawContext();
  dc.size = new Size(W, H); dc.opaque = false; dc.respectScreenScale = true;
  const P = (x, y) => new Point(x, y);
  const body = () => { const p = new Path(); p.move(P(36, 30)); p.addLine(P(84, 30)); p.addLine(P(84, 38)); p.addQuadCurve(P(106, 68), P(106, 44)); p.addLine(P(106, 132)); p.addQuadCurve(P(90, 148), P(106, 148)); p.addLine(P(30, 148)); p.addQuadCurve(P(14, 132), P(14, 148)); p.addLine(P(14, 68)); p.addQuadCurve(P(36, 38), P(14, 44)); p.closeSubpath(); return p; };
  dc.addPath(body()); dc.setFillColor(new Color("#3D8FD1", 0.10)); dc.fillPath();
  const tints = ["#FFFFFF", "#E6F3FC", "#FFFFFF", "#CFE6F8", "#FFFFFF", "#E6F3FC"];
  const cloud = (x, y, sc, fill) => {
    dc.setFillColor(new Color(fill));
    [[7.5, 14.5, 3.6], [12, 11, 5], [16.8, 13.8, 4.2]].forEach(([cx, cy, r]) => dc.fillEllipse(new Rect(x + (cx - r) * sc, y + (cy - r) * sc, r * 2 * sc, r * 2 * sc)));
    dc.fillRect(new Rect(x + 7.5 * sc, y + 13 * sc, 9.3 * sc, 5.1 * sc));
  };
  const shown = Math.min(n, 21);
  for (let i = 0; i < shown; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const x = 14 + col * 26 + (row % 2 ? 8 : 0), y = 114 - row * 13;
    cloud(x, y + 1.3, 1.3, "#8CBDE6");
    cloud(x, y, 1.3, tints[i % tints.length]);
  }
  dc.addPath(body()); dc.setStrokeColor(new Color("#3D8FD1", 0.55)); dc.setLineWidth(2); dc.strokePath();
  const hl = new Path(); hl.move(P(24, 70)); hl.addQuadCurve(P(36, 48), P(24, 54));
  dc.addPath(hl); dc.setStrokeColor(new Color("#FFFFFF", 0.8)); dc.setLineWidth(4); dc.strokePath();
  const lid = new Path(); lid.addRoundedRect(new Rect(32, 8, 56, 15), 6, 6);
  dc.addPath(lid); dc.setFillColor(new Color("#3D8FD1")); dc.fillPath();
  const neck = new Path(); neck.addRoundedRect(new Rect(35, 23, 50, 8), 2, 2);
  dc.addPath(neck); dc.setFillColor(new Color("#9CCBEF")); dc.fillPath();
  return dc.getImage();
}
function jarBlock(stack, s, h, label, width) {
  const box = stack.addStack();
  box.layoutVertically();
  if (width) box.size = new Size(width, 0);
  box.addSpacer();
  const r = box.addStack(); r.addSpacer();
  const img = r.addImage(jarImage(s.clouds));
  img.imageSize = new Size(h * 120 / 156, h);
  r.addSpacer();
  box.addSpacer(3);
  const t = box.addStack(); t.addSpacer();
  txt(t, label ? `구름 ${s.clouds}개` : `${s.clouds}개`, 10, C.accent, "bold");
  t.addSpacer();
  box.addSpacer();
  return box;
}
/* 맨 위 줄: 이름 + 퇴근까지 남은 시간(하늘색) */
function header(w, s, showTime) {
  const row = w.addStack();
  row.centerAlignContent();
  icon(row, "cloud.fill", 10, C.accent);
  row.addSpacer(4);
  txt(row, "뭉게뭉게", 10, C.accent, "bold");
  row.addSpacer();
  if (showTime) countdown(row, s, 13);
}
function countdown(stack, s, size, stacked) {
  const startD = at(s.st.start), endD = at(s.st.end);
  const row = stack.addStack();
  if (stacked) row.layoutVertically(); else row.centerAlignContent();
  if (now < startD) txt(row, stacked ? "출근까지" : "출근까지 ", size - 3, C.muted, "semi");
  else if (now < endD) txt(row, stacked ? "퇴근까지" : "퇴근까지 ", size - 3, C.muted, "semi");
  else { txt(row, "오늘 끝! 수고했어요", size - 2, C.accent, "bold"); return; }
  const d = row.addDate(now < startD ? startD : endD);
  d.applyTimerStyle();
  d.font = mkFont("bold", size);
  d.textColor = C.accent;
  d.lineLimit = 1;
  d.minimumScaleFactor = 0.7;
}
/* 흰 박스: 남은 할 일을 순위 순서대로 (카테고리 색 점 + 순위는 글씨 굵기) */
function listBox(parent, s, opt) {
  const box = parent.addStack();
  box.layoutVertically();
  box.backgroundColor = C.soft;
  box.cornerRadius = 12;
  box.setPadding(opt.pad, opt.pad + 2, opt.pad, opt.pad + 2);
  const head = box.addStack();
  head.centerAlignContent();
  txt(head, "오늘 할 일", 9.5, C.muted, "semi");
  head.addSpacer();
  if (s.total) txt(head, `${s.done}/${s.total}`, 9.5, C.muted, "semi");
  box.addSpacer(5);
  if (!s.left.length) {
    txt(box, s.total ? "오늘 할 일 다 했어요!" : "앱에서 할 일을 적어주세요", opt.size, C.accent, "semi", 2);
    box.addSpacer();
    return box;
  }
  s.left.slice(0, opt.max).forEach((t, i) => {
    if (i) box.addSpacer(opt.gap);
    const row = box.addStack();
    row.centerAlignContent();
    txt(row, "●", 6.5, s.color(t.cat));
    row.addSpacer(5);
    /* 순위는 숫자 대신 글씨 굵기로: 1순위 가장 굵게 → 2순위 → 3순위 → 나머지 보통 */
    txt(row, t.text, opt.size, C.ink, ["", "bold", "semi", "medium"][rk(t)] || "", 1);
  });
  if (s.left.length > opt.max) { box.addSpacer(opt.gap); txt(box, `외 ${s.left.length - opt.max}개`, 9.5, C.muted); }
  box.addSpacer();
  return box;
}

function build(s) {
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [C.bgTop, C.bgBottom];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.url = APP_URL;
  const fam = config.widgetFamily || "medium";
  /* 가장자리 여백 넉넉하게 */
  w.setPadding(17, 18, 17, 18);
  if (fam === "small") {
    header(w, s, false);
    w.addSpacer(4);
    const top = w.addStack();
    top.centerAlignContent();
    const col = top.addStack(); col.layoutVertically();
    countdown(col, s, 15, true);
    top.addSpacer();
    const img = top.addImage(jarImage(s.clouds));
    img.imageSize = new Size(34, 44);
    w.addSpacer(6);
    listBox(w, s, { pad: 7, size: 10.5, max: 2, gap: 3 });
  } else {
    header(w, s, true);
    w.addSpacer(8);
    const body = w.addStack();
    /* 병 1/3 : 할 일 2/3 (중간 위젯 안쪽 너비 약 300pt 기준) */
    jarBlock(body, s, fam === "large" ? 104 : 78, true, fam === "large" ? 100 : 92);
    body.addSpacer(10);
    listBox(body, s, { pad: fam === "large" ? 8 : 7, size: fam === "large" ? 12 : 11, max: fam === "large" ? 6 : 4, gap: fam === "large" ? 5 : 3 });
    if (fam === "large") {
      w.addSpacer(10);
      const box = w.addStack();
      box.layoutVertically();
      box.backgroundColor = C.soft;
      box.cornerRadius = 12;
      box.setPadding(8, 10, 8, 10);
      txt(box, "마감할 때", 9.5, C.muted, "semi");
      box.addSpacer(4);
      const isMon = now.getDay() === 1;
      (s.st.close || []).filter(c => !c.mon || isMon).forEach(c => {
        const r = box.addStack();
        r.centerAlignContent();
        txt(r, c.time || "월요일", 11, C.accent, "bold");
        r.addSpacer(8);
        txt(r, c.text, 11, c.time && mins(c.time) < nowM ? C.muted : C.ink);
        box.addSpacer(3);
      });
      box.addSpacer();
    }
  }
  /* 출근·퇴근 시간과 15분마다 다시 그려요 (아이폰이 정확한 시간은 조절해요) */
  const marks = [at(s.st.start), at(s.st.end)].filter(d => d > now).sort((a, b) => a - b);
  const soon = new Date(Date.now() + 15 * 60 * 1000);
  w.refreshAfterDate = marks[0] && marks[0] < soon ? marks[0] : soon;
  return w;
}

function errorWidget(msg) {
  const w = new ListWidget();
  w.backgroundColor = C.bgBottom;
  w.url = APP_URL;
  const row = w.addStack();
  icon(row, "cloud.fill", 14, C.accent);
  row.addSpacer(4);
  txt(row, "뭉게뭉게", 12, C.accent, "bold");
  w.addSpacer(8);
  txt(w, msg, 13, C.ink, "semi", 3);
  w.addSpacer();
  txt(w, "앱 설정에서 위젯 코드를 다시 복사해 주세요", 10, C.muted, "", 2);
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return w;
}

let widget;
if (!/^https:\/\/script\.google/.test(SHEET_URL)) widget = errorWidget("구글 시트 웹 앱 URL이 아직 없어요");
else {
  try { widget = build(summarize(await load())); }
  catch (e) { widget = errorWidget(String(e.message || e).includes("비밀번호") ? e.message : "인터넷 연결을 확인해 주세요"); }
}
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
