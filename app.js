/**
 * KODA-ARP 관리자 전용 백오피스 앱
 * - members.json 데이터를 기반으로 카드형 UI를 렌더링
 * - 검색/필터/정렬/상세패널/추가/수정/삭제 제공
 * - 파일 저장은 불가하므로 로컬스토리지 오버레이 방식을 사용
 */

const DATA_URL = "data/members.json";
const PHOTO_DIR = "photos";
const PDF_DIR = "pdfs";
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'><rect width='320' height='240' fill='#e6ebf3'/><circle cx='160' cy='92' r='38' fill='#b6c2d4'/><rect x='72' y='150' width='176' height='54' rx='27' fill='#b6c2d4'/><text x='160' y='224' fill='#6a788f' font-size='16' text-anchor='middle'>NO PHOTO</text></svg>`
  );

const FIELD_META = [
  ["no", "No."],
  ["cohort", "기수"],
  ["name", "이름"],
  ["studentId", "학번"],
  ["division", "분과"],
  ["field", "분야"],
  ["company", "소속"],
  ["title", "직위"],
  ["businessNumber", "사업자번호"],
  ["memberType", "회원사"],
  ["birthDate", "생년월일"],
  ["mobile", "휴대전화"],
  ["email", "이메일"],
  ["phone", "전화"],
  ["fax", "팩스"],
  ["companyAddress", "회사주소"],
  ["homeAddress", "자택주소"],
];

const state = {
  members: [],
  filtered: [],
  selectedId: null,
  editingId: null,
};

const el = {
  totalCount: document.getElementById("totalCount"),
  divisionCount: document.getElementById("divisionCount"),
  memberCompanyCount: document.getElementById("memberCompanyCount"),
  filteredCount: document.getElementById("filteredCount"),
  memberGrid: document.getElementById("memberGrid"),
  cardTemplate: document.getElementById("memberCardTemplate"),
  searchInput: document.getElementById("searchInput"),
  cohortFilter: document.getElementById("cohortFilter"),
  divisionFilter: document.getElementById("divisionFilter"),
  memberTypeFilter: document.getElementById("memberTypeFilter"),
  sortBy: document.getElementById("sortBy"),
  detailPanel: document.getElementById("detailPanel"),
  detailBody: document.getElementById("detailBody"),
  closeDetailBtn: document.getElementById("closeDetailBtn"),
  addMemberBtn: document.getElementById("addMemberBtn"),
  memberFormDialog: document.getElementById("memberFormDialog"),
  memberForm: document.getElementById("memberForm"),
  formGrid: document.getElementById("formGrid"),
  formTitle: document.getElementById("formTitle"),
  deleteMemberBtn: document.getElementById("deleteMemberBtn"),
  closeFormBtn: document.getElementById("closeFormBtn"),
  cancelFormBtn: document.getElementById("cancelFormBtn"),
};

init();

async function init() {
  bindEvents();
  buildFormFields();
  await loadMembers();
  renderFilterOptions();
  applyFilters();
}

function bindEvents() {
  [el.searchInput, el.cohortFilter, el.divisionFilter, el.memberTypeFilter, el.sortBy].forEach((node) => {
    node.addEventListener("input", applyFilters);
    node.addEventListener("change", applyFilters);
  });

  el.closeDetailBtn.addEventListener("click", closeDetailPanel);

  el.addMemberBtn.addEventListener("click", () => openForm());
  el.closeFormBtn.addEventListener("click", closeForm);
  el.cancelFormBtn.addEventListener("click", closeForm);

  el.memberForm.addEventListener("submit", onFormSubmit);
  el.deleteMemberBtn.addEventListener("click", onDeleteMember);
}

