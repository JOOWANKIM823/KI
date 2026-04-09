/**
 * KODA-ARP 관리자 전용 백오피스 앱
 * - members.json 기반 렌더링
 * - 검색/필터/정렬 동시 동작
 * - 상세 패널(사진 + 기본정보 + PDF 버튼)
 * - 추가/수정/삭제(브라우저 로컬스토리지 오버레이 저장)
 */

const DATA_URL = "data/members.json";
const PHOTO_DIR = "photos";
const PDF_DIR = "pdfs";
const STORAGE_KEY = "arp-members";

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

    const input = group.querySelector("input");
    if (key === "no") {
      input.type = "number";
      input.min = "1";
      input.step = "1";
    }
    if (key === "birthDate") {
      input.placeholder = "YYYY-MM-DD";
      input.pattern = "\\d{4}-\\d{2}-\\d{2}";
    }

    el.formGrid.appendChild(group);
  });
}

async function loadMembers() {
  let jsonData = [];

  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    jsonData = await response.json();
  } catch (error) {
    console.error("members.json 로드 실패:", error);
    jsonData = [];
  }

  const localData = parseJsonSafe(localStorage.getItem(STORAGE_KEY));
  const source = Array.isArray(localData) ? localData : jsonData;
  state.members = normalizeMembers(source);
}

function parseJsonSafe(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeMembers(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => normalizeMember(row))
    .filter((m) => m.studentId && m.name);
}

function normalizeMember(row = {}) {
  const output = {};

  FIELD_META.forEach(([key]) => {
    output[key] = row[key] == null ? "" : String(row[key]).trim();
  });

  output.no = normalizeNumberString(output.no);
  output.studentId = String(output.studentId || "").trim();
  output.birthDate = normalizeBirthDate(output.birthDate);

  if (!output.memberType) output.memberType = "비회원";
  return output;
}

function normalizeNumberString(value) {
  const asNum = Number(value);
  if (!Number.isFinite(asNum) || asNum < 1) return "";
  return String(Math.trunc(asNum));
}

function normalizeBirthDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  // YYYYMMDD 또는 YYYY-MM-DD를 YYYY-MM-DD로 통일
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  return "";
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
  const sortBy = el.sortBy.value || "studentId";

  const result = state.members
    .filter((m) => {
      const matchesSearch =
        !keyword ||
        [m.name, m.studentId, m.company, m.title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesCohort = !cohort || m.cohort === cohort;
      const matchesDivision = !division || m.division === division;
      const isRegularMember = m.memberType === "정회원";
      const normalizedType = isRegularMember ? "회원사" : "비회원사";
      const matchesType = !memberType || memberType === normalizedType;

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

  // 필터로 선택된 카드가 사라졌으면 상세 패널 닫기
  if (state.selectedId && !state.filtered.some((m) => m.studentId === state.selectedId)) {
    closeDetailPanel();
  }
}

function renderStats() {
  const total = state.members.length;
  const byDivision = state.members.reduce((acc, m) => {
    const key = m.division || "미분류";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const divisionText = Object.entries(byDivision)
    .map(([key, val]) => `${key} ${val}`)
    .join(" / ");

  // 요구사항: memberType이 "정회원"인 경우만 회원사 인원으로 집계
  const memberCompanyCount = state.members.filter((m) => m.memberType === "정회원").length;

  el.totalCount.textContent = String(total);
  el.divisionCount.textContent = total ? divisionText : "-";
  el.memberCompanyCount.textContent = String(memberCompanyCount);
  el.filteredCount.textContent = String(state.filtered.length);
}

function renderMemberGrid() {
  el.memberGrid.innerHTML = "";

  if (!state.filtered.length) {
    el.memberGrid.innerHTML = `<div class="empty-state">등록된 데이터가 없거나, 검색/필터 조건에 맞는 원우가 없습니다.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  state.filtered.forEach((member) => {
    const node = el.cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.studentId = member.studentId;

    const photo = node.querySelector(".member-photo");
    photo.src = memberPhotoPath(member.studentId);
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

function memberPhotoPath(studentId) {
  // 사진 규칙: photos/{학번}.jpg
  return `${PHOTO_DIR}/${String(studentId)}.jpg`;
}

function selectMember(studentId) {
  state.selectedId = String(studentId || "");
  renderMemberGrid();
  renderDetailPanel();
}

function closeDetailPanel() {
  state.selectedId = null;
  el.detailPanel.classList.remove("open");
  el.detailPanel.setAttribute("aria-hidden", "true");
  el.detailBody.innerHTML = "";
  renderMemberGrid();
}

async function renderDetailPanel() {
  const member = state.members.find((m) => m.studentId === state.selectedId);
  if (!member) {
    closeDetailPanel();
    return;
  }

  const admissionPath = `${PDF_DIR}/${member.studentId}/admission.pdf`;
  const introPath = `${PDF_DIR}/${member.studentId}/intro.pdf`;

  const [hasAdmission, hasIntro] = await Promise.all([
    checkFileExists(admissionPath),
    checkFileExists(introPath),
  ]);

  const basicInfoRows = [
    ["이름", member.name],
    ["학번", member.studentId],
    ["기수", member.cohort],
    ["분과", member.division],
    ["분야", member.field],
    ["소속", member.company],
    ["직위", member.title],
  ]
    .map(
      ([label, value]) => `
      <div class="detail-label">${label}</div>
      <div class="detail-value">${value || "-"}</div>
    `
    )
    .join("");

  el.detailBody.innerHTML = `
    <div class="detail-profile">
      <img src="${memberPhotoPath(member.studentId)}" alt="${member.name} 사진" id="detailPhoto" class="detail-photo" />
      <div class="detail-profile-main">
        <h3>${member.name || "-"}</h3>
        <p>${member.studentId || "-"} / ${member.cohort || "-"}</p>
      </div>
    </div>

    <div class="detail-table">${basicInfoRows}</div>

    <div class="pdf-actions">
      ${pdfButtonMarkup("입학지원서 보기", admissionPath, hasAdmission)}
      ${pdfButtonMarkup("자기소개서 보기", introPath, hasIntro)}
    </div>

    <hr class="detail-sep" />

    <div class="detail-table">
      ${buildFullDetailRows(member)}
    </div>

    <div class="pdf-actions">
      <button class="btn btn-primary" id="editMemberBtn">수정</button>
    </div>
  `;

  const detailPhoto = document.getElementById("detailPhoto");
  if (detailPhoto) {
    detailPhoto.addEventListener("error", () => {
      detailPhoto.src = PLACEHOLDER_IMAGE;
    });
  }

  const editBtn = document.getElementById("editMemberBtn");
  if (editBtn) editBtn.addEventListener("click", () => openForm(member.studentId));

  el.detailPanel.classList.add("open");
  el.detailPanel.setAttribute("aria-hidden", "false");
}

function buildFullDetailRows(member) {
  return FIELD_META.map(
    ([key, label]) => `
      <div class="detail-label">${label}</div>
      <div class="detail-value">${member[key] || "-"}</div>
    `
  ).join("");
}

function pdfButtonMarkup(label, path, exists) {
  if (!exists) return `<button class="btn btn-ghost" disabled>${label} (파일 없음)</button>`;
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
    if (input) input.value = editing?.[key] ?? "";
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
    const field = el.memberForm.elements.namedItem(key);
    acc[key] = field ? String(field.value || "").trim() : "";
    return acc;
  }, {});

  payload.studentId = String(payload.studentId || "").trim();
  payload.no = normalizeNumberString(payload.no);
  payload.birthDate = normalizeBirthDate(payload.birthDate);

  if (!payload.studentId) {
    alert("학번은 필수입니다.");
    return;
  }
  if (!payload.name) {
    alert("이름은 필수입니다.");
    return;
  }
  if (payload.birthDate === "" && el.memberForm.elements.namedItem("birthDate").value.trim()) {
    alert("생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.");
    return;
  }

  if (state.editingId) {
    const idx = state.members.findIndex((m) => m.studentId === state.editingId);
    if (idx >= 0) state.members[idx] = payload;
  } else {
    const duplicate = state.members.some((m) => m.studentId === payload.studentId);
    if (duplicate) {
      alert("동일한 학번이 이미 존재합니다.");
      return;
    }
    state.members.push(payload);
  }

  state.selectedId = payload.studentId;
  persistMembers();
  renderFilterOptions();
  applyFilters();
  renderDetailPanel();
  closeForm();
}

function onDeleteMember() {
  if (!state.editingId) return;
  if (!confirm("정말 삭제하시겠습니까?")) return;

  state.members = state.members.filter((m) => m.studentId !== state.editingId);
  state.selectedId = null;

  persistMembers();
  renderFilterOptions();
  applyFilters();
  closeForm();
  closeDetailPanel();
}

function persistMembers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.members));
}
