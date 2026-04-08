const STORAGE_KEYS = {
  members: "members",
  attendanceRecords: "attendanceRecords",
  lectureEvaluations: "lectureEvaluations",
  expenseRecords: "expenseRecords",
};

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
