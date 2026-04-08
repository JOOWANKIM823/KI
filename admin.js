function $(id) { return document.getElementById(id); }

const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".tab-panel")];

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
  }, 2500);
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
  return {
    id: $("memberId").value || newId("m"),
    name: $("name").value.trim(),
    homeId: $("homeId").value.trim(),
    studentId: $("studentId").value.trim(),
    department: $("department").value.trim(),
    birth: $("birth").value,
    mobile: $("mobile").value.trim(),
    phone: $("phone").value.trim(),
    fax: $("fax").value.trim(),
    email: $("email").value.trim(),
    photo: safeHttpUrl($("photo").value),
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
    return `
    <tr>
      <td>${m.name}</td>
      <td>${m.homeId}</td>
      <td>${m.mobile || "-"}<br>${m.email}</td>
      <td>${m.cohort || ""}/${m.team || ""}/${m.position || ""}</td>
      <td>${m.parkingEnabled}${m.parkingNumber ? ` (${m.parkingNumber})` : ""}</td>
      <td>
        ${hasApp ? `<button type="button" data-view-app="${m.id}">입학지원서 보기</button>` : `<button type="button" disabled>입학지원서 없음</button>`}
        ${hasIntro ? `<button type="button" data-view-intro="${m.id}">자기소개서 보기</button>` : `<button type="button" disabled>자기소개서 없음</button>`}
      </td>
      <td class="row-actions">
        <button class="edit" type="button" data-edit-member="${m.id}">회원 수정</button>
        <button class="del" type="button" data-del-member="${m.id}">회원 삭제</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="7">회원 데이터가 없습니다.</td></tr>`;

  renderAttendanceRows();
}

memberForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = memberPayload();
  let members = getData("members") || [];
  const idx = members.findIndex((m) => m.id === payload.id);
  if (idx >= 0) members[idx] = payload;
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
    return `<tr>
      <td>${m.name}</td>
      <td>${m.cohort || ""}/${m.team || ""}</td>
      <td>
        <select data-attendance-member="${m.id}">
          <option value="출석" ${status === "출석" ? "selected" : ""}>출석</option>
          <option value="결석" ${status === "결석" ? "selected" : ""}>결석</option>
        </select>
      </td>
      <td>${sum.present} / ${sum.absent}</td>
    </tr>`;
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

// 강의평가
const lectureForm = $("lectureForm");
const lectureBody = $("lectureBody");

function resetLectureForm() {
  lectureForm.reset();
  $("lectureId").value = "";
  $("lectureFormTitle").textContent = "강의평가 추가";
}

function lecturePayload() {
  return {
    id: $("lectureId").value || newId("lec"),
    week: Number($("lectureWeek").value),
    date: $("lectureDate").value,
    instructor: $("instructor").value.trim(),
    topic: $("topic").value.trim(),
    score: Number($("score").value),
    comment: $("comment").value.trim(),
  };
}

function renderLectures() {
  const filterWeek = $("lectureWeekFilter").value.trim();
  let rows = getData("lectureEvaluations") || [];
  if (filterWeek) rows = rows.filter((r) => String(r.week) === filterWeek);
  rows.sort((a, b) => (a.week - b.week) || a.date.localeCompare(b.date));

  lectureBody.innerHTML = rows.map((r) => `<tr>
    <td>${r.week}</td><td>${r.date}</td><td>${r.instructor}</td><td>${r.topic}</td><td>${r.score}</td><td>${r.comment || ""}</td>
    <td class="row-actions"><button class="edit" type="button" data-edit-lecture="${r.id}">수정</button><button class="del" type="button" data-del-lecture="${r.id}">삭제</button></td>
  </tr>`).join("") || `<tr><td colspan="7">강의평가 데이터가 없습니다.</td></tr>`;
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
  showMessage("lectureMessage", "강의평가가 저장되었습니다.");
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
    $("lectureDate").value = r.date;
    $("instructor").value = r.instructor;
    $("topic").value = r.topic;
    $("score").value = r.score;
    $("comment").value = r.comment || "";
    $("lectureFormTitle").textContent = "강의평가 수정";
  }

  if (delId) {
    if (!window.confirm("해당 강의평가를 삭제하시겠습니까?")) return;
    setData("lectureEvaluations", rows.filter((x) => x.id !== delId));
    renderLectures();
    showMessage("lectureMessage", "강의평가가 삭제되었습니다.");
  }
});

