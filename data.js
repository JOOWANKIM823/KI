const STORAGE_KEY = "wonwoo_notebook_members";
const DEFAULT_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'>
    <rect width='100%' height='100%' fill='#e5e7eb'/>
    <circle cx='120' cy='95' r='45' fill='#9ca3af'/>
    <rect x='45' y='150' width='150' height='70' rx='35' fill='#9ca3af'/>
  </svg>`);

const initialMembers = [
  { id: "m1", name: "김민수", phone: "010-1111-2222", email: "minsu@example.com", photo: "" },
  { id: "m2", name: "이서연", phone: "010-3333-4444", email: "seoyeon@example.com", photo: "" },
  { id: "m3", name: "박지훈", phone: "010-5555-6666", email: "jihoon@example.com", photo: "" },
];

function seedMembersIfNeeded() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMembers));
  }
}

function getMembers() {
  seedMembersIfNeeded();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMembers(members) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function toId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function githubRawPhotoCandidates(name) {
  const host = window.location.hostname;
  const path = window.location.pathname.split("/").filter(Boolean);
  if (!host.endsWith("github.io") || path.length === 0) return [];

  const owner = host.replace(".github.io", "");
  const repo = path[0];
  const encoded = encodeURIComponent(name);
  const exts = ["jpg", "jpeg", "png", "webp"];
  return exts.map((ext) => `https://raw.githubusercontent.com/${owner}/${repo}/main/photos/${encoded}.${ext}`);
}

function localPhotoCandidates(name) {
  const encoded = encodeURIComponent(name);
  return ["jpg", "jpeg", "png", "webp"].map((ext) => `photos/${encoded}.${ext}`);
}

function getPhotoCandidates(member) {
  const name = (member?.name || "").trim();
  const manual = (member?.photo || "").trim();
  if (!name) return [manual || DEFAULT_PHOTO];

  return [
    ...(manual ? [manual] : []),
    ...localPhotoCandidates(name),
    ...githubRawPhotoCandidates(name),
    DEFAULT_PHOTO,
  ];
}