function buildFormFields() {
  const fullWidthFields = new Set(["companyAddress", "homeAddress"]);

  FIELD_META.forEach(([key, label]) => {
    const group = document.createElement("div");
    group.className = `form-group ${fullWidthFields.has(key) ? "full" : ""}`;

    const id = `field-${key}`;
    group.innerHTML = `
      <label for="${id}">${label}</label>
      <input id="${id}" name="${key}" type="text" />
    `;

    if (key === "no") {
      group.querySelector("input").type = "number";
      group.querySelector("input").min = "1";
    }

    el.formGrid.appendChild(group);
  });
}

async function loadMembers() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const jsonData = await response.json();
    const localData = JSON.parse(localStorage.getItem("arp-members") || "null");
    state.members = Array.isArray(localData) ? localData : jsonData;
  } catch (error) {
    console.error("members.json 로드 실패:", error);
    state.members = [];
  }
}

function renderFilterOptions() {
  renderOptions(el.cohortFilter, distinctValues("cohort"), "전체 기수");
  renderOptions(el.divisionFilter, distinctValues("division"), "전체 분과");
}

function renderOptions(select, values, placeholder) {
  select.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  select.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function distinctValues(field) {
  return [...new Set(state.members.map((m) => m[field]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "ko")
  );
}

function applyFilters() {
  const keyword = el.searchInput.value.trim().toLowerCase();
  const cohort = el.cohortFilter.value;
  const division = el.divisionFilter.value;
  const memberType = el.memberTypeFilter.value;
  const sortBy = el.sortBy.value;

  const result = state.members
    .filter((m) => {
      const matchesSearch =
        !keyword ||
        [m.name, m.studentId, m.company, m.title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesCohort = !cohort || String(m.cohort) === cohort;
      const matchesDivision = !division || m.division === division;
      const matchesType = !memberType || m.memberType === memberType;
      return matchesSearch && matchesCohort && matchesDivision && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return String(a.name).localeCompare(String(b.name), "ko");
      }
      return String(a.studentId).localeCompare(String(b.studentId), "ko", { numeric: true });
    });

  state.filtered = result;
  renderStats();
  renderMemberGrid();
}

function renderStats() {
  const total = state.members.length;
  const byDivision = state.members.reduce((acc, m) => {
    acc[m.division] = (acc[m.division] || 0) + 1;
    return acc;
  }, {});
  const divisionText = Object.entries(byDivision)
    .map(([key, val]) => `${key} ${val}`)
    .join(" / ");

  const memberCompanyCount = state.members.filter((m) => m.memberType === "회원사").length;

  el.totalCount.textContent = String(total);
  el.divisionCount.textContent = divisionText || "-";
  el.memberCompanyCount.textContent = String(memberCompanyCount);
  el.filteredCount.textContent = String(state.filtered.length);
}

function renderMemberGrid() {
  el.memberGrid.innerHTML = "";

  if (!state.filtered.length) {
    el.memberGrid.innerHTML = `<div class="empty-state">검색/필터 조건에 맞는 원우가 없습니다.</div>`;
    closeDetailPanel();
    return;
  }

  const frag = document.createDocumentFragment();

  state.filtered.forEach((member) => {
    const node = el.cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.studentId = member.studentId;

    const photo = node.querySelector(".member-photo");
    photo.src = `${PHOTO_DIR}/${member.studentId}.jpg`;
    photo.alt = `${member.name} 사진`;
    photo.addEventListener("error", () => {
      photo.src = PLACEHOLDER_IMAGE;
    });

    node.querySelector(".member-name").textContent = member.name || "이름 없음";
    node.querySelector(".student-id").textContent = `학번: ${member.studentId || "-"}`;
    node.querySelector(".company").textContent = `소속: ${member.company || "-"}`;
    node.querySelector(".title").textContent = `직위: ${member.title || "-"}`;

    if (state.selectedId === member.studentId) node.classList.add("selected");

    node.addEventListener("click", () => selectMember(member.studentId));
    node.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        selectMember(member.studentId);
      }
    });

    frag.appendChild(node);
  });

  el.memberGrid.appendChild(frag);
}

function selectMember(studentId) {
  state.selectedId = studentId;
  renderMemberGrid();
  renderDetailPanel();
}

