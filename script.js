const searchInput = document.getElementById("searchInput");
const memberList = document.getElementById("memberList");
const resultCount = document.getElementById("resultCount");

function renderMembers(keyword = "") {
  const members = getMembers();
  const q = keyword.trim().toLowerCase();
  const filtered = members.filter((m) => m.name.toLowerCase().includes(q));

  resultCount.textContent = `총 ${filtered.length}명`;

  if (filtered.length === 0) {
    memberList.innerHTML = `<p class="help-text">검색 결과가 없습니다.</p>`;
    return;
  }

  memberList.innerHTML = filtered
    .map(
      (m) => `
      <article class="member-card">
        <div class="member-top">
          <img class="member-photo" src="${getPhotoCandidates(m)[0]}" data-fallback='${JSON.stringify(
        getPhotoCandidates(m)
      )}' alt="${m.name} 사진" loading="lazy">
          <div>
            <h3 class="member-name">${m.name}</h3>
            <p class="member-info">${m.phone}</p>
            <p class="member-info">${m.email}</p>
          </div>
        </div>

        <div class="actions">
          <a class="action-link" href="tel:${m.phone}">전화</a>
          <a class="action-link" href="sms:${m.phone}">문자</a>
          <a class="action-link" href="mailto:${m.email}">이메일</a>
        </div>
      </article>
    `
    )
    .join("");

  setupPhotoFallbacks();
}

function setupPhotoFallbacks() {
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    const candidates = JSON.parse(img.dataset.fallback || "[]");
    let idx = 0;
    img.onerror = () => {
      idx += 1;
      if (idx < candidates.length) {
        img.src = candidates[idx];
      }
    };
  });
}

searchInput.addEventListener("input", (e) => {
  renderMembers(e.target.value);
});

window.addEventListener("storage", () => renderMembers(searchInput.value));

renderMembers();
