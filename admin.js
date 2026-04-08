function $(id) { return document.getElementById(id); }

const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".tab-panel")];
let parsedUploadRows = [];

const EXCEL_HEADER_MAP = {
  "No.": "no",
  "이름": "name",
  "기수": "cohort",
  "학번": "studentId",
  "분과": "department",
  "분야": "field",
  "소속": "company",
  "직위": "position",
  "사업자번호": "businessNumber",
  "회원사": "memberType",
  "생년월일": "birth",
  "휴대전화": "mobile",
  "이메일": "email",
  "전화": "phone",
  "팩스": "fax",
  "회사주소": "companyAddress",
  "자택주소": "homeAddress",
  "사진": "photo",
  "사진URL": "photo",
  "photo": "photo",
};

function switchTab(name) {
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  panels.forEach((p) => p.classList.toggle("active", p.id === `tab-${name}`));
}

tabs.forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

function showMessage(id, message) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  setTimeout(() => {
    if (el.textContent === message) el.textContent = "";
  }, 3000);
}

// 회원관리
const memberForm = $("memberForm");
const memberAdminBody = $("memberAdminBody");

function resetMemberForm() {
  memberForm.reset();
  $("memberId").value = "";
  $("memberFormTitle").textContent = "회원 추가";
}

function memberPayload() {
  const studentId = $("studentId").value.trim();
  return {
    id: $("memberId").value || newId("m"),
    name: $("name").value.trim(),
    homeId: $("homeId").value.trim(),
    studentId,
    department: $("department").value.trim(),
    birth: $("birth").value,
    mobile: $("mobile").value.trim(),
    phone: $("phone").value.trim(),
    fax: $("fax").value.trim(),
    email: $("email").value.trim(),
    photo: safeHttpUrl($("photo").value) || (studentId ? `/photos/${studentId}.jpg` : ""),
    company: $("company").value.trim(),
    cohort: $("cohort").value.trim(),
    team: $("team").value.trim(),
    position: $("position").value.trim(),
    parkingEnabled: $("parkingEnabled").value,
    parkingNumber: $("parkingNumber").value.trim(),
    memo: $("memo").value.trim(),
    companyAddress: $("companyAddress").value.trim(),
    homeAddress: $("homeAddress").value.trim(),
    applicationFile: safeHttpUrl($("applicationFile").value),
    introFile: safeHttpUrl($("introFile").value),
  };
}

function renderMembersAdmin() {
  const members = getData("members") || [];
  memberAdminBody.innerHTML = members.map((m) => {
    const hasApp = !!safeHttpUrl(m.applicationFile);
    const hasIntro = !!safeHttpUrl(m.introFile);
    const imgSrc = photoCandidates(m.photo)[0];
    return `
    <tr>
      <td><img class="photo-mini" src="${imgSrc}" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}'" alt="${m.name || ""}"/></td>
      <td>${m.name}</td>
      <td>${m.cohort || ""}</td>
      <td>${m.position || ""}</td>
      <td>${m.phone || m.mobile || "-"}</td>
      <td><a class="btn-link" href="member.html?id=${m.id}">상세 조회</a></td>
      <td>
        ${hasApp ? `<button type="button" data-view-app="${m.id}">입학지원서 보기</button>` : `<button type="button" disabled>입학지원서 없음</button>`}
        ${hasIntro ? `<button type="button" data-view-intro="${m.id}">자기소개서 보기</button>` : `<button type="button" disabled>자기소개서 없음</button>`}
      </td>
      <td class="row-actions">
        <button class="edit" type="button" data-edit-member="${m.id}">회원 수정</button>
        <button class="del" type="button" data-del-member="${m.id}">회원 삭제</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="8">회원 데이터가 없습니다.</td></tr>`;

  renderAttendanceRows();
}

memberForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = memberPayload();
  let members = getData("members") || [];
  const idx = members.findIndex((m) => m.id === payload.id);
  if (idx >= 0) members[idx] = { ...members[idx], ...payload };
  else members = [payload, ...members];
  setData("members", members);
  resetMemberForm();
  renderMembersAdmin();
  showMessage("memberMessage", "회원 정보가 저장되었습니다.");
});

