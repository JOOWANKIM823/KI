const searchInput = document.getElementById("searchInput");
const bodyEl = document.getElementById("memberTableBody");
const countEl = document.getElementById("memberCount");

function renderMembers() {
  const members = getData("members");
  const q = (searchInput.value || "").trim().toLowerCase();
  const filtered = members.filter((m) => m.name.toLowerCase().includes(q));
  countEl.textContent = `총 ${filtered.length}명`;

  if (!filtered.length) {
    bodyEl.innerHTML = `<tr><td colspan="4">검색 결과가 없습니다.</td></tr>`;
    return;
  }

  bodyEl.innerHTML = filtered.map((m) => {
    const candidates = photoCandidates(m.name, m.photoUrl);
    return `
      <tr>
        <td><img class="photo-mini" src="${candidates[0]}" data-candidates='${JSON.stringify(candidates)}' alt="${m.name}"/></td>
        <td>${m.name}</td>
        <td>${m.cohort || ""} / ${m.team || ""} / ${m.position || ""}</td>
        <td>
          <a href="tel:${m.phone}">전화</a> |
          <a href="sms:${m.phone}">문자</a> |
          <a href="mailto:${m.email}">이메일</a>
        </td>
      </tr>`;
  }).join("");

  document.querySelectorAll("img[data-candidates]").forEach((img) => {
    const list = JSON.parse(img.dataset.candidates || "[]");
    let idx = 0;
    img.onerror = () => {
      idx += 1;
      if (idx < list.length) img.src = list[idx];
    };
  });
}

searchInput.addEventListener("input", renderMembers);
window.addEventListener("storage", renderMembers);
renderMembers();
