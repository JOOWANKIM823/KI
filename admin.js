const form = document.getElementById("memberForm");
const memberId = document.getElementById("memberId");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const photoInput = document.getElementById("photo");
const adminMemberList = document.getElementById("adminMemberList");
const resetBtn = document.getElementById("resetBtn");
const formTitle = document.getElementById("formTitle");

function resetForm() {
  form.reset();
  memberId.value = "";
  formTitle.textContent = "회원 추가";
}

function renderAdminList() {
  const members = getMembers();
  if (members.length === 0) {
    adminMemberList.innerHTML = `<p class="help-text">등록된 회원이 없습니다.</p>`;
    return;
  }

  adminMemberList.innerHTML = members
    .map(
      (m) => `
      <div class="member-row">
        <div>
          <strong>${m.name}</strong>
          <div class="help-text">${m.phone} · ${m.email}</div>
          <div class="help-text">photo: ${m.photo || "(자동 연결 사용)"}</div>
        </div>
        <div class="inline-actions">
          <button class="edit-btn" data-edit-id="${m.id}">수정</button>
          <button class="delete-btn" data-delete-id="${m.id}">삭제</button>
        </div>
      </div>
    `
    )
    .join("");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const payload = {
    id: memberId.value || toId(),
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
    photo: photoInput.value.trim(),
  };

  let members = getMembers();
  const idx = members.findIndex((m) => m.id === payload.id);

  if (idx >= 0) members[idx] = payload;
  else members = [payload, ...members];

  saveMembers(members);
  renderAdminList();
  resetForm();
});

adminMemberList.addEventListener("click", (e) => {
  const editId = e.target.dataset.editId;
  const deleteId = e.target.dataset.deleteId;
  const members = getMembers();

  if (editId) {
    const found = members.find((m) => m.id === editId);
    if (!found) return;

    memberId.value = found.id;
    nameInput.value = found.name;
    phoneInput.value = found.phone;
    emailInput.value = found.email;
    photoInput.value = found.photo || "";
    formTitle.textContent = "회원 수정";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteId) {
    const next = members.filter((m) => m.id !== deleteId);
    saveMembers(next);
    renderAdminList();

    if (memberId.value === deleteId) resetForm();
  }
});

resetBtn.addEventListener("click", resetForm);

renderAdminList();