$("memberResetBtn").addEventListener("click", resetMemberForm);

memberAdminBody.addEventListener("click", (e) => {
  const members = getData("members") || [];
  const editId = e.target.dataset.editMember;
  const delId = e.target.dataset.delMember;
  const appId = e.target.dataset.viewApp;
  const introId = e.target.dataset.viewIntro;

  if (editId) {
    const m = members.find((x) => x.id === editId);
    if (!m) return;
    Object.entries(m).forEach(([k, v]) => {
      const el = $(k);
      if (el) el.value = v || "";
    });
    $("memberId").value = m.id;
    $("memberFormTitle").textContent = "회원 수정";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (delId) {
    if (!window.confirm("해당 회원을 삭제하시겠습니까?")) return;
    setData("members", members.filter((m) => m.id !== delId));
    renderMembersAdmin();
    showMessage("memberMessage", "회원 정보가 삭제되었습니다.");
  }

  if (appId) openInNewTab((members.find((m) => m.id === appId) || {}).applicationFile);
  if (introId) openInNewTab((members.find((m) => m.id === introId) || {}).introFile);
});

// 엑셀 업로드
const excelFileInput = $("excelFileInput");
const excelPreviewBody = $("excelPreviewBody");

function normalizeExcelRow(raw, rowNumber) {
  const row = {};
  Object.entries(raw).forEach(([k, v]) => {
    const key = EXCEL_HEADER_MAP[(k || "").toString().trim()];
    if (key) row[key] = (v ?? "").toString().trim();
  });

  const name = row.name || "";
  const studentId = row.studentId || "";
  if (!name || !studentId) {
    return { error: `${rowNumber}행: 필수값(이름/학번) 누락` };
  }

  return {
    data: {
      id: newId("m"),
      name,
      studentId,
      cohort: row.cohort || "",
      department: row.department || "",
      field: row.field || "",
      company: row.company || "",
      position: row.position || "",
      businessNumber: row.businessNumber || "",
      memberType: row.memberType || "",
      birth: row.birth || "",
      mobile: row.mobile || row.phone || "",
      phone: row.phone || row.mobile || "",
      fax: row.fax || "",
      email: row.email || "",
      companyAddress: row.companyAddress || "",
      homeAddress: row.homeAddress || "",
      homeId: "",
      team: "",
      parkingEnabled: "",
      parkingNumber: "",
      memo: "",
      applicationFile: "",
      introFile: "",
      photo: safeImageSrc(row.photo) || `/photos/${studentId}.jpg`,
    },
  };
}

function renderExcelPreview() {
  if (!parsedUploadRows.length) {
    excelPreviewBody.innerHTML = `<tr><td colspan="7">업로드된 데이터가 없습니다.</td></tr>`;
    return;
  }

  excelPreviewBody.innerHTML = parsedUploadRows.map((r) => `
    <tr>
      <td>${r.name}</td>
      <td>${r.studentId}</td>
      <td>${r.cohort || ""}</td>
      <td>${r.team || ""}</td>
      <td>${r.position || ""}</td>
      <td>${r.homeId || ""}</td>
      <td><img class="photo-mini" src="${photoCandidates(r.photo)[0]}" onerror="this.onerror=null;this.src='${DEFAULT_PHOTO}'" alt="${r.name}"/></td>
    </tr>
  `).join("");
}

function parseExcelFile(file) {
  if (!file) {
    showMessage("excelMessage", "파일을 선택해 주세요.");
    return;
  }
  if (typeof XLSX === "undefined") {
    showMessage("excelMessage", "엑셀 파서 로드 실패: 네트워크 상태를 확인해 주세요.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!json.length) {
        parsedUploadRows = [];
        renderExcelPreview();
        showMessage("excelMessage", "데이터가 비어 있습니다.");
        return;
      }

      const headers = Object.keys(json[0]).map((k) => k?.toString().trim());
      const requiredHeaders = ["이름", "학번"];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
      if (missingHeaders.length) {
        showMessage("excelMessage", `필수 컬럼 누락: ${missingHeaders.join(", ")}. 필요 컬럼: 이름, 기수, 학번, 분과, 분야, 소속, 직위, 사업자번호, 회원사, 생년월일, 휴대전화, 이메일, 전화, 팩스, 회사주소, 자택주소`);
        return;
      }

      const errors = [];
      parsedUploadRows = [];
      json.forEach((row, idx) => {
        const result = normalizeExcelRow(row, idx + 2);
        if (result.error) errors.push(result.error);
        else parsedUploadRows.push(result.data);
      });

      renderExcelPreview();
      const errorText = errors.length ? ` / 실패 ${errors.length}건 (${errors.slice(0, 5).join("; ")}${errors.length > 5 ? " ..." : ""})` : "";
      showMessage("excelMessage", `파싱 완료: 성공 ${parsedUploadRows.length}건${errorText}`);
    } catch (err) {
      showMessage("excelMessage", `파싱 실패: ${err.message}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyUpload(mode) {
  if (!parsedUploadRows.length) {
    showMessage("excelMessage", "적용할 업로드 데이터가 없습니다.");
    return;
  }

  if (mode === "overwrite") {
    const normalized = parsedUploadRows.map((r) => ({ ...r, id: newId("m") }));
    setData("members", normalized);
    renderMembersAdmin();
    showMessage("excelMessage", `전체 덮어쓰기 완료: ${normalized.length}건 저장`);
    return;
  }

  let members = getData("members") || [];
  let added = 0;
  let updated = 0;

  parsedUploadRows.forEach((row) => {
    const idx = members.findIndex((m) => m.studentId === row.studentId);
    if (idx >= 0) {
      members[idx] = { ...members[idx], ...row, id: members[idx].id };
      updated += 1;
    } else {
      members.push({ ...row, id: newId("m") });
      added += 1;
    }
  });

  setData("members", members);
  renderMembersAdmin();
  showMessage("excelMessage", `추가 완료: 신규 ${added}건, 갱신 ${updated}건`);
}

$("excelParseBtn").addEventListener("click", () => parseExcelFile(excelFileInput.files[0]));
$("excelAppendBtn").addEventListener("click", () => applyUpload("append"));
$("excelOverwriteBtn").addEventListener("click", () => {
  if (!window.confirm("기존 회원 데이터를 모두 덮어쓰시겠습니까?")) return;
  applyUpload("overwrite");
});

// 출석관리
const attendanceBody = $("attendanceBody");
function renderAttendanceRows() {
  const week = String($("attendanceWeek")?.value || "1");
  const members = getData("members") || [];
  const all = getData("attendanceRecords") || {};
  const weekRecord = all[week] || {};
  attendanceBody.innerHTML = members.map((m) => {
    const sum = calculateAttendanceSummary(m.id, all);
    const status = weekRecord[m.id] || "출석";
    return `<tr><td>${m.name}</td><td>${m.cohort || ""}/${m.team || ""}</td><td><select data-attendance-member="${m.id}"><option value="출석" ${status === "출석" ? "selected" : ""}>출석</option><option value="결석" ${status === "결석" ? "selected" : ""}>결석</option></select></td><td>${sum.present} / ${sum.absent}</td></tr>`;
  }).join("") || `<tr><td colspan="4">회원이 없습니다.</td></tr>`;
}

$("loadAttendanceBtn").addEventListener("click", renderAttendanceRows);
$("saveAttendanceBtn").addEventListener("click", () => {
  const week = String($("attendanceWeek").value || "1");
  const all = getData("attendanceRecords") || {};
  const weekRecord = {};
  document.querySelectorAll("[data-attendance-member]").forEach((sel) => {
    weekRecord[sel.dataset.attendanceMember] = sel.value;
  });
  all[week] = weekRecord;
  setData("attendanceRecords", all);
  renderAttendanceRows();
  alert("출석 저장 완료");
});

// 강의평가 (요약형)
const lectureForm = $("lectureForm");
const lectureBody = $("lectureBody");
const lectureComments = $("lectureComments");

function resetLectureForm() {
  lectureForm.reset();
  $("lectureId").value = "";
  $("lectureFormTitle").textContent = "강사 평가 추가";
}

function lecturePayload() {
  return {
    id: $("lectureId").value || newId("lec"),
    week: Number($("lectureWeek").value),
    instructor: $("instructor").value.trim(),
    topic: $("topic").value.trim(),
    score: Number($("score").value),
    rank: Number($("rank").value),
    comment: $("comment").value.trim(),
  };
}

function getFilteredLectures() {
  const filterWeek = $("lectureWeekFilter").value.trim();
  let rows = getData("lectureEvaluations") || [];
  if (filterWeek) rows = rows.filter((r) => String(r.week) === filterWeek);
  rows.sort((a, b) => (b.score - a.score) || (a.rank - b.rank) || a.instructor.localeCompare(b.instructor));
  return rows;
}

function renderLectures() {
  const rows = getFilteredLectures();

  lectureBody.innerHTML = rows.map((r, idx) => {
    const ranking = r.rank || (idx + 1);
    return `<tr>
      <td>${ranking}</td>
      <td>${r.instructor}</td>
      <td>${r.topic}</td>
      <td>${r.score}</td>
      <td class="row-actions"><button class="edit" type="button" data-edit-lecture="${r.id}">수정</button><button class="del" type="button" data-del-lecture="${r.id}">삭제</button></td>
    </tr>`;
  }).join("") || `<tr><td colspan="5">강의평가 데이터가 없습니다.</td></tr>`;

  lectureComments.innerHTML = rows
    .map((r) => `<div class="comment-item"><strong>[${r.week}주차] ${r.instructor} - ${r.topic}</strong><p>${r.comment || "코멘트 없음"}</p></div>`)
    .join("") || `<p class="muted">표시할 코멘트가 없습니다.</p>`;
}

lectureForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = lecturePayload();
  let rows = getData("lectureEvaluations") || [];
  const idx = rows.findIndex((r) => r.id === payload.id);
  if (idx >= 0) rows[idx] = payload;
  else rows = [payload, ...rows];
  setData("lectureEvaluations", rows);
  resetLectureForm();
  renderLectures();
  showMessage("lectureMessage", "강사 평가가 저장되었습니다.");
});

$("lectureResetBtn").addEventListener("click", resetLectureForm);
$("lectureFilterBtn").addEventListener("click", renderLectures);

lectureBody.addEventListener("click", (e) => {
  const rows = getData("lectureEvaluations") || [];
  const editId = e.target.dataset.editLecture;
  const delId = e.target.dataset.delLecture;

  if (editId) {
    const r = rows.find((x) => x.id === editId);
    if (!r) return;
    $("lectureId").value = r.id;
    $("lectureWeek").value = r.week;
    $("instructor").value = r.instructor;
    $("topic").value = r.topic;
    $("score").value = r.score;
    $("rank").value = r.rank || "";
    $("comment").value = r.comment || "";
    $("lectureFormTitle").textContent = "강사 평가 수정";
  }

  if (delId) {
    if (!window.confirm("해당 강사 평가를 삭제하시겠습니까?")) return;
    setData("lectureEvaluations", rows.filter((x) => x.id !== delId));
    renderLectures();
    showMessage("lectureMessage", "강사 평가가 삭제되었습니다.");
  }
});

// 지출관리
const expenseForm = $("expenseForm");
const expenseBody = $("expenseBody");
const expenseSummary = $("expenseSummary");
function resetExpenseForm() { expenseForm.reset(); $("expenseId").value = ""; $("expenseFormTitle").textContent = "지출 추가"; }
function expensePayload() { return { id: $("expenseId").value || newId("exp"), categoryMain: $("categoryMain").value.trim(), categorySub: $("categorySub").value.trim(), expenseMonth: $("expenseMonth").value.trim(), expenseDate: $("expenseDate").value, description: $("description").value.trim(), amount: Number($("amount").value), method: $("method").value.trim(), note: $("note").value.trim() }; }
function won(n) { return `${Number(n || 0).toLocaleString("ko-KR")}원`; }
function renderExpenses() {
  const rows = (getData("expenseRecords") || []).sort((a, b) => (a.expenseDate || "").localeCompare(b.expenseDate || ""));
  expenseBody.innerHTML = rows.map((r) => `<tr><td>${r.categoryMain}</td><td>${r.categorySub}</td><td>${r.expenseMonth}</td><td>${r.expenseDate}</td><td>${r.description}</td><td>${won(r.amount)}</td><td>${r.method}</td><td>${r.note || ""}</td><td class="row-actions"><button class="edit" type="button" data-edit-expense="${r.id}">수정</button><button class="del" type="button" data-del-expense="${r.id}">삭제</button></td></tr>`).join("") || `<tr><td colspan="9">지출 데이터가 없습니다.</td></tr>`;
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const byMonth = rows.reduce((acc, r) => ({ ...acc, [r.expenseMonth]: (acc[r.expenseMonth] || 0) + Number(r.amount || 0) }), {});
  const byCategory = rows.reduce((acc, r) => ({ ...acc, [r.categoryMain]: (acc[r.categoryMain] || 0) + Number(r.amount || 0) }), {});
  expenseSummary.innerHTML = `<div><strong>전체 합계:</strong> ${won(total)}</div><div><strong>월별 합계:</strong> ${Object.entries(byMonth).map(([k, v]) => `${k} ${won(v)}`).join(" | ") || "-"}</div><div><strong>항목별 합계:</strong> ${Object.entries(byCategory).map(([k, v]) => `${k} ${won(v)}`).join(" | ") || "-"}</div>`;
}
expenseForm.addEventListener("submit", (e) => { e.preventDefault(); const payload = expensePayload(); let rows = getData("expenseRecords") || []; const idx = rows.findIndex((r) => r.id === payload.id); if (idx >= 0) rows[idx] = payload; else rows = [payload, ...rows]; setData("expenseRecords", rows); resetExpenseForm(); renderExpenses(); showMessage("expenseMessage", "지출 정보가 저장되었습니다."); });
$("expenseResetBtn").addEventListener("click", resetExpenseForm);
expenseBody.addEventListener("click", (e) => { const rows = getData("expenseRecords") || []; const editId = e.target.dataset.editExpense; const delId = e.target.dataset.delExpense; if (editId) { const r = rows.find((x) => x.id === editId); if (!r) return; Object.entries(r).forEach(([k, v]) => { const el = $(k); if (el) el.value = v; }); $("expenseId").value = r.id; $("expenseFormTitle").textContent = "지출 수정"; } if (delId) { if (!window.confirm("해당 지출내역을 삭제하시겠습니까?")) return; setData("expenseRecords", rows.filter((x) => x.id !== delId)); renderExpenses(); showMessage("expenseMessage", "지출 정보가 삭제되었습니다."); } });

function preloadMemberFromQuery() {
  const id = new URLSearchParams(window.location.search).get("memberId");
  if (!id) return;
  const members = getData("members") || [];
  const m = members.find((x) => x.id === id);
  if (!m) return;
  Object.entries(m).forEach(([k, v]) => {
    const el = $(k);
    if (el) el.value = v || "";
  });
  $("memberId").value = m.id;
  $("memberFormTitle").textContent = "회원 수정";
  switchTab("members");
}

renderMembersAdmin();
renderAttendanceRows();
renderLectures();
renderExpenses();
preloadMemberFromQuery();
renderExcelPreview();
