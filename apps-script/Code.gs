/**
 * 뭉게뭉게 저장소 (구글 시트 + Apps Script)
 *
 * 1. 아래 SECRET을 나만 아는 비밀번호로 바꿔요. (앱에 똑같이 입력해요)
 * 2. 배포 → 새 배포 → 유형: 웹 앱
 *    - 다음 사용자 인증 정보로 실행: 나
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 * 3. 나온 웹 앱 URL(…/exec)을 앱의 "구글 시트 연결하기"에 붙여넣어요.
 *
 * 코드를 고친 뒤에는 배포 → 배포 관리 → 수정(연필) → 버전: 새 버전 → 배포를 눌러야 반영돼요.
 */
const SECRET = '여기에-비밀번호';
const SHEET_NAME = 'data';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'json', 'updatedAt']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 전부 읽기: GET ?key=비밀번호 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.key !== SECRET) return out_({ ok: false, error: 'key' });
  const values = sheet_().getDataRange().getValues();
  const docs = {};
  for (let i = 1; i < values.length; i++) {
    const id = values[i][0];
    if (!id) continue;
    try { docs[id] = JSON.parse(values[i][1]); } catch (err) {}
  }
  return out_({ ok: true, docs: docs, now: Date.now() });
}

/** 하나 저장: POST {key, id, data} (여러 개는 {key, docs:{id:data}}) */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'body' }); }
  if (body.key !== SECRET) return out_({ ok: false, error: 'key' });
  const items = body.docs ? Object.keys(body.docs).map(function (k) { return [k, body.docs[k]]; }) : [[body.id, body.data]];
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const last = Math.max(sh.getLastRow(), 1);
    const ids = sh.getRange(1, 1, last, 1).getValues().map(function (r) { return r[0]; });
    items.forEach(function (it) {
      const id = String(it[0] || '');
      if (!/^[A-Za-z0-9._-]{1,80}$/.test(id)) return;
      const json = JSON.stringify(it[1] || {});
      const row = ids.indexOf(id) + 1;
      if (row > 0) sh.getRange(row, 2, 1, 2).setValues([[json, new Date()]]);
      else { sh.appendRow([id, json, new Date()]); ids.push(id); }
    });
    return out_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
