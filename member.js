const profileCard = document.getElementById("profileCard");
const detailBody = document.getElementById("detailBody");
const adminEditLink = document.getElementById("adminEditLink");

function getMemberIdFromQuery() {
  const p = new URLSearchParams(window.location.search);
  return p.get("id") || "";
}

function text(v) {
  return (v || "").toString().trim() || "-";
}

function renderNotFound() {
  profileCard.innerHTML = `<p>회원 정보를 찾을 수 없습니다.</p>`;
  detailBody.innerHTML = `<tr><td>안내</td><td>잘못된 접근이거나 데이터가 없습니다.</td></tr>`;
}

function renderProfile(member) {
  const photo = photoCandidates(member.photo)[0];
  const mobile = member.mobile || member.phone || "";
  const tel = member.phone || member.mobile || "";

  profileCard.innerHTML = `
    <div class="profile-top">
      <div class="profile-photo-wrap">
        <img id="profileImage" class="profile-photo" src="${photo}" alt="${text(member.name)}" />
      </div>

      <div class="profile-main">
        <p class="profile-cohort">${text(member.cohort)}</p>
        <h2 class="profile-name">${text(member.name)}</h2>
        <p class="profile-company">${text(member.company)} / ${text(member.position)}</p>
      </div>

      <div class="profile-actions">
        <a class="btn-link" href="tel:${tel}">전화</a>
        <a class="btn-link" href="sms:${mobile}">문자</a>
        <a class="btn-link" href="mailto:${member.email || ""}">이메일</a>
        <a class="btn-link" href="admin.html?memberId=${member.id}">관리자 수정</a>
      </div>
    </div>
  `;

  const img = document.getElementById("profileImage");
  img.onerror = () => { img.src = DEFAULT_PHOTO; };

  const rows = [
    ["기수", member.cohort],
    ["학번 또는 홈페이지 ID", member.studentId || member.homeId],
    ["분과/조", member.department || member.team],
    ["생년월일", member.birth],
    ["휴대전화", member.mobile || member.phone],
    ["이메일", member.email],
    ["전화", member.phone],
    ["팩스", member.fax],
    ["회사주소", member.companyAddress],
    ["자택주소", member.homeAddress],
    ["비고", member.memo],
  ];

  detailBody.innerHTML = rows
    .map(([k, v]) => `<tr><th>${k}</th><td>${text(v)}</td></tr>`)
    .join("");

  adminEditLink.href = `admin.html?memberId=${member.id}`;
}

(function init() {
  const memberId = getMemberIdFromQuery();
  const members = getData("members") || [];
  const member = members.find((m) => m.id === memberId);
  if (!member) {
    renderNotFound();
    return;
  }
  renderProfile(member);
})();