function closeDetailPanel() {
  state.selectedId = null;
  el.detailPanel.classList.remove("open");
  el.detailPanel.setAttribute("aria-hidden", "true");
  renderMemberGrid();
}

async function renderDetailPanel() {
  const member = state.members.find((m) => m.studentId === state.selectedId);
  if (!member) return;

  const rows = FIELD_META.map(
    ([key, label]) => `
      <div class="detail-label">${label}</div>
      <div class="detail-value">${member[key] || "-"}</div>
    `
  ).join("");

  const admissionPath = `${PDF_DIR}/${member.studentId}/admission.pdf`;
  const introPath = `${PDF_DIR}/${member.studentId}/intro.pdf`;

  const [hasAdmission, hasIntro] = await Promise.all([
    checkFileExists(admissionPath),
    checkFileExists(introPath),
  ]);

  el.detailBody.innerHTML = `
    <div class="detail-table">${rows}</div>
    <div class="pdf-actions">
      ${pdfButtonMarkup("입학지원서 보기", admissionPath, hasAdmission)}
      ${pdfButtonMarkup("자기소개서 보기", introPath, hasIntro)}
    </div>
    <div class="pdf-actions">
      <button class="btn btn-primary" id="editMemberBtn">수정</button>
    </div>
  `;

  const editBtn = document.getElementById("editMemberBtn");
  if (editBtn) editBtn.addEventListener("click", () => openForm(member.studentId));

  el.detailPanel.classList.add("open");
  el.detailPanel.setAttribute("aria-hidden", "false");
}

function pdfButtonMarkup(label, path, exists) {
  if (!exists) {
    return `<button class="btn btn-ghost" disabled>${label} (파일 없음)</button>`;
  }
  return `<a class="btn btn-ghost" href="${path}" target="_blank" rel="noopener">${label}</a>`;
}

async function checkFileExists(path) {
  try {
    const res = await fetch(path, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function openForm(studentId = null) {
  state.editingId = studentId;
  const editing = state.members.find((m) => m.studentId === studentId);

  el.formTitle.textContent = editing ? "원우 정보 수정" : "신규 원우 추가";
  el.deleteMemberBtn.classList.toggle("hidden", !editing);

  FIELD_META.forEach(([key]) => {
    const input = el.memberForm.elements.namedItem(key);
    input.value = editing?.[key] ?? "";
  });

  el.memberFormDialog.showModal();
}

function closeForm() {
  el.memberFormDialog.close();
  state.editingId = null;
}

function onFormSubmit(event) {
  event.preventDefault();

  const payload = FIELD_META.reduce((acc, [key]) => {
    acc[key] = String(el.memberForm.elements.namedItem(key).value || "").trim();
    return acc;
  }, {});

  if (!payload.studentId) {
    alert("학번은 필수입니다.");
    return;
  }

  if (state.editingId) {
    const idx = state.members.findIndex((m) => m.studentId === state.editingId);
    if (idx >= 0) state.members[idx] = payload;
    state.selectedId = payload.studentId;
  } else {
    const duplicate = state.members.some((m) => m.studentId === payload.studentId);
    if (duplicate) {
      alert("동일한 학번이 이미 존재합니다.");
      return;
    }
    state.members.push(payload);
    state.selectedId = payload.studentId;
  }

  persistMembers();
  renderFilterOptions();
  applyFilters();
  renderDetailPanel();
  closeForm();
}

function onDeleteMember() {
  if (!state.editingId) return;
  const willDelete = confirm("정말 삭제하시겠습니까?");
  if (!willDelete) return;

  state.members = state.members.filter((m) => m.studentId !== state.editingId);
  state.selectedId = null;
  persistMembers();
  renderFilterOptions();
  applyFilters();
  closeForm();
  closeDetailPanel();
}

function persistMembers() {
  localStorage.setItem("arp-members", JSON.stringify(state.members));
}