// 지출관리
const expenseForm = $("expenseForm");
const expenseBody = $("expenseBody");
const expenseSummary = $("expenseSummary");

function resetExpenseForm() {
  expenseForm.reset();
  $("expenseId").value = "";
  $("expenseFormTitle").textContent = "지출 추가";
}

function expensePayload() {
  return {
    id: $("expenseId").value || newId("exp"),
    categoryMain: $("categoryMain").value.trim(),
    categorySub: $("categorySub").value.trim(),
    expenseMonth: $("expenseMonth").value.trim(),
    expenseDate: $("expenseDate").value,
    description: $("description").value.trim(),
    amount: Number($("amount").value),
    method: $("method").value.trim(),
    note: $("note").value.trim(),
  };
}

function won(n) { return `${Number(n || 0).toLocaleString("ko-KR")}원`; }

function renderExpenses() {
  const rows = (getData("expenseRecords") || []).sort((a, b) => (a.expenseDate || "").localeCompare(b.expenseDate || ""));
  expenseBody.innerHTML = rows.map((r) => `<tr>
    <td>${r.categoryMain}</td><td>${r.categorySub}</td><td>${r.expenseMonth}</td><td>${r.expenseDate}</td><td>${r.description}</td><td>${won(r.amount)}</td><td>${r.method}</td><td>${r.note || ""}</td>
    <td class="row-actions"><button class="edit" type="button" data-edit-expense="${r.id}">수정</button><button class="del" type="button" data-del-expense="${r.id}">삭제</button></td>
  </tr>`).join("") || `<tr><td colspan="9">지출 데이터가 없습니다.</td></tr>`;

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const byMonth = rows.reduce((acc, r) => ({ ...acc, [r.expenseMonth]: (acc[r.expenseMonth] || 0) + Number(r.amount || 0) }), {});
  const byCategory = rows.reduce((acc, r) => ({ ...acc, [r.categoryMain]: (acc[r.categoryMain] || 0) + Number(r.amount || 0) }), {});

  expenseSummary.innerHTML = `
    <div><strong>전체 합계:</strong> ${won(total)}</div>
    <div><strong>월별 합계:</strong> ${Object.entries(byMonth).map(([k, v]) => `${k} ${won(v)}`).join(" | ") || "-"}</div>
    <div><strong>항목별 합계:</strong> ${Object.entries(byCategory).map(([k, v]) => `${k} ${won(v)}`).join(" | ") || "-"}</div>`;
}

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = expensePayload();
  let rows = getData("expenseRecords") || [];
  const idx = rows.findIndex((r) => r.id === payload.id);
  if (idx >= 0) rows[idx] = payload;
  else rows = [payload, ...rows];
  setData("expenseRecords", rows);
  resetExpenseForm();
  renderExpenses();
  showMessage("expenseMessage", "지출 정보가 저장되었습니다.");
});

$("expenseResetBtn").addEventListener("click", resetExpenseForm);

expenseBody.addEventListener("click", (e) => {
  const rows = getData("expenseRecords") || [];
  const editId = e.target.dataset.editExpense;
  const delId = e.target.dataset.delExpense;

  if (editId) {
    const r = rows.find((x) => x.id === editId);
    if (!r) return;
    Object.entries(r).forEach(([k, v]) => { const el = $(k); if (el) el.value = v; });
    $("expenseId").value = r.id;
    $("expenseFormTitle").textContent = "지출 수정";
  }

  if (delId) {
    if (!window.confirm("해당 지출내역을 삭제하시겠습니까?")) return;
    setData("expenseRecords", rows.filter((x) => x.id !== delId));
    renderExpenses();
    showMessage("expenseMessage", "지출 정보가 삭제되었습니다.");
  }
});

renderMembersAdmin();
renderAttendanceRows();
renderLectures();
renderExpenses();
preloadMemberFromQuery();


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
