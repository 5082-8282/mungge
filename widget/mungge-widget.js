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
  const focus = tasks.find(t => t.id === day.focus && !t.done);
  return { st, left, done: tasks.length - left.length, total: tasks.length, clouds, late, next, closeNext, color, focus, wrapped: !!day.wrapped, slots };
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
function header(w, s) {
  const row = w.addStack();
  row.centerAlignContent();
  icon(row, "cloud.fill", 12, C.accent);
  row.addSpacer(4);
  txt(row, "뭉게뭉게", 11, C.accent, "bold");
  row.addSpacer();
  icon(row, "cloud", 11, C.muted);
  row.addSpacer(2);
  txt(row, s.clouds, 11, C.ink, "bold");
}
function countdown(stack, s, size) {
  const startD = at(s.st.start), endD = at(s.st.end);
  let label, target = null;
  if (now < startD) { label = "출근까지"; target = startD; }
  else if (now < endD) { label = `퇴근(${s.st.end})까지`; target = endD; }
  else label = "오늘 근무";
  txt(stack, label, 11, C.muted, "semi");
  if (target) {
    const d = stack.addDate(target);
    d.applyTimerStyle();
    d.font = Font.boldRoundedSystemFont(size);
    d.textColor = C.ink;
    d.lineLimit = 1;
    d.minimumScaleFactor = 0.6;
  } else txt(stack, "끝! 수고했어요", size * 0.62, C.ink, "bold");
}
function status(stack, s, size) {
  const row = stack.addStack();
  row.centerAlignContent();
  if (s.late) {
    icon(row, "bell.fill", size, C.alert);
    row.addSpacer(4);
    txt(row, `${s.late} 메일·결재 확인`, size, C.alert, "bold");
  } else if (s.closeNext && mins(s.closeNext.time) - nowM <= 15) {
    icon(row, "clock.fill", size, C.accent);
    row.addSpacer(4);
    txt(row, `${s.closeNext.time} ${s.closeNext.text}`, size, C.accent, "bold");
  } else if (s.next && now >= at(s.st.start)) {
    icon(row, "envelope", size, C.muted);
    row.addSpacer(4);
    txt(row, `다음 메일·결재 ${s.next}`, size, C.muted, "semi");
  } else {
    icon(row, "checkmark.circle", size, C.muted);
    row.addSpacer(4);
    txt(row, `끝낸 일 ${s.done} / ${s.total}`, size, C.muted, "semi");
  }
}
function taskRow(stack, s, t, size) {
  const row = stack.addStack();
  row.centerAlignContent();
  const dot = txt(row, t.top ? "★" : "●", t.top ? size - 1 : size - 4, t.top ? C.accent : s.color(t.cat));
  dot.lineLimit = 1;
  row.addSpacer(5);
  txt(row, t.text, size, C.ink, t.top || (s.focus && s.focus.id === t.id) ? "semi" : "", 1);
}
function tasksBlock(stack, s, max, size) {
  const head = stack.addStack();
  txt(head, s.left.length ? `남은 할 일 ${s.left.length}` : "남은 할 일", 11, C.muted, "semi");
  stack.addSpacer(5);
  if (!s.left.length) { txt(stack, s.total ? "오늘 할 일 다 했어요!" : "앱에서 할 일을 적어주세요", size, C.accent, "semi", 2); return; }
  const list = s.focus ? [s.focus].concat(s.left.filter(t => t.id !== s.focus.id)) : s.left;
  list.slice(0, max).forEach((t, i) => { if (i) stack.addSpacer(4); taskRow(stack, s, t, size); });
  if (s.left.length > max) { stack.addSpacer(3); txt(stack, `외 ${s.left.length - max}개`, 10, C.muted); }
}

function build(s) {
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [C.bgTop, C.bgBottom];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.url = APP_URL;
  const fam = config.widgetFamily || "medium";
  w.setPadding(14, 15, 14, 15);
  header(w, s);
  w.addSpacer(6);
  if (fam === "small") {
    countdown(w, s, 26);
    w.addSpacer();
    const top = s.focus || s.left[0];
    if (s.late) status(w, s, 11);
    else if (top) { txt(w, s.focus ? "지금 하는 일" : (top.top ? "★ 1순위" : "다음 할 일"), 10, C.muted, "semi"); txt(w, top.text, 13, C.ink, "semi", 2); }
    else status(w, s, 11);
  } else {
    const body = w.addStack();
    const left = body.addStack();
    left.layoutVertically();
    left.size = new Size(fam === "large" ? 0 : 128, 0);
    countdown(left, s, 30);
    left.addSpacer();
    status(left, s, 11);
    body.addSpacer(12);
    const right = body.addStack();
    right.layoutVertically();
    right.backgroundColor = C.soft;
    right.cornerRadius = 12;
    right.setPadding(8, 10, 8, 10);
    tasksBlock(right, s, fam === "large" ? 4 : 3, 13);
    right.addSpacer();
    if (fam === "large") {
      w.addSpacer(10);
      const box = w.addStack();
      box.layoutVertically();
      box.backgroundColor = C.soft;
      box.cornerRadius = 12;
      box.setPadding(8, 10, 8, 10);
      txt(box, "마감할 때", 11, C.muted, "semi");
      box.addSpacer(4);
      const isMon = now.getDay() === 1;
      (s.st.close || []).filter(c => !c.mon || isMon).forEach(c => {
        const r = box.addStack();
        r.centerAlignContent();
        const t = txt(r, c.time || "월요일", 12, C.accent, "bold");
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
