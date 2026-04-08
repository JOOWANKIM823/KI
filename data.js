const STORAGE_KEYS = {
  members: "members",
  attendanceRecords: "attendanceRecords",
  lectureEvaluations: "lectureEvaluations",
  expenseRecords: "expenseRecords",
};

const DEFAULT_PHOTO = "/images/default.png";

const seed = {
  members: [
    { id: "m1", name: "김민수", homeId: "minsu", studentId: "01-001", department: "경영", birth: "1990-01-01", mobile: "010-1111-2222", phone: "02-1234-5678", fax: "02-111-1111", email: "minsu@example.com", photo: "", company: "오픈AI코리아", cohort: "1기", team: "A조", position: "원우", parkingEnabled: "Y", parkingNumber: "A-101", memo: "", companyAddress: "서울시 강남구", homeAddress: "서울시 송파구", applicationFile: "", introFile: "" },
    { id: "m2", name: "이서연", homeId: "seoyeon", studentId: "01-002", department: "마케팅", birth: "1991-02-02", mobile: "010-2222-3333", phone: "02-2233-4455", fax: "02-222-2222", email: "seoyeon@example.com", photo: "", company: "에이비씨", cohort: "1기", team: "B조", position: "조장", parkingEnabled: "N", parkingNumber: "", memo: "", companyAddress: "서울시 서초구", homeAddress: "서울시 성동구", applicationFile: "", introFile: "" },
const DEFAULT_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
  <rect width='100%' height='100%' fill='#e2e8f0'/><circle cx='100' cy='76' r='36' fill='#94a3b8'/>
  <rect x='44' y='124' width='112' height='54' rx='22' fill='#94a3b8'/></svg>`);

const seed = {
  members: [
    { id: "m1", name: "김민수", homeId: "minsu", phone: "010-1111-2222", email: "minsu@example.com", photoUrl: "", cohort: "1기", team: "A조", position: "원우", parkingEnabled: "Y", parkingNumber: "A-101", memo: "", admissionDocUrl: "", introDocUrl: "" },
    { id: "m2", name: "이서연", homeId: "seoyeon", phone: "010-2222-3333", email: "seoyeon@example.com", photoUrl: "", cohort: "1기", team: "B조", position: "조장", parkingEnabled: "N", parkingNumber: "", memo: "", admissionDocUrl: "", introDocUrl: "" },
  ],
  attendanceRecords: {},
  lectureEvaluations: [],
  expenseRecords: [],
};

function ensureStorage() {
  Object.entries(STORAGE_KEYS).forEach(([k, key]) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(seed[k]));
  });
}

function normalizeMembersShape(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((m, i) => ({
    id: m.id || newId("m") || `m_seed_${i}`,
    name: m.name || "",
    homeId: m.homeId || "",
    studentId: m.studentId || "",
    department: m.department || "",
    birth: m.birth || "",
    mobile: m.mobile || m.phone || "",
    phone: m.phone || m.mobile || "",
    fax: m.fax || "",
    email: m.email || "",
    photo: m.photo || m.photoUrl || (m.studentId ? `/photos/${m.studentId}.jpg` : ""),
    company: m.company || "",
    cohort: m.cohort || "",
    team: m.team || "",
    position: m.position || "",
    parkingEnabled: m.parkingEnabled || "N",
    parkingNumber: m.parkingNumber || "",
    memo: m.memo || "",
    companyAddress: m.companyAddress || "",
    homeAddress: m.homeAddress || "",
    applicationFile: m.applicationFile || m.admissionDocUrl || "",
    introFile: m.introFile || m.introDocUrl || "",
  }));
}

function getData(keyName) {
  ensureStorage();
  const key = STORAGE_KEYS[keyName];
  if (!key) return null;

  const raw = localStorage.getItem(key);
  try {
    const parsed = JSON.parse(raw);
    if (keyName === "members") return normalizeMembersShape(parsed);
    if (parsed === null || parsed === undefined) return seed[keyName];
    return parsed;
  } catch {
    return keyName === "members" ? normalizeMembersShape(seed.members) : seed[keyName];
  }
}

function setData(keyName, value) {
  const key = STORAGE_KEYS[keyName];
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(value));
function getData(keyName) {
  ensureStorage();
  const raw = localStorage.getItem(STORAGE_KEYS[keyName]);
  try { return JSON.parse(raw); } catch { return seed[keyName]; }
}

function setData(keyName, value) {
  localStorage.setItem(STORAGE_KEYS[keyName], JSON.stringify(value));
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function safeHttpUrl(value) {
  const v = (value || "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

function photoCandidates(photoUrl) {
  const safe = safeHttpUrl(photoUrl);
  return safe ? [safe, DEFAULT_PHOTO] : [DEFAULT_PHOTO];
}

function openInNewTab(url) {
  const safe = safeHttpUrl(url);
  if (!safe) return;
  window.open(safe, "_blank", "noopener,noreferrer");
}

function calculateAttendanceSummary(memberId, attendanceRecords) {
  const records = attendanceRecords && typeof attendanceRecords === "object" ? attendanceRecords : {};
  let present = 0;
  let absent = 0;
  Object.values(records).forEach((weekMap) => {
    const current = (weekMap && typeof weekMap === "object") ? weekMap[memberId] : undefined;
    if (current === "출석") present += 1;
    if (current === "결석") absent += 1;
function photoCandidates(name, photoUrl) {
  const n = encodeURIComponent((name || "").trim());
  const local = ["jpg", "jpeg", "png", "webp"].map((e) => `photos/${n}.${e}`);
  const list = [];
  if ((photoUrl || "").trim()) list.push(photoUrl.trim());
  return [...list, ...local, DEFAULT_PHOTO];
}

function openInNewTab(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function calculateAttendanceSummary(memberId, attendanceRecords) {
  let present = 0;
  let absent = 0;
  Object.values(attendanceRecords).forEach((weekMap) => {
    if (weekMap[memberId] === "출석") present += 1;
    if (weekMap[memberId] === "결석") absent += 1;
  });
  return { present, absent };
}
