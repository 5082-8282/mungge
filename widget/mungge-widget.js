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
    .sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0) || (a.pri || 2) - (b.pri || 2) || (a.c || 0) - (b.c || 0));
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
  return { st, catName, left, done: tasks.length - left.length, total: tasks.length, clouds, late, next, closeNext, color, focus, wrapped: !!day.wrapped, slots };
}

/* ---------- 그리기 ---------- */
function txt(stack, s, size, color, weight, lines) {
  const t = stack.addText(String(s));
  t.font = weight === "bold" ? Font.boldRoundedSystemFont(size) : weight === "semi" ? Font.semiboldRoundedSystemFont(size) : Font.roundedSystemFont(size);
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
function jarBlock(stack, s, h) {
  const box = stack.addStack();
  box.layoutVertically();
  const r = box.addStack(); r.addSpacer();
  const img = r.addImage(jarImage(s.clouds));
  img.imageSize = new Size(h * 120 / 156, h);
  r.addSpacer();
  box.addSpacer(2);
  const t = box.addStack(); t.addSpacer();
  txt(t, `구름 ${s.clouds}개`, 11, C.accent, "bold");
  t.addSpacer();
  return box;
}
function header(w, compact) {
  const row = w.addStack();
  row.centerAlignContent();
  icon(row, "cloud.fill", 11, C.accent);
  row.addSpacer(4);
  txt(row, "뭉게뭉게", 11, C.accent, "bold");
  row.addSpacer();
}
/* 남은 시간: 작게, 하늘색 */
function countdown(stack, s, size, stacked) {
  const startD = at(s.st.start), endD = at(s.st.end);
  const row = stack.addStack();
  if (stacked) row.layoutVertically(); else row.centerAlignContent();
  if (now < startD) { txt(row, stacked ? "출근까지" : "출근까지 ", size - 3, C.muted, "semi"); }
  else if (now < endD) { txt(row, stacked ? "퇴근까지" : "퇴근까지 ", size - 3, C.muted, "semi"); }
  else { txt(row, stacked ? "오늘 끝!" : "오늘 근무 끝! 수고했어요", size - 1, C.accent, "bold"); return; }
  const d = row.addDate(now < startD ? startD : endD);
  d.applyTimerStyle();
  d.font = Font.boldRoundedSystemFont(size);
  d.textColor = C.accent;
  d.lineLimit = 1;
  d.minimumScaleFactor = 0.7;
}
function status(stack, s, size) {
  const row = stack.addStack();
  row.centerAlignContent();
  if (s.late) {
    icon(row, "bell.fill", size, C.alert); row.addSpacer(4);
    txt(row, `${s.late} 메일·결재 확인`, size, C.alert, "bold");
  } else if (s.closeNext && mins(s.closeNext.time) - nowM <= 15) {
    icon(row, "clock.fill", size, C.accent); row.addSpacer(4);
    txt(row, `${s.closeNext.time} ${s.closeNext.text}`, size, C.accent, "bold");
  } else if (s.next && now >= at(s.st.start)) {
    icon(row, "envelope", size, C.muted); row.addSpacer(4);
    txt(row, `다음 메일·결재 ${s.next}`, size, C.muted, "semi");
  } else {
    icon(row, "checkmark.circle", size, C.muted); row.addSpacer(4);
    txt(row, `끝낸 일 ${s.done} / ${s.total}`, size, C.muted, "semi");
  }
}
/* 남은 할 일 요약: 1순위 한 줄 + 카테고리별 개수 */
function summaryBlock(stack, s, perRow) {
  const head = stack.addStack();
  head.centerAlignContent();
  txt(head, "남은 할 일 ", 11, C.muted, "semi");
  txt(head, `${s.left.length}개`, 12, C.ink, "bold");
  if (s.total) { head.addSpacer(); txt(head, `${s.done}/${s.total} 끝`, 10, C.muted); }
  stack.addSpacer(5);
  if (!s.left.length) { txt(stack, s.total ? "오늘 할 일 다 했어요!" : "앱에서 할 일을 적어주세요", 12, C.accent, "semi", 2); return; }
  const lead = s.focus || s.left[0];
  const r = stack.addStack(); r.centerAlignContent();
  txt(r, s.focus ? "▶" : (lead.top ? "★" : "●"), 11, s.focus || lead.top ? C.accent : s.color(lead.cat));
  r.addSpacer(4);
  txt(r, lead.text, 12.5, C.ink, "semi");
  stack.addSpacer(6);
  const counts = {};
  s.left.forEach(t => { counts[t.cat] = (counts[t.cat] || 0) + 1; });
  const order = (s.st.cats || []).map(c => c.id).filter(id => counts[id]).concat(Object.keys(counts).filter(id => !(s.st.cats || []).some(c => c.id === id)));
  for (let i = 0; i < order.length; i += perRow) {
    const line = stack.addStack(); line.centerAlignContent();
    order.slice(i, i + perRow).forEach((id, j) => {
      if (j) line.addSpacer(10);
      txt(line, "●", 8, s.color(id));
      line.addSpacer(3);
      txt(line, s.catName(id), 11, C.ink);
      line.addSpacer(3);
      txt(line, counts[id], 11, C.ink, "bold");
    });
    stack.addSpacer(3);
  }
}

function build(s) {
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [C.bgTop, C.bgBottom];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.url = APP_URL;
  const fam = config.widgetFamily || "medium";
  w.setPadding(13, 14, 13, 14);
  header(w);
  w.addSpacer(6);
  if (fam === "small") {
    const top = w.addStack();
    const col = top.addStack(); col.layoutVertically();
    countdown(col, s, 16, true);
    col.addSpacer(4);
    txt(col, `남은 할 일 ${s.left.length}개`, 11, C.ink, "semi");
    top.addSpacer();
    jarBlock(top, s, 58);
    w.addSpacer();
    if (s.late) status(w, s, 11);
    else if (s.left.length) {
      const lead = s.focus || s.left[0];
      const r = w.addStack(); r.centerAlignContent();
      txt(r, s.focus ? "▶" : (lead.top ? "★" : "●"), 10, s.focus || lead.top ? C.accent : s.color(lead.cat));
      r.addSpacer(4);
      txt(r, lead.text, 12, C.ink, "semi", 2);
    } else status(w, s, 11);
  } else {
    const body = w.addStack();
    jarBlock(body, s, fam === "large" ? 110 : 92);
    body.addSpacer(14);
    const right = body.addStack();
    right.layoutVertically();
    countdown(right, s, 17);
    right.addSpacer(8);
    summaryBlock(right, s, 2);
    right.addSpacer();
    status(right, s, 11);
    if (fam === "large") {
      w.addSpacer(12);
      const box = w.addStack();
      box.layoutVertically();
      box.backgroundColor = C.soft;
      box.cornerRadius = 12;
      box.setPadding(9, 11, 9, 11);
      txt(box, "마감할 때", 11, C.muted, "semi");
      box.addSpacer(5);
      const isMon = now.getDay() === 1;
      (s.st.close || []).filter(c => !c.mon || isMon).forEach(c => {
        const r = box.addStack();
        r.centerAlignContent();
        txt(r, c.time || "월요일", 12, C.accent, "bold");
        r.addSpacer(8);
        txt(r, c.text, 12, c.time && mins(c.time) < nowM ? C.muted : C.ink);
        box.addSpacer(3);
      });
      box.addSpacer();
    }
  }
  /* 시작·퇴근·다음 확인 시간에 맞춰 다시 그려요 (아이폰이 정확한 시간은 조절해요) */
  const marks = [at(s.st.start), at(s.st.end)].concat(s.slots.map(at)).filter(d => d > now).sort((a, b) => a - b);
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
