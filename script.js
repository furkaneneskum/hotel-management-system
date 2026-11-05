'use strict';

/* ATA LİFE Guest House PMS — tek dosya, localStorage */

const KEYS = {
  users: 'atalife.users',
  session: 'atalife.session',
  stays: 'atalife.stays',
  rooms: 'atalife.rooms',
  audit: 'atalife.audit',
  issues: 'atalife.issues',
  issuesMigrated: 'atalife.issuesMigrated',
  roomMeta: 'atalife.roomMeta',
  houseNotes: 'atalife.houseNotes',
  customRooms: 'atalife.customRooms',
  roomRegistry: 'atalife.roomRegistry',
  settings: 'atalife.settings',
  roomPricesMigrated: 'atalife.roomPricesMigrated',
  salt: 'atalife.salt',
  remembered: 'atalife.rememberedUsers',
};

const PAGE_KEY = 'atalife.page';
const OLD_KEYS = {
  users: 'oldhome.users',
  session: 'oldhome.session',
  stays: 'oldhome.stays',
  rooms: 'oldhome.rooms',
};
const OLD_PAGE_KEY = 'oldhome.page';

const ROLES = { yonetici: 'Yönetici', personel: 'Personel' };

const MENU = [
  { id: 'dashboard', label: 'Anasayfa', roles: ['yonetici', 'personel'] },
  { id: 'rooms', label: 'Odalar', roles: ['yonetici', 'personel'] },
  { id: 'reservations', label: 'Rezervasyonlar', roles: ['yonetici', 'personel'] },
  { id: 'calendar', label: 'Takvim', roles: ['yonetici', 'personel'] },
  { id: 'pricing', label: 'Fiyatlandırma', roles: ['yonetici'] },
  { id: 'finance', label: 'Finans & Kasa', roles: ['yonetici'] },
  { id: 'reports', label: 'Raporlar', roles: ['yonetici'] },
  { id: 'staff', label: 'Personel Yönetimi', roles: ['yonetici'] },
  { id: 'audit', label: 'İşlem Geçmişi', roles: ['yonetici', 'personel'] },
  { id: 'settings', label: 'Sistem', roles: ['yonetici'] },
];

const PAGE_TITLES = Object.fromEntries(MENU.map(item => [item.id, item.label]));

function catalogPhoto(no) {
  return `${galleryBase(no)}/hero.jpg`;
}

function galleryBase(no) {
  return `assets/rooms/oda-${String(no).padStart(2, '0')}`;
}

function roomDisplayLabel(no) {
  return `Oda ${no}`;
}

const PHOTO_LABELS = {
  hero: 'Genel görünüm',
  bed: 'Yatak ve mobilya',
  angle: 'Oda açısı',
  bath: 'Banyo',
  shower: 'Duş ve lavabo',
};

// Klasörde gerçekten bulunan görseller (assets/rooms/oda-XX). Anahtar: fotoğraf klasörü numarası.
const PHOTO_FILES = {
  1: ['hero', 'bed', 'angle', 'bath', 'shower'],
  12: ['hero', 'bed', 'bath'],
  13: ['hero', 'bed', 'bath'],
  14: ['hero', 'bed', 'bath'],
};

function defaultGallery(room) {
  if (!room || !room.photoKey) return [];
  const base = galleryBase(room.photoKey);
  const files = PHOTO_FILES[Number(room.photoKey)] || ['hero', 'bed', 'angle', 'bath'];
  return files.map(id => ({ id, label: PHOTO_LABELS[id], src: `${base}/${id}.jpg` }));
}

const AMENITY_GROUPS = [
  {
    id: 'bed',
    title: 'Yatak ve mobilyalar',
    items: [
      { key: 'single_bed', label: 'Tek kişilik yatak' },
      { key: 'double_bed', label: 'Çift kişilik yatak' },
      { key: 'twin_beds', label: 'İki ayrı yatak' },
      { key: 'bedding', label: 'Yastık ve nevresim' },
      { key: 'nightstand', label: 'Komodin' },
      { key: 'lighting', label: 'Aydınlatma' },
      { key: 'desk', label: 'Masa ve sandalye' },
      { key: 'wardrobe', label: 'Dolap veya elbise askısı' },
      { key: 'mirror', label: 'Ayna' },
      { key: 'seating', label: 'Oturma alanı' },
    ],
  },
  {
    id: 'bath',
    title: 'Banyo',
    items: [
      { key: 'private_bath', label: 'Özel banyo' },
      { key: 'shower', label: 'Duş' },
      { key: 'toilet', label: 'Tuvalet' },
      { key: 'sink', label: 'Lavabo ve ayna' },
      { key: 'towels', label: 'Temiz havlular' },
      { key: 'toilet_paper', label: 'Tuvalet kâğıdı' },
      { key: 'shampoo', label: 'Şampuan / duş jeli' },
    ],
  },
  {
    id: 'other',
    title: 'Oda olanakları',
    items: [
      { key: 'ac', label: 'Klima' },
      { key: 'tv', label: 'Televizyon' },
      { key: 'wifi', label: 'Wi-Fi' },
      { key: 'balcony', label: 'Balkon veya teras' },
      { key: 'view', label: 'Pencere ve manzara' },
      { key: 'work_desk', label: 'Çalışma köşesi' },
    ],
  },
];

const BED_LAYOUT_LABEL = {
  single_bed: 'Tek kişilik yatak',
  double_bed: 'Çift kişilik yatak',
  twin_beds: 'İki ayrı yatak',
};

function bedLayoutText(room) {
  const keys = roomAmenityKeys(room);
  const parts = Object.keys(BED_LAYOUT_LABEL).filter(key => keys.has(key)).map(key => BED_LAYOUT_LABEL[key]);
  return parts.length ? parts.join(', ') : 'Kayıtlı değil';
}

function bathText(room) {
  const keys = roomAmenityKeys(room);
  if (!keys.has('private_bath')) return keys.has('shower') ? 'Duş' : 'Kayıtlı değil';
  const extras = [keys.has('shower') && 'duş', keys.has('toilet') && 'tuvalet', keys.has('sink') && 'lavabo'].filter(Boolean);
  return extras.length ? `Özel banyo (${extras.join(', ')})` : 'Özel banyo';
}

function readRoomMeta() {
  const raw = readJSON(KEYS.roomMeta, {});
  return raw && typeof raw === 'object' ? raw : {};
}

function inferAmenityKeys(room) {
  const keys = new Set();
  const text = `${room.name} ${room.blurb} ${room.type}`.toLocaleLowerCase('tr-TR');
  keys.add('bedding');
  keys.add('towels');
  keys.add('toilet_paper');
  if (room.beds >= 2 || room.max >= 3) keys.add('twin_beds');
  else keys.add('double_bed');
  if (text.includes('banyo') || text.includes('duş') || text.includes('mermer')) {
    keys.add('private_bath');
    keys.add('shower');
    keys.add('toilet');
    keys.add('sink');
    keys.add('shampoo');
  }
  if (text.includes('masa') || text.includes('çalışma')) {
    keys.add('desk');
    keys.add('work_desk');
  }
  if (text.includes('gardırop') || text.includes('ayna')) keys.add('wardrobe');
  if (text.includes('ayna')) keys.add('mirror');
  if (text.includes('hasır') || text.includes('oturma') || text.includes('köşe')) keys.add('seating');
  if (text.includes('balkon')) keys.add('balcony');
  if (text.includes('aydınlık') || text.includes('pencere')) keys.add('view');
  return keys;
}

function roomAmenityKeys(room) {
  const saved = readRoomMeta()[room.no];
  if (saved && Array.isArray(saved.amenities)) return new Set(saved.amenities);
  if (Array.isArray(room.amenities)) return new Set(room.amenities);
  const known = findRoom(room.no);
  return new Set(known && Array.isArray(known.amenities) ? known.amenities : []);
}

function renderAmenitiesHtml(room) {
  const active = roomAmenityKeys(room);
  const blocks = AMENITY_GROUPS.map(group => {
    const items = group.items.filter(item => active.has(item.key));
    if (!items.length) return '';
    return `<section class="amenity-group"><h4>${esc(group.title)}</h4><ul class="amenity-list">${items.map(i => `<li>${esc(i.label)}</li>`).join('')}</ul></section>`;
  }).filter(Boolean);
  if (!blocks.length) return '<p class="amenity-empty">Doğrulanmış oda olanağı kaydı yok. Yönetici daha sonra ekleyebilir.</p>';
  return `<div class="amenity-groups">${blocks.join('')}</div>`;
}

function resolveGallery(room) {
  if (!room.photoKey) return [];
  const overrides = readRoomMeta()[room.no]?.gallery || {};
  return defaultGallery(room).map(item => ({
    ...item,
    src: overrides[item.id] || item.src,
  }));
}

// Eski numaralandırma; yalnızca ilk taşıma (migration) için okunur.
const LEGACY_CATALOG = [
  { no: '1', name: 'Zemin Çift', type: 'Çift Kişilik', beds: 1, max: 2, floor: 'Zemin kat', priceNight: 2800, photo: catalogPhoto('1'), blurb: 'Ferah ve aydınlık çift kişilik oda. Sıcak ahşap tonları, konforlu yatak.' },
  { no: '2', name: 'Hasır Köşe', type: 'Çift Kişilik', beds: 1, max: 2, floor: '', priceNight: 2800, photo: catalogPhoto('2'), blurb: 'Yenilenen çift kişilik oda. Hasır oturma köşesi, geniş yatak, mermer banyo.' },
  { no: '3', name: 'Minimal', type: 'Çift Kişilik', beds: 1, max: 2, floor: '', priceNight: 2800, photo: catalogPhoto('3'), blurb: 'Minimalist ve aydınlık oda. Konforlu yatak ve çalışma masası.' },
  { no: '4', name: 'Ayna Köşe', type: 'Çift Kişilik', beds: 1, max: 2, floor: '', priceNight: 2800, photo: catalogPhoto('4'), blurb: 'Yenilenen çift kişilik oda. Ayna karşılı oturma köşesi, mermer banyo.' },
  { no: '5', name: 'Standart 5', type: 'Çift Kişilik', beds: 1, max: 2, floor: '', priceNight: 2800, photo: catalogPhoto('5'), blurb: '' },
  { no: '6', name: 'Aile 6', type: 'Üç Kişilik', beds: 2, max: 3, floor: '', priceNight: 3400, photo: catalogPhoto('6'), blurb: '' },
  { no: '7', name: 'Aile 7', type: 'Üç Kişilik', beds: 2, max: 3, floor: '', priceNight: 3400, photo: catalogPhoto('7'), blurb: '' },
  { no: '8', name: 'Aile 8', type: 'Üç Kişilik', beds: 2, max: 3, floor: '', priceNight: 3400, photo: catalogPhoto('8'), blurb: '' },
  { no: '9', name: 'Geniş 9', type: 'Üç Kişilik', beds: 2, max: 3, floor: '', priceNight: 3400, photo: catalogPhoto('9'), blurb: 'Aydınlık ve geniş oda. Hasır oturma köşesi, geniş gardırop, mermer banyo.' },
  { no: '10', name: 'Gardırop 10', type: 'Çift Kişilik', beds: 1, max: 2, floor: '', priceNight: 2800, photo: catalogPhoto('10'), blurb: 'Yenilenen çift kişilik oda. Hasır oturma köşesi, boy aynalı gardırop, mermer banyo.' },
  { no: '11', name: 'Üst Kat', type: 'Çift Kişilik', beds: 1, max: 2, floor: 'Üst kat', priceNight: 2800, photo: catalogPhoto('11'), blurb: 'Aydınlık oda. Çalışma köşesi ve yağmur duşlu mermer banyo.' },
  {
    no: '12', name: 'Tek 12', type: 'Tek Kişilik', beds: 1, max: 1, floor: '', priceNight: 1800,
    photo: catalogPhoto('12'),
    blurb: 'Tek kişilik yatak, komodin ve aydınlatma. Özel banyo. Görseller temsilidir.',
    amenities: ['single_bed', 'bedding', 'nightstand', 'lighting', 'private_bath', 'shower', 'toilet', 'sink', 'towels', 'toilet_paper'],
  },
  {
    no: '13', name: 'Tek 13', type: 'Tek Kişilik', beds: 1, max: 1, floor: '', priceNight: 1800,
    photo: catalogPhoto('13'),
    blurb: 'Tek kişilik yatak, komodin ve aydınlatma. Özel banyo. Görseller temsilidir.',
    amenities: ['single_bed', 'bedding', 'nightstand', 'lighting', 'private_bath', 'shower', 'toilet', 'sink', 'towels', 'toilet_paper'],
  },
  {
    no: '14', name: 'Tek 14', type: 'Tek Kişilik', beds: 1, max: 1, floor: '', priceNight: 1800,
    photo: catalogPhoto('14'),
    blurb: 'Tek kişilik yatak, komodin ve aydınlatma. Özel banyo. Görseller temsilidir.',
    amenities: ['single_bed', 'bedding', 'nightstand', 'lighting', 'private_bath', 'shower', 'toilet', 'sink', 'towels', 'toilet_paper'],
  },
];

const CAPACITY_TYPES = { 1: 'Tek Kişilik', 2: 'Çift Kişilik', 3: 'Üç Kişilik' };

const ROOM_GROUPS = [
  { max: 1, title: 'Tek Kişilik Odalar' },
  { max: 2, title: 'Çift Kişilik Odalar' },
  { max: 3, title: 'Üç Kişilik Odalar' },
];

function readCustomRooms() {
  const list = readJSON(KEYS.customRooms, []);
  if (!Array.isArray(list)) return [];
  return list.filter(room => room && typeof room.no === 'string' && room.no.trim()
    && !LEGACY_CATALOG.some(base => base.no === room.no));
}

function compareRoomNo(a, b) {
  return String(a).localeCompare(String(b), 'tr', { numeric: true });
}

function compareRooms(a, b) {
  return (a.max - b.max) || compareRoomNo(a.no, b.no);
}

function readRoomRegistry() {
  const list = readJSON(KEYS.roomRegistry, null);
  if (!Array.isArray(list)) return null;
  return list.filter(room => room && typeof room.no === 'string' && room.no.trim() && [1, 2, 3].includes(Number(room.max)));
}

function applyRoomMeta(room, saved) {
  const entry = saved || {};
  const max = [1, 2, 3].includes(Number(entry.max)) ? Number(entry.max) : Number(room.max);
  const price = Number(entry.priceNight);
  const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : room.name;
  return {
    beds: 1,
    floor: '',
    blurb: '',
    ...room,
    name,
    max,
    type: CAPACITY_TYPES[max],
    priceNight: Number.isFinite(price) && price > 0 ? Math.round(price) : Number(room.priceNight) || 0,
    photo: room.photoKey ? catalogPhoto(room.photoKey) : '',
  };
}

function legacyRooms() {
  const meta = readRoomMeta();
  const base = LEGACY_CATALOG.map(room => ({
    ...room,
    photoKey: room.no,
    amenities: Array.isArray(room.amenities) ? room.amenities : [...inferAmenityKeys(room)],
  }));
  const custom = readCustomRooms().map(room => ({ ...room, photoKey: '', amenities: [], custom: true }));
  return base.concat(custom).map(room => applyRoomMeta(room, meta[room.no])).sort(compareRooms);
}

function roomsCatalog() {
  const registry = readRoomRegistry();
  if (!registry) return legacyRooms();
  const meta = readRoomMeta();
  return registry.map(room => applyRoomMeta(room, meta[room.no])).sort(compareRooms);
}

function findRoom(no) {
  return roomsCatalog().find(room => room.no === String(no)) || null;
}

function saveRoomMeta(no, patch) {
  const meta = readRoomMeta();
  meta[no] = { ...(meta[no] || {}), ...patch };
  writeJSON(KEYS.roomMeta, meta);
}

function migrateRoomPrices() {
  if (readRaw(KEYS.roomPricesMigrated) || readRoomRegistry()) return;
  const meta = readRoomMeta();
  LEGACY_CATALOG.forEach(room => {
    const entry = meta[room.no] || {};
    if (!(Number(entry.priceNight) > 0)) meta[room.no] = { ...entry, priceNight: room.priceNight };
  });
  writeJSON(KEYS.roomMeta, meta);
  writeRaw(KEYS.roomPricesMigrated, '1');
}

function snapshotStorage() {
  const snap = {};
  Object.values(KEYS).forEach(key => {
    const value = readRaw(key);
    if (value !== null) snap[key] = value;
  });
  return snap;
}

function restoreStorage(snap) {
  Object.values(KEYS).forEach(key => {
    if (Object.prototype.hasOwnProperty.call(snap, key)) writeRaw(key, snap[key]);
    else removeRaw(key);
  });
}

function stripRoomNumberFromName(name, oldNo) {
  const text = String(name || '').trim();
  const suffix = ` ${oldNo}`;
  return text.endsWith(suffix) ? text.slice(0, -suffix.length).trim() : text;
}

function systemAudit(action, detail) {
  const list = readAudit();
  list.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: nowISO(),
    userId: state.user ? state.user.id : 'system',
    userName: state.user ? state.user.name : 'Sistem',
    action,
    detail: detail || '',
  });
  writeAudit(list);
}

function legacyRoomStatus(entry) {
  if (!entry || entry.status !== 'maintenance') return entry;
  return { ...entry, status: 'cleaning' };
}

// Odaları kapasite sırasına göre 1..N numaralandırır; ilişkili tüm kayıtları aynı eşleştirmeyle taşır.
function renumberRooms(rooms, { firstRun }) {
  const ordered = ROOM_GROUPS.flatMap(group => rooms.filter(room => room.max === group.max).sort((a, b) => compareRoomNo(a.no, b.no)));
  const mapping = {};
  ordered.forEach((room, index) => { mapping[room.no] = String(index + 1); });
  const changed = ordered.some(room => mapping[room.no] !== room.no);
  if (!changed && !firstRun) return { mapping, changed: false };

  const before = snapshotStorage();
  const backupKey = `atalife.backup.${Date.now()}`;
  try {
    writeRaw(backupKey, JSON.stringify(before));
    const meta = readRoomMeta();
    const roomMap = readRoomMap();
    const stays = readJSON(KEYS.stays, []);

    const nextMeta = {};
    Object.keys(meta).forEach(no => {
      const target = mapping[no];
      if (!target) return;
      const entry = { ...meta[no] };
      if (typeof entry.name === 'string') entry.name = stripRoomNumberFromName(entry.name, no);
      nextMeta[target] = entry;
    });

    const nextRoomMap = {};
    Object.keys(roomMap).forEach(no => {
      const target = mapping[no];
      if (!target) return;
      nextRoomMap[target] = firstRun ? legacyRoomStatus(roomMap[no]) : roomMap[no];
    });

    const nextStays = Array.isArray(stays) ? stays.map(stay => {
      if (!stay || !mapping[stay.room]) return stay;
      return { ...stay, room: mapping[stay.room], roomHistory: [...(Array.isArray(stay.roomHistory) ? stay.roomHistory : []), { from: stay.room, to: mapping[stay.room], at: nowISO(), reason: 'renumber' }] };
    }) : stays;

    const registry = ordered.map(room => ({
      no: mapping[room.no],
      legacyNo: room.legacyNo || room.no,
      name: stripRoomNumberFromName(room.name, room.no),
      max: room.max,
      priceNight: room.priceNight,
      photoKey: room.photoKey || '',
      blurb: room.blurb || '',
      floor: room.floor || '',
      beds: room.beds || 1,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      custom: Boolean(room.custom),
      createdAt: room.createdAt || null,
    }));

    writeJSON(KEYS.roomMeta, nextMeta);
    writeJSON(KEYS.rooms, nextRoomMap);
    writeJSON(KEYS.stays, nextStays);
    writeJSON(KEYS.customRooms, []);
    writeJSON(KEYS.roomRegistry, registry);
    const pairs = ordered.filter(room => mapping[room.no] !== room.no).map(room => `${room.no}→${mapping[room.no]}`).join(', ');
    systemAudit('Oda numaraları düzenlendi', pairs || 'Numaralar değişmedi');
    return { mapping, changed: true, backupKey };
  } catch (err) {
    restoreStorage(before);
    console.error('Oda numaralandırması geri alındı', err);
    return { mapping: {}, changed: false, error: err };
  }
}

function migrateRoomRegistry() {
  if (readRoomRegistry()) return;
  renumberRooms(legacyRooms(), { firstRun: true });
}

function setRoomPrice(no, price, source) {
  if (userRole(state.user) !== 'yonetici') return false;
  const room = findRoom(no);
  if (!room) return false;
  const next = Math.round(Number(price));
  if (!Number.isFinite(next) || next <= 0) return false;
  if (next === room.priceNight) return true;
  saveRoomMeta(no, { priceNight: next, priceUpdatedAt: nowISO(), priceUpdatedBy: state.user ? state.user.name : '' });
  appendAudit(source === 'suggestion' ? 'Fiyat önerisi onaylandı' : 'Oda fiyatı', `Oda ${no}: ${money(room.priceNight)} → ${money(next)}`);
  return true;
}

const CURRENCIES = {
  TRY: 'Türk lirası (₺)',
  EUR: 'Euro (€)',
  USD: 'ABD doları ($)',
  GBP: 'İngiliz sterlini (£)',
};

let settingsCache = null;

function readSettings() {
  if (settingsCache) return settingsCache;
  const raw = readJSON(KEYS.settings, {});
  settingsCache = {
    currency: raw && CURRENCIES[raw.currency] ? raw.currency : 'TRY',
  };
  return settingsCache;
}

function saveSettings(patch) {
  const next = { ...readSettings(), ...patch };
  writeJSON(KEYS.settings, next);
  settingsCache = null;
}

const ROOM_STATUSES = ['available', 'occupied', 'cleaning'];

const STATUS_LABEL = {
  available: 'Müsait',
  occupied: 'Dolu',
  cleaning: 'Temizlikte',
};

const STAY_STATUSES = ['pending', 'expected', 'inhouse', 'checked_out', 'cancelled'];
const STAY_UPCOMING = ['pending', 'expected'];
const STAY_ACTIVE = ['pending', 'expected', 'inhouse'];

const STAY_LABEL = {
  pending: 'Beklemede',
  expected: 'Onaylandı',
  inhouse: 'Giriş Yapıldı',
  checked_out: 'Tamamlandı',
  cancelled: 'İptal Edildi',
};

const STAY_TONE = {
  pending: 'pending',
  expected: 'confirmed',
  inhouse: 'occupied',
  checked_out: 'neutral',
  cancelled: 'cancelled',
};

const PAYMENT_METHODS = { cash: 'Nakit', card: 'Kredi kartı', transfer: 'Havale / EFT', other: 'Diğer' };

function isUpcoming(stay) {
  return STAY_UPCOMING.includes(stay.status);
}

function isActiveStay(stay) {
  return STAY_ACTIVE.includes(stay.status);
}

const memoryStore = new Map();
const state = {
  user: null,
  page: 'dashboard',
  query: '',
  roomFilter: 'all',
  calYear: 0,
  calMonth: 0,
  selectedDay: '',
  roomModalNo: null,
  staffEditId: null,
  staffPhoto: '',
  profilePhoto: '',
  galleryIndex: 0,
  noteModalRoom: null,
  noteModalId: null,
  roomStatusMenuNo: null,
  auditEditId: null,
  accountMenuOpen: false,
  loginPickUsername: '',
  listFocus: '',
  resFilter: null,
  report: null,
  lastReport: null,
  detailStayId: '',
  paymentStayId: '',
  editStayId: '',
  houseNoteId: '',
};

const els = {
  loginError: document.getElementById('login-error'),
  nav: document.getElementById('nav'),
  sessionRoleLabel: document.getElementById('session-role-label'),
  sessionLabel: document.getElementById('session-label'),
  search: document.getElementById('search'),
  btnStay: document.getElementById('btn-new-stay'),
  btnStaff: document.getElementById('btn-new-staff'),
  pageHead: document.getElementById('page-head'),
  pageHeadDate: document.getElementById('page-head-date'),
  pageHeadName: document.getElementById('page-head-name'),
  pageHeadRole: document.getElementById('page-head-role'),
  pageHeadAvatar: document.getElementById('page-head-avatar'),
  pageHeadAccount: document.getElementById('page-head-account'),
  houseNotesList: document.getElementById('house-notes-list'),
  houseNoteForm: document.getElementById('house-note-form'),
  houseNoteTitle: document.getElementById('house-note-title'),
  houseNoteError: document.getElementById('house-note-error'),
  modalHouseNote: document.getElementById('modal-house-note'),
  dashQuick: document.getElementById('dash-quick'),
  metrics: document.getElementById('metrics'),
  dashReservations: document.getElementById('dash-reservations'),
  dashReservationsTomorrow: document.getElementById('dash-reservations-tomorrow'),
  dashFinance: document.getElementById('dash-finance'),
  topbar: document.querySelector('.topbar'),
  roomsLede: document.getElementById('rooms-lede'),
  roomsGrid: document.getElementById('rooms-grid'),
  resList: document.getElementById('res-list'),
  calTitle: document.getElementById('cal-title'),
  calTimeline: document.getElementById('cal-timeline'),
  auditLede: document.getElementById('audit-lede'),
  auditList: document.getElementById('audit-list'),
  finMetrics: document.getElementById('fin-metrics'),
  finList: document.getElementById('fin-list'),
  staffLede: document.getElementById('staff-lede'),
  staffList: document.getElementById('staff-list'),
  modalStay: document.getElementById('modal-stay'),
  modalRoom: document.getElementById('modal-room'),
  roomModalBody: document.getElementById('room-modal-body'),
  modalRoomNote: document.getElementById('modal-room-note'),
  modalStaff: document.getElementById('modal-staff'),
  modalProfile: document.getElementById('modal-profile'),
  modalAudit: document.getElementById('modal-audit'),
  auditForm: document.getElementById('audit-form'),
  auditError: document.getElementById('audit-error'),
  auditModalMeta: document.getElementById('audit-modal-meta'),
  auditDelete: document.getElementById('audit-delete'),
  stayError: document.getElementById('stay-error'),
  roomNoteError: document.getElementById('room-note-error'),
  roomNoteTitle: document.getElementById('room-note-title'),
  roomNoteMeta: document.getElementById('room-note-meta'),
  roomNoteDelete: document.getElementById('room-note-delete'),
  roomNoteComplete: document.getElementById('room-note-complete'),
  staffError: document.getElementById('staff-error'),
  toast: document.getElementById('toast'),
  loginRemembered: document.getElementById('login-remembered'),
  accountMenu: document.getElementById('account-menu'),
  sessionMenuToggle: document.getElementById('session-menu-toggle'),
};

const stayForm = document.getElementById('stay-form');
const staffForm = document.getElementById('staff-form');
const roomNoteModalForm = document.getElementById('room-note-modal-form');
const loginForm = document.getElementById('login-form');

function parseISO(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isoFromDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  return isoFromDate(parseISO(value)) === value;
}

function addDays(value, amount) {
  const date = parseISO(value);
  date.setDate(date.getDate() + amount);
  return isoFromDate(date);
}

function nightsBetween(start, end) {
  return Math.round((parseISO(end) - parseISO(start)) / 86400000);
}

function nowISO() {
  return new Date().toISOString();
}

function cap(value) {
  if (!value) return '';
  return value.charAt(0).toLocaleUpperCase('tr-TR') + value.slice(1);
}

function formatDay(value) {
  const date = parseISO(value);
  const month = cap(date.toLocaleDateString('tr-TR', { month: 'short' }).replace(/\./g, ''));
  return `${date.getDate()} ${month}`;
}

function formatFull(value) {
  const date = parseISO(value);
  const main = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = cap(date.toLocaleDateString('tr-TR', { weekday: 'long' }));
  return `${main}, ${weekday}`;
}

function formatMonth(year, month) {
  const label = new Date(year, month, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  return cap(label);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function money(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: readSettings().currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatLong(value) {
  return parseISO(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const TODAY = isoFromDate(new Date());
state.calYear = parseISO(TODAY).getFullYear();
state.calMonth = parseISO(TODAY).getMonth();
state.selectedDay = TODAY;

function readRaw(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch (err) { /* bellek yedeği */ }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

function writeRaw(key, value) {
  memoryStore.set(key, value);
  try { localStorage.setItem(key, value); } catch (err) { /* yoksay */ }
}

function removeRaw(key) {
  memoryStore.delete(key);
  try { localStorage.removeItem(key); } catch (err) { /* yoksay */ }
}

function readJSON(key, fallback) {
  const raw = readRaw(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (err) { return fallback; }
}

function writeJSON(key, value) {
  writeRaw(key, JSON.stringify(value));
}

function migrateStorage() {
  const pairs = [
    [OLD_KEYS.users, KEYS.users],
    [OLD_KEYS.session, KEYS.session],
    [OLD_KEYS.stays, KEYS.stays],
    [OLD_KEYS.rooms, KEYS.rooms],
  ];
  pairs.forEach(([oldKey, newKey]) => {
    if (!readRaw(newKey) && readRaw(oldKey)) writeRaw(newKey, readRaw(oldKey));
  });
  try {
    if (!sessionStorage.getItem(PAGE_KEY) && sessionStorage.getItem(OLD_PAGE_KEY)) {
      sessionStorage.setItem(PAGE_KEY, sessionStorage.getItem(OLD_PAGE_KEY));
    }
  } catch (err) { /* yoksay */ }

  const rooms = readJSON(KEYS.rooms, {});
  let roomsChanged = false;
  Object.keys(rooms).forEach(no => {
    const entry = rooms[no];
    if (!entry || typeof entry !== 'object') return;
    if (entry.status === 'empty') {
      entry.status = 'available';
      roomsChanged = true;
    }
    if (typeof entry.note === 'string' && entry.note && !Array.isArray(entry.notes)) {
      entry.notes = [{
        id: `note-${Date.now()}-${no}`,
        text: entry.note,
        createdBy: 'system',
        createdByName: 'Sistem',
        createdAt: nowISO(),
        completedAt: null,
        completedBy: null,
      }];
      delete entry.note;
      roomsChanged = true;
    }
  });
  if (roomsChanged) writeJSON(KEYS.rooms, rooms);
  migrateIssuesIntoRoomNotes();
  migrateRoomPrices();
  migrateRoomRegistry();
  migrateStayCodes();
}

function issueToNoteText(issue) {
  const title = String(issue.title || '').trim();
  const desc = String(issue.description || '').trim();
  if (title && desc && desc.toLocaleLowerCase('tr-TR') !== title.toLocaleLowerCase('tr-TR')) {
    return `${title} — ${desc}`;
  }
  return title || desc || 'Eski kayıt';
}

function migrateIssuesIntoRoomNotes() {
  const issues = readJSON(KEYS.issues, []);
  if (!Array.isArray(issues) || !issues.length) {
    writeRaw(KEYS.issuesMigrated, '1');
    return;
  }
  const map = readRoomMap();
  let changed = false;
  issues.forEach(issue => {
    const roomNo = String(issue.room || '').trim();
    if (!roomNo || !roomsCatalog().some(r => r.no === roomNo)) return;
    const entry = map[roomNo] && typeof map[roomNo] === 'object' ? map[roomNo] : {};
    const notes = roomNotes(entry);
    const resolved = issue.status === 'resolved';
    notes.push({
      id: `note-mig-${issue.id || Date.now()}-${roomNo}`,
      text: issueToNoteText(issue),
      urgent: issue.priority === 'urgent',
      createdBy: issue.authorId || 'system',
      createdByName: issue.authorName || 'Sistem',
      createdAt: issue.createdAt || nowISO(),
      completedAt: resolved ? (issue.resolvedAt || nowISO()) : null,
      completedBy: resolved ? (issue.resolvedBy || null) : null,
      completedByName: resolved ? (issue.resolvedByName || null) : null,
    });
    map[roomNo] = { ...entry, notes };
    changed = true;
  });
  if (changed) writeJSON(KEYS.rooms, map);
  writeRaw(KEYS.issuesMigrated, '1');
  writeJSON(KEYS.issues, []);
}

function ensureSalt() {
  let salt = readRaw(KEYS.salt);
  if (!salt) {
    salt = `atalife-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeRaw(KEYS.salt, salt);
  }
  return salt;
}

function sha256HexFromBytes(bytes) {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const msg = new Uint8Array(bytes);
  const bitLen = msg.length * 8;
  const padLen = ((56 - ((msg.length + 1) % 64)) + 64) % 64;
  const total = msg.length + 1 + padLen + 8;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[msg.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 4, bitLen, false);
  let h0 = 0x6a09e667; let h1 = 0xbb67ae85; let h2 = 0x3c6ef372; let h3 = 0xa54ff53a;
  let h4 = 0x510e527f; let h5 = 0x9b05688c; let h6 = 0x1f83d9ab; let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = (rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0; let b = h1; let c = h2; let d = h3; let e = h4; let f = h5; let g = h6; let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(v => v.toString(16).padStart(8, '0')).join('');
  function rightRotate(value, amount) {
    return ((value >>> amount) | (value << (32 - amount))) >>> 0;
  }
}

async function hashPassword(password) {
  const salt = ensureSalt();
  const payload = `${salt}:${password}`;
  const data = new TextEncoder().encode(payload);
  if (window.isSecureContext && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256HexFromBytes(data);
}

function isHashed(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function normalizeUser(raw) {
  if (!raw || typeof raw.id !== 'string') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const username = typeof raw.username === 'string' ? raw.username.trim() : '';
  if (name.length < 2 || username.length < 3) return null;
  const role = raw.role === 'yonetici' || raw.username.toLocaleLowerCase('tr-TR') === 'admin'
    ? 'yonetici'
    : 'personel';
  const active = raw.active !== false;
  const user = { id: raw.id, name, username, role, active };
  if (isHashed(raw.passwordHash)) user.passwordHash = raw.passwordHash;
  else if (typeof raw.password === 'string' && raw.password.length >= 4) user._plainPassword = raw.password;
  else if (isHashed(raw.password)) user.passwordHash = raw.password;
  else return null;
  return user;
}

async function ensureUsers() {
  migrateStorage();
  let stored = readJSON(KEYS.users, null);
  if (!Array.isArray(stored) || !stored.length) {
    const hash = await hashPassword('atalife');
    const seed = [{
      id: 'usr-admin',
      name: 'Sistem Yöneticisi',
      username: 'admin',
      passwordHash: hash,
      role: 'yonetici',
      active: true,
    }];
    writeJSON(KEYS.users, seed);
    return seed.map(u => ({ ...u }));
  }
  const users = [];
  for (const raw of stored) {
    const u = normalizeUser(raw);
    if (!u) continue;
    if (u._plainPassword) {
      u.passwordHash = await hashPassword(u._plainPassword);
      delete u._plainPassword;
    } else if (!u.passwordHash && raw.password) {
      u.passwordHash = await hashPassword(raw.password);
    }
    if (!u.passwordHash) continue;
    users.push({
      id: u.id,
      name: u.name,
      username: u.username,
      passwordHash: u.passwordHash,
      role: u.role,
      active: u.active,
    });
  }
  if (!users.length) {
    const hash = await hashPassword('atalife');
    users.push({
      id: 'usr-admin',
      name: 'Sistem Yöneticisi',
      username: 'admin',
      passwordHash: hash,
      role: 'yonetici',
      active: true,
    });
  }
  writeJSON(KEYS.users, users);
  return users.slice();
}

function saveUsers(list) {
  writeJSON(KEYS.users, list);
}

function readUsersList() {
  const users = readJSON(KEYS.users, []);
  return Array.isArray(users) ? users : [];
}

function findUserById(users, id) {
  return users.find(user => user.id === id) || null;
}

function hasActiveYonetici(users, exceptId) {
  return users.some(user => (
    user.id !== exceptId
    && user.role === 'yonetici'
    && user.active !== false
  ));
}

function wouldRemoveLastYonetici(users, userId, nextRole, nextActive) {
  const current = findUserById(users, userId);
  if (!current) return false;
  const role = nextRole !== undefined ? nextRole : current.role;
  const active = nextActive !== undefined ? nextActive : current.active !== false;
  if (role === 'yonetici' && active) return false;
  return !hasActiveYonetici(users, userId);
}

function paymentStatusFrom(total, paid) {
  const t = Number(total) || 0;
  const p = Number(paid) || 0;
  if (t <= 0 && p <= 0) return 'unpaid';
  if (p >= t && t > 0) return 'paid';
  if (p > 0) return 'partial';
  return 'unpaid';
}

const PAYMENT_LABEL = { unpaid: 'Ödenmedi', partial: 'Kısmi', paid: 'Ödendi' };

function validStay(stay) {
  if (!stay || typeof stay.id !== 'string') return false;
  if (typeof stay.guest !== 'string' || stay.guest.trim().length < 2) return false;
  if (typeof stay.room !== 'string') return false;
  if (!STAY_STATUSES.includes(stay.status)) return false;
  if (!isISO(stay.checkIn) || !isISO(stay.checkOut)) return false;
  if (stay.checkIn >= stay.checkOut) return false;
  if (!Number.isInteger(stay.pax) || stay.pax < 1 || stay.pax > 3) return false;
  return true;
}

function normalizePayment(item) {
  if (!item || !(Number(item.amount) > 0)) return null;
  const legacy = item.legacy === true;
  if (!legacy && typeof item.at !== 'string') return null;
  return {
    id: String(item.id || `pay-${item.at || 'legacy'}`),
    amount: Number(item.amount),
    at: typeof item.at === 'string' ? item.at : null,
    method: PAYMENT_METHODS[item.method] ? item.method : (legacy ? '' : 'cash'),
    note: typeof item.note === 'string' ? item.note : '',
    byName: typeof item.byName === 'string' ? item.byName : '',
    legacy,
  };
}

function normalizeStay(raw) {
  if (!validStay(raw)) return null;
  const total = Number(raw.total) || 0;
  const paid = Number(raw.paid) || 0;
  return {
    id: raw.id,
    code: typeof raw.code === 'string' ? raw.code : '',
    guest: raw.guest.trim(),
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
    room: raw.room,
    checkIn: raw.checkIn,
    checkOut: raw.checkOut,
    pax: raw.pax,
    status: raw.status,
    time: typeof raw.time === 'string' ? raw.time : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    notes: Array.isArray(raw.notes)
      ? raw.notes.filter(n => n && typeof n.text === 'string' && n.text.trim()).map(n => ({
        id: String(n.id || `snote-${n.at}`),
        text: n.text,
        at: typeof n.at === 'string' ? n.at : null,
        byName: typeof n.byName === 'string' ? n.byName : '',
      }))
      : [],
    roomHistory: Array.isArray(raw.roomHistory) ? raw.roomHistory.filter(h => h && h.from && h.to) : [],
    confirmedAt: typeof raw.confirmedAt === 'string' ? raw.confirmedAt : null,
    cancelledAt: typeof raw.cancelledAt === 'string' ? raw.cancelledAt : null,
    total,
    paid,
    payments: Array.isArray(raw.payments) ? raw.payments.map(normalizePayment).filter(Boolean) : [],
    paymentStatus: raw.paymentStatus || paymentStatusFrom(total, paid),
    actualCheckIn: raw.actualCheckIn || null,
    actualCheckOut: raw.actualCheckOut || null,
    priceNight: Number(raw.priceNight) > 0 ? Number(raw.priceNight) : null,
    nights: Number.isInteger(raw.nights) ? raw.nights : null,
    subtotal: Number(raw.subtotal) >= 0 && raw.subtotal !== undefined && raw.subtotal !== null ? Number(raw.subtotal) : null,
    discount: Number(raw.discount) > 0 ? Number(raw.discount) : 0,
    currency: typeof raw.currency === 'string' ? raw.currency : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : null,
  };
}

function quoteStay({ roomNo, checkIn, checkOut, discount, paid }) {
  const room = findRoom(roomNo);
  const datesOk = isISO(checkIn) && isISO(checkOut) && checkIn < checkOut;
  const nights = datesOk ? nightsBetween(checkIn, checkOut) : 0;
  const priceNight = room ? room.priceNight || 0 : 0;
  const subtotal = nights * priceNight;
  const disc = Math.min(Math.max(0, Math.round(Number(discount) || 0)), subtotal);
  const total = subtotal - disc;
  const paidAmount = Math.min(Math.max(0, Math.round(Number(paid) || 0)), total);
  return {
    room,
    nights,
    priceNight,
    subtotal,
    discount: disc,
    total,
    paid: paidAmount,
    remaining: total - paidAmount,
  };
}

function readStays() {
  const stored = readJSON(KEYS.stays, []);
  if (!Array.isArray(stored)) return [];
  return stored.map(normalizeStay).filter(Boolean);
}

function saveStays(list) {
  writeJSON(KEYS.stays, list);
}

function stayCreatedMs(stay) {
  const fromField = Date.parse(stay.createdAt || '');
  if (Number.isFinite(fromField)) return fromField;
  const fromId = Number(String(stay.id).replace(/\D/g, '').slice(0, 13));
  return Number.isFinite(fromId) && fromId > 0 ? fromId : parseISO(stay.checkIn).getTime();
}

function nextStayCode(stays, year) {
  const prefix = `R${year}-`;
  const max = stays.reduce((m, stay) => {
    if (typeof stay.code !== 'string' || !stay.code.startsWith(prefix)) return m;
    return Math.max(m, Number(stay.code.slice(prefix.length)) || 0);
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

function migrateStayCodes() {
  const stored = readJSON(KEYS.stays, []);
  if (!Array.isArray(stored) || stored.every(stay => !stay || stay.code)) return;
  const list = stored.map(stay => ({ ...stay }));
  [...list].filter(stay => stay && !stay.code)
    .sort((a, b) => stayCreatedMs(a) - stayCreatedMs(b))
    .forEach(stay => { stay.code = nextStayCode(list, new Date(stayCreatedMs(stay)).getFullYear()); });
  writeJSON(KEYS.stays, list);
}

function stayLabel(stay) {
  return stay.code || stay.id;
}

function normalizeRoomStatus(status) {
  if (status === 'empty') return 'available';
  if (status === 'maintenance' || status === 'fault') return 'cleaning';
  return ROOM_STATUSES.includes(status) ? status : 'available';
}

function readRoomMap() {
  const stored = readJSON(KEYS.rooms, {});
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

function roomNotes(saved) {
  if (Array.isArray(saved.notes)) {
    return saved.notes.filter(n => n && typeof n.text === 'string');
  }
  return [];
}

function openNotesCount(notes) {
  return notes.filter(n => !n.completedAt).length;
}

function roomHasUrgentOpenNote(no) {
  return roomSaved(no).notes.some(n => !n.completedAt && n.urgent === true);
}

function upsertRoomNotes(no, notes) {
  saveRoom(no, { notes });
}

function findRoomNote(no, noteId) {
  return roomSaved(no).notes.find(n => n.id === noteId) || null;
}

function roomSaved(no) {
  const saved = readRoomMap()[no] || {};
  return {
    status: normalizeRoomStatus(saved.status),
    photo: typeof saved.photo === 'string' ? saved.photo : '',
    notes: roomNotes(saved),
    lastCleaning: saved.lastCleaning || null,
    statusChangedAt: typeof saved.statusChangedAt === 'string' ? saved.statusChangedAt : null,
    statusChangedBy: typeof saved.statusChangedBy === 'string' ? saved.statusChangedBy : '',
  };
}

function saveRoom(no, patch) {
  const map = readRoomMap();
  const prev = roomSaved(no);
  const next = { ...prev, ...patch };
  if (patch.status) {
    next.statusChangedAt = nowISO();
    next.statusChangedBy = state.user ? state.user.name : 'Sistem';
  }
  map[no] = next;
  writeJSON(KEYS.rooms, map);
}

function readAudit() {
  const list = readJSON(KEYS.audit, []);
  return Array.isArray(list) ? list : [];
}

function writeAudit(list) {
  writeJSON(KEYS.audit, list.slice(0, 500));
}

function appendAudit(action, detail) {
  if (!state.user) return;
  const list = readAudit();
  list.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: nowISO(),
    userId: state.user.id,
    userName: state.user.name,
    action,
    detail: detail || '',
  });
  writeAudit(list);
}

function auditEntryById(id) {
  return readAudit().find(entry => entry.id === id) || null;
}

function canManageAuditEntry(entry) {
  if (!state.user || !entry) return false;
  if (userRole(state.user) === 'yonetici') return true;
  return entry.userId === state.user.id;
}

function updateAuditEntry(id, patch) {
  const list = readAudit();
  const index = list.findIndex(entry => entry.id === id);
  if (index < 0) return false;
  if (!canManageAuditEntry(list[index])) return false;
  list[index] = { ...list[index], ...patch };
  writeAudit(list);
  return true;
}

function deleteAuditEntry(id) {
  const list = readAudit();
  const entry = list.find(item => item.id === id);
  if (!entry || !canManageAuditEntry(entry)) return false;
  writeAudit(list.filter(item => item.id !== id));
  return true;
}

function clearAuditLog() {
  if (userRole(state.user) !== 'yonetici') return false;
  writeAudit([]);
  return true;
}

function openAuditModal(id) {
  const entry = auditEntryById(id);
  if (!entry || !canManageAuditEntry(entry) || !els.auditForm || !els.modalAudit) return;
  state.auditEditId = id;
  els.auditForm.elements.id.value = id;
  els.auditForm.elements.action.value = entry.action || '';
  els.auditForm.elements.detail.value = entry.detail || '';
  if (els.auditModalMeta) {
    els.auditModalMeta.textContent = `${formatDateTime(entry.at)} · ${entry.userName}`;
  }
  if (els.auditError) els.auditError.hidden = true;
  openModal(els.modalAudit);
  els.auditForm.elements.action.focus();
}

function saveAuditFromModal() {
  if (!els.auditForm || !state.auditEditId) return;
  const action = String(els.auditForm.elements.action.value || '').trim();
  const detail = String(els.auditForm.elements.detail.value || '').trim();
  if (!action) {
    if (els.auditError) {
      els.auditError.textContent = 'İşlem alanı zorunludur.';
      els.auditError.hidden = false;
    }
    return;
  }
  if (!updateAuditEntry(state.auditEditId, { action, detail })) {
    toast('Kayıt güncellenemedi.');
    return;
  }
  closeModal(els.modalAudit);
  state.auditEditId = null;
  renderAudit();
  toast('İşlem kaydı güncellendi.');
}

function removeAuditFromModal() {
  if (!state.auditEditId) return;
  if (!window.confirm('Bu işlem kaydı silinsin mi?')) return;
  if (!deleteAuditEntry(state.auditEditId)) {
    toast('Kayıt silinemedi.');
    return;
  }
  closeModal(els.modalAudit);
  state.auditEditId = null;
  renderAudit();
  toast('Kayıt silindi.');
}

function allStays() {
  return readStays();
}

function hasConflict(stays, roomNo, checkIn, checkOut, excludeId) {
  return stays.some(stay => {
    if (stay.room !== roomNo) return false;
    if (stay.status === 'cancelled' || stay.status === 'checked_out') return false;
    if (excludeId && stay.id === excludeId) return false;
    return checkIn < stay.checkOut && stay.checkIn < checkOut;
  });
}

function availableRooms(stays, checkIn, checkOut, excludeId) {
  if (!isISO(checkIn) || !isISO(checkOut) || checkIn >= checkOut) return [];
  return roomsCatalog().filter(room => !hasConflict(stays, room.no, checkIn, checkOut, excludeId));
}

function presentRooms(stays) {
  return roomsCatalog().map(room => {
    const saved = roomSaved(room.no);
    const occupant = stays.find(stay => stay.room === room.no && stay.status === 'inhouse');
    const incoming = stays.find(stay => (
      stay.room === room.no
      && isUpcoming(stay)
      && stay.checkIn === TODAY
    ));
    const openNotes = openNotesCount(saved.notes);
    return {
      ...room,
      status: occupant ? 'occupied' : saved.status,
      manualStatus: saved.status,
      photo: saved.photo || room.photo,
      priceNight: room.priceNight,
      notes: saved.notes,
      openNotes,
      occupant: occupant || null,
      incoming: incoming || null,
    };
  });
}

function summarize(rooms) {
  const occupied = rooms.filter(r => r.status === 'occupied');
  const available = rooms.filter(r => r.status === 'available');
  const cleaning = rooms.filter(r => r.status === 'cleaning');
  const openNotes = rooms.reduce((sum, room) => sum + room.openNotes, 0);
  return {
    guests: occupied.reduce((sum, room) => sum + (room.occupant ? room.occupant.pax : 0), 0),
    occupied: occupied.length,
    available: available.length,
    cleaning: cleaning.length,
    openNotes,
    occupancy: rooms.length ? Math.round((occupied.length / rooms.length) * 100) : 0,
  };
}

function snapshot() {
  const stays = allStays();
  const rooms = presentRooms(stays);
  const arrivals = stays
    .filter(stay => isUpcoming(stay) && stay.checkIn === TODAY)
    .sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.guest.localeCompare(b.guest, 'tr'));
  const departures = stays
    .filter(stay => stay.status === 'inhouse' && stay.checkOut === TODAY)
    .sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.guest.localeCompare(b.guest, 'tr'));
  return {
    stays,
    rooms,
    arrivals,
    departures,
    stats: summarize(rooms),
  };
}

function userRole(user) {
  return user && user.role === 'yonetici' ? 'yonetici' : 'personel';
}

function menuFor(user) {
  const role = userRole(user);
  return MENU.filter(item => item.roles.includes(role));
}

function userCan(user, page) {
  return menuFor(user).some(item => item.id === page);
}

function guardPage(page) {
  if (page === 'issues') return 'rooms';
  if (!userCan(state.user, page)) return 'dashboard';
  return page;
}

function currentUser() {
  const session = readJSON(KEYS.session, null);
  if (!session || typeof session.id !== 'string') return null;
  const users = readJSON(KEYS.users, []);
  const user = Array.isArray(users) ? users.find(item => item.id === session.id && item.active !== false) : null;
  if (!user) removeRaw(KEYS.session);
  return user || null;
}

function readRememberedUsers() {
  const list = readJSON(KEYS.remembered, []);
  return Array.isArray(list) ? list : [];
}

function rememberUser(user) {
  if (!user || !user.id) return;
  const entry = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: userRole(user),
    photo: safePhoto(user.photo),
    lastLoginAt: nowISO(),
  };
  const list = readRememberedUsers().filter(item => item.id !== user.id);
  list.unshift(entry);
  writeJSON(KEYS.remembered, list.slice(0, 8));
}

function removeRememberedUser(userId) {
  writeJSON(KEYS.remembered, readRememberedUsers().filter(item => item.id !== userId));
}

function rememberedUserRow(item) {
  const role = ROLES[item.role] || item.role || 'Personel';
  return `<button type="button" class="account-menu__item" role="menuitem" data-switch-user="${esc(item.username)}">
    ${avatarHtml(item.name, item.photo, 'account-menu__avatar')}
    <span class="account-menu__who">
      <strong>${esc(item.name)}</strong>
      <span>${esc(item.username)} · ${esc(role)}</span>
    </span>
  </button>`;
}

function closeAccountMenu() {
  if (!els.accountMenu) return;
  els.accountMenu.hidden = true;
  state.accountMenuOpen = false;
  if (els.sessionMenuToggle) els.sessionMenuToggle.setAttribute('aria-expanded', 'false');
  if (els.pageHeadAccount) els.pageHeadAccount.setAttribute('aria-expanded', 'false');
}

function openAccountMenu(trigger) {
  if (!els.accountMenu || !state.user) return;
  renderAccountMenu();
  const rect = trigger.getBoundingClientRect();
  els.accountMenu.hidden = false;
  state.accountMenuOpen = true;
  trigger.setAttribute('aria-expanded', 'true');
  const menu = els.accountMenu;
  const width = menu.offsetWidth || 280;
  let left = rect.right - width;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  let top = rect.bottom + 8;
  const maxTop = window.innerHeight - (menu.offsetHeight || 200) - 12;
  if (top > maxTop) top = Math.max(12, rect.top - (menu.offsetHeight || 200) - 8);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function renderAccountMenu() {
  if (!els.accountMenu || !state.user) return;
  const remembered = readRememberedUsers();
  const others = remembered.filter(item => item.id !== state.user.id);
  const currentRole = ROLES[userRole(state.user)] || 'Personel';
  els.accountMenu.innerHTML = `
    <p class="account-menu__title">Hesap değiştir</p>
    <div class="account-menu__current" aria-current="true">
      ${avatarHtml(state.user.name, state.user.photo, 'account-menu__avatar')}
      <span class="account-menu__who">
        <strong>${esc(state.user.name)}</strong>
        <span>${esc(currentRole)} · şu an aktif</span>
      </span>
    </div>
    ${others.length ? `<div class="account-menu__list">${others.map(rememberedUserRow).join('')}</div>` : ''}
    <button type="button" class="account-menu__cta" role="menuitem" data-open-profile>Profil fotoğrafı</button>
    <button type="button" class="account-menu__cta" role="menuitem" data-go-login-switch>Giriş ekranına git…</button>
  `;
}

function showLoginScreen(prefillUsername = '') {
  removeRaw(KEYS.session);
  try { sessionStorage.removeItem(PAGE_KEY); } catch (err) { /* yoksay */ }
  state.user = null;
  state.page = 'dashboard';
  state.query = '';
  state.roomFilter = 'all';
  state.selectedDay = TODAY;
  state.calYear = parseISO(TODAY).getFullYear();
  state.calMonth = parseISO(TODAY).getMonth();
  state.loginPickUsername = prefillUsername || '';
  closeAccountMenu();
  if (els.search) els.search.value = '';
  document.querySelectorAll('.chip').forEach(chip => {
    const on = chip.dataset.filter === 'all';
    chip.classList.toggle('is-on', on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('.modal.is-open').forEach(closeModal);
  delete document.documentElement.dataset.screen;
  document.title = 'ATA LİFE GUEST HOUSE · Giriş';
  renderNav();
  renderSession();
  renderLogin();
  renderOperational();
  renderStaff();
  applyChrome();
  if (loginForm) {
    loginForm.elements.username.value = prefillUsername || '';
    loginForm.elements.password.value = '';
    (prefillUsername ? loginForm.elements.password : loginForm.elements.username).focus();
  }
}

function switchToLoginAs(username) {
  showLoginScreen(username);
  toast(username ? `${username} ile giriş yapın.` : 'Giriş ekranına yönlendirildiniz.');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function matches(query, fields) {
  const needle = query.trim().toLocaleLowerCase('tr-TR');
  if (!needle) return true;
  return fields.filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(needle);
}

function pageQuery(page) {
  return state.page === page ? state.query : '';
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase('tr-TR');
}

function safePhoto(value) {
  return typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value) && value.length < 180000
    ? value
    : '';
}

function avatarHtml(name, photo, className) {
  const src = safePhoto(photo);
  if (src) return `<span class="${className} has-photo"><img src="${esc(src)}" alt=""></span>`;
  return `<span class="${className}" style="background:${esc(tint(name || '?'))}">${esc(initials(name || '?'))}</span>`;
}

function paintAvatarNode(node, name, photo) {
  if (!node) return;
  const src = safePhoto(photo);
  if (src) {
    node.classList.add('has-photo');
    node.style.background = '';
    node.textContent = '';
    node.innerHTML = `<img src="${esc(src)}" alt="">`;
    return;
  }
  node.classList.remove('has-photo');
  node.innerHTML = '';
  node.textContent = initials(name || '');
  node.style.background = tint(name || '');
}

function paintPhotoPreview(node, name, photo) {
  paintAvatarNode(node, name, photo);
}

const SIDEBAR_AVATAR_ICON = `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="1.4"/><circle cx="20" cy="16" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M10 32c2.5-5 7-7.5 10-7.5s7.5 2.5 10 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

function paintSidebarAvatar(user) {
  const node = document.querySelector('.sidebar-user__icon');
  if (!node) return;
  const src = user ? safePhoto(user.photo) : '';
  if (src) {
    node.classList.add('has-photo');
    node.innerHTML = `<img src="${esc(src)}" alt="">`;
    return;
  }
  node.classList.remove('has-photo');
  node.innerHTML = SIDEBAR_AVATAR_ICON;
}

function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
      reject(new Error('type'));
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      reject(new Error('size'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 160;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('read'));
    };
    img.src = url;
  });
}

function tint(name) {
  const palette = ['#E8F0EA', '#E5F5EE', '#F5F0E8', '#E8EDE8', '#F0EBE4', '#E6EEE8'];
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0) * 13) % palette.length;
  return palette[hash];
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function movementCopy(arrivals, departures) {
  if (!arrivals && !departures) return 'Bugün planlı bir giriş veya çıkış yok.';
  const parts = [];
  if (arrivals) parts.push(`${arrivals} giriş`);
  if (departures) parts.push(`${departures} çıkış`);
  return `Bugün ${parts.join(' ve ')} planlı.`;
}

function icon(body) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const ICONS = {
  dashboard: icon('<path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>'),
  rooms: icon('<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>'),
  reservations: icon('<path d="M7 4.5h10v15l-5-2.6L7 19.5z"/>'),
  calendar: icon('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5V7M16 3.5V7M4 10h16"/>'),
  issues: icon('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/>'),
  audit: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  finance: icon('<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17M7 14.5h4"/>'),
  pricing: icon('<path d="M3.5 12.5 11.5 4.5H19.5V12.5L11.5 20.5z"/><circle cx="15.5" cy="8.5" r="1.4"/>'),
  reports: icon('<path d="M4 19.5V5M4 19.5h16M8 16.5v-4.5M12 16.5V8M16 16.5v-3"/>'),
  staff: icon('<circle cx="9" cy="8" r="2.6"/><path d="M4.2 18.5c.5-2.6 2.4-4 4.8-4s4.3 1.4 4.8 4"/><circle cx="17" cy="9" r="2"/><path d="M16 14.6c1.4.3 2.5 1.1 3.1 2.6"/>'),
  settings: icon('<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'),
};

function badge(tone, label) {
  return `<span class="badge badge-${tone}">${esc(label)}</span>`;
}

const STATUS_TONE = {
  available: 'available',
  occupied: 'occupied',
  cleaning: 'cleaning',
};

function stayStatusBadge(stay) {
  return badge(STAY_TONE[stay.status] || 'neutral', STAY_LABEL[stay.status] || stay.status);
}

function statusBadge(status) {
  return badge(STATUS_TONE[status] || 'neutral', STATUS_LABEL[status] || status);
}

function closeRoomStatusMenus() {
  document.querySelectorAll('.room-status-picker.is-open').forEach(picker => {
    picker.classList.remove('is-open');
    const trigger = picker.querySelector('[data-room-status-menu]');
    const menu = picker.querySelector('.room-status-menu');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (menu) menu.hidden = true;
  });
  state.roomStatusMenuNo = null;
}

function toggleRoomStatusMenu(roomNo) {
  const closing = state.roomStatusMenuNo === roomNo;
  closeRoomStatusMenus();
  if (closing) return;
  const picker = document.querySelector(`.room-status-picker[data-room-status-picker="${CSS.escape(String(roomNo))}"]`);
  if (!picker) return;
  picker.classList.add('is-open');
  const trigger = picker.querySelector('[data-room-status-menu]');
  const menu = picker.querySelector('.room-status-menu');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  if (menu) menu.hidden = false;
  state.roomStatusMenuNo = String(roomNo);
}

// Elle seçilen durum gerçek konaklama kaydıyla çelişmemeli.
function roomStatusCheck(roomNo, status) {
  const stays = allStays();
  const inhouse = stays.find(stay => stay.room === roomNo && stay.status === 'inhouse');
  if (inhouse && (status === 'available' || status === 'cleaning')) {
    return { block: `${inhouse.guest} bu odada konaklıyor. Odayı ${STATUS_LABEL[status].toLocaleLowerCase('tr-TR')} yapmak için önce çıkış işlemi yapın.` };
  }
  if (status === 'occupied' && !inhouse) {
    return { confirm: `Oda ${roomNo} için giriş yapılmış bir misafir yok. Dolu olarak işaretlerseniz rezervasyon kaydı oluşmaz. Devam edilsin mi?` };
  }
  return {};
}

function applyRoomStatusFromUi(roomNo, status, options = {}) {
  if (!ROOM_STATUSES.includes(status)) return;
  const saved = roomSaved(roomNo);
  const shown = (presentRooms(allStays()).find(room => room.no === roomNo) || {}).status || saved.status;
  if (saved.status === status && shown === status) {
    closeRoomStatusMenus();
    return;
  }
  const check = roomStatusCheck(roomNo, status);
  if (check.block) {
    closeRoomStatusMenus();
    toast(check.block);
    return;
  }
  if (check.confirm && !window.confirm(check.confirm)) {
    closeRoomStatusMenus();
    return;
  }
  const patch = { status };
  if (saved.status === 'cleaning' && status === 'available') {
    patch.lastCleaning = { at: nowISO(), by: state.user.id, byName: state.user.name };
  }
  saveRoom(roomNo, patch);
  appendAudit('Oda durumu', `Oda ${roomNo}: ${STATUS_LABEL[shown] || shown} → ${STATUS_LABEL[status]}`);
  closeRoomStatusMenus();
  renderOperational();
  if (options.toast !== false) {
    toast(`Oda ${roomNo}: ${STATUS_LABEL[status]}`);
  }
}

function roomCardStatusPicker(roomNo, status) {
  const tone = STATUS_TONE[status] || 'neutral';
  const label = STATUS_LABEL[status] || status;
  const options = ROOM_STATUSES.map(s => `
    <button type="button" class="room-status-menu__item${s === status ? ' is-current' : ''}" role="menuitemradio" aria-checked="${s === status ? 'true' : 'false'}" data-room-status-set="${esc(roomNo)}" data-room-status="${s}">
      <span class="badge badge-${STATUS_TONE[s] || 'neutral'}">${esc(STATUS_LABEL[s])}</span>
    </button>
  `).join('');
  return `<div class="room-status-picker" data-room-status-picker="${esc(roomNo)}">
    <button type="button" class="badge badge-${tone} room-status-trigger" data-room-status-menu="${esc(roomNo)}" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(roomDisplayLabel(roomNo))} — durum: ${esc(label)}">
      ${esc(label)}
    </button>
    <div class="room-status-menu" role="menu" hidden>${options}</div>
  </div>`;
}

function roomPhoto(room) {
  if (room.photo) {
    return `<div class="room-photo"><img src="${esc(room.photo)}" alt="Oda ${esc(room.no)} — temsili görsel" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="room-photo room-photo--placeholder" aria-hidden="true"><span>Fotoğraf bekleniyor</span></div>`;
}

function roomCard(room, clickable) {
  const price = room.priceNight ? `${money(room.priceNight)} / gece` : 'Fiyat girilmedi';
  const topRow = `
    <div class="room-top">
      <p class="room-no">${esc(roomDisplayLabel(room.no))}</p>
      ${roomCardStatusPicker(room.no, room.status)}
    </div>
    <p class="room-facts"><span>${room.max} kişilik</span><strong>${esc(price)}</strong></p>`;
  const photo = roomPhoto(room);
  if (!clickable) {
    return `<article class="room-card room-card--simple">${photo}${topRow}</article>`;
  }
  return `<article class="room-card room-card--simple">
    <button type="button" class="room-card__main room-card__main--photo" data-room-open="${esc(room.no)}">${photo}</button>
    ${topRow}
  </article>`;
}

function flowItem(stay, meta, actions) {
  const act = actions ? `<div class="flow-actions">${actions}</div>` : '';
  return `<article class="flow-item">
    <time>${esc(stay.time || '—')}</time>
    <div>
      <strong>${esc(stay.guest)}</strong>
      <span class="room-meta">${esc(meta)}</span>
      ${act}
    </div>
  </article>`;
}

function emptyCopy(text) {
  return `<p class="empty">${esc(text)}</p>`;
}

function filteredRooms(rooms, page) {
  const query = pageQuery(page);
  return rooms.filter(room => {
    if (page === 'rooms' && state.roomFilter !== 'all' && room.status !== state.roomFilter) return false;
    return matches(query, [
      room.no, room.name, room.type, room.floor, room.blurb,
      room.occupant && room.occupant.guest,
      room.incoming && room.incoming.guest,
      STATUS_LABEL[room.status],
    ]);
  });
}

function renderLogin() {
  if (!els.loginRemembered) return;
  const remembered = readRememberedUsers();
  if (state.user || !remembered.length) {
    els.loginRemembered.hidden = true;
    els.loginRemembered.innerHTML = '';
    return;
  }
  els.loginRemembered.hidden = false;
  els.loginRemembered.innerHTML = `
    <p class="login-remembered__title">Kayıtlı hesaplar</p>
    <p class="login-remembered__lede">Daha önce giriş yapan kullanıcılar bu cihazda saklanır. Seçin, şifrenizi girin.</p>
    <div class="login-remembered__list">
      ${remembered.map(item => {
        const role = ROLES[item.role] || item.role || 'Personel';
        const picked = state.loginPickUsername
          && item.username.toLocaleLowerCase('tr-TR') === state.loginPickUsername.toLocaleLowerCase('tr-TR');
        return `<div class="login-account${picked ? ' is-picked' : ''}">
          <button type="button" class="login-account__pick" data-pick-login-user="${esc(item.username)}">
            ${avatarHtml(item.name, item.photo, 'avatar')}
            <span class="who">
              <strong>${esc(item.name)}</strong>
              <span>${esc(item.username)} · ${esc(role)}</span>
            </span>
          </button>
          <button type="button" class="login-account__remove" data-remove-remembered="${esc(item.id)}" aria-label="${esc(item.name)} hesabını listeden kaldır">×</button>
        </div>`;
      }).join('')}
    </div>`;
  if (state.loginPickUsername && loginForm) {
    loginForm.elements.username.value = state.loginPickUsername;
  }
}

function renderNav() {
  if (!state.user) {
    els.nav.innerHTML = '';
    return;
  }
  const items = menuFor(state.user);
  els.nav.innerHTML = items.map(item => `
    <button type="button" class="nav-item${item.id === state.page ? ' is-active' : ''}" data-page="${item.id}"${item.id === state.page ? ' aria-current="page"' : ''}>
      ${ICONS[item.id] || ''}
      <span>${item.label}</span>
    </button>
  `).join('');
}

function paintPageHead() {
  if (!state.user) return;
  if (els.pageHeadDate) els.pageHeadDate.textContent = formatFull(TODAY);
  if (els.pageHeadName) els.pageHeadName.textContent = state.user.name;
  if (els.pageHeadRole) els.pageHeadRole.textContent = ROLES[userRole(state.user)] || 'Personel';
  if (els.pageHeadAvatar) paintAvatarNode(els.pageHeadAvatar, state.user.name, state.user.photo);
}

function renderSession() {
  if (!state.user) {
    if (els.sessionRoleLabel) els.sessionRoleLabel.textContent = '';
    return;
  }
  const roleLabel = ROLES[userRole(state.user)] || 'Personel';
  if (els.sessionRoleLabel) els.sessionRoleLabel.textContent = roleLabel;
  paintSidebarAvatar(state.user);
  paintPageHead();
  renderAccountMenu();
}

function metricCard(key, label, value, hint, meter) {
  const bar = meter == null ? '' : `<div class="meter" aria-hidden="true"><span style="width:${meter}%"></span></div>`;
  return `<article class="metric" data-metric="${key}">
    <p class="metric-label">${label}</p>
    <p class="metric-value">${esc(value)}</p>
    <div class="metric-foot">${bar}<p class="metric-hint">${hint}</p></div>
  </article>`;
}

const DASH_STAT_ICONS = {
  arrivals: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  departures: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 12h10M13 17h7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  available: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v8H4zM7 10V7h10v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  occupied: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v8H4zM7 10V7h10v3" fill="currentColor" opacity="0.25"/><path d="M4 10h16v8H4zM7 10V7h10v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  cleaning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M5 21h14M8 10l8 8M16 10l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  notes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};

function dashStatCard(key, label, value, action) {
  const icon = DASH_STAT_ICONS[key] || DASH_STAT_ICONS.notes;
  return `<button type="button" class="dash-stat dash-stat--${key}" data-dash-stat="${esc(action || key)}">
    <span class="dash-stat__icon">${icon}</span>
    <p class="dash-stat__label">${esc(label)}</p>
    <p class="dash-stat__value">${esc(value)}</p>
  </button>`;
}

const DASH_QUICK_ICONS = {
  stay: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 3.5V7M16 3.5V7M12 11v6M9 14h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  rooms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v9H4zM7 10V7h10v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  checkin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h10M11 9l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 5h6v6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  checkout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H10M13 9l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 5h6v6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  cleaning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M6 21h12M9 11l6 6M15 11l-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  fault: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 16h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};

function dashQuickTile(quick, label, primary = false) {
  const icon = DASH_QUICK_ICONS[quick] || '';
  return `<button type="button" class="dash-quick-tile${primary ? ' is-primary' : ''}" data-quick="${esc(quick)}">
    <span class="dash-quick-tile__icon">${icon}</span>
    <span class="dash-quick-tile__label">${esc(label)}</span>
  </button>`;
}

function stayCoversDay(stay, day) {
  return stay.checkIn <= day && stay.checkOut >= day;
}

function staysForDayList(stays, day) {
  return stays
    .filter(stay => {
      if (stay.status === 'cancelled') return false;
      if (stay.checkIn === day || stay.checkOut === day) return true;
      return isActiveStay(stay) && stayCoversDay(stay, day);
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.room.localeCompare(b.room));
}

function dashStayTable(rows, emptyText) {
  if (!rows.length) return emptyCopy(emptyText);
  const body = rows.map(stay => `
    <tr>
      <td><strong>${esc(stay.guest)}</strong></td>
      <td>Oda ${esc(stay.room)}</td>
      <td>${esc(formatDay(stay.checkIn))}</td>
      <td>${esc(formatDay(stay.checkOut))}</td>
    </tr>
  `).join('');
  return `<table class="dash-table">
    <thead><tr><th>Misafir Adı</th><th>Oda</th><th>Giriş Tarihi</th><th>Çıkış Tarihi</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function recordedPayments(stay) {
  return (Array.isArray(stay.payments) ? stay.payments : []).filter(item => item.at);
}

// Ödeme kaydı olmayan eski rezervasyonlarda "paid" tutarı tarihi bilinmeyen tek bir tahsilat sayılır.
function paymentEntries(stay) {
  const list = Array.isArray(stay.payments) ? stay.payments : [];
  if (list.length) return list;
  const paid = Number(stay.paid) || 0;
  return paid > 0
    ? [{ id: `legacy-${stay.id}`, amount: paid, at: null, method: '', note: 'Eski kayıt (tarih bilinmiyor)', byName: '', legacy: true }]
    : [];
}

function collectedAmount(stay) {
  return paymentEntries(stay).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function remainingAmount(stay) {
  if (stay.status === 'cancelled') return 0;
  return Math.max(0, (Number(stay.total) || 0) - collectedAmount(stay));
}

function collectedOnDay(stay, day) {
  return recordedPayments(stay)
    .filter(item => String(item.at).slice(0, 10) === day)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function financeSnapshot(stays) {
  const open = stays.filter(stay => stay.status !== 'cancelled');
  const active = open.filter(isActiveStay);
  const awaiting = open.filter(stay => remainingAmount(stay) > 0);
  return {
    todayCollected: stays.reduce((sum, stay) => sum + collectedOnDay(stay, TODAY), 0),
    awaitingCount: awaiting.length,
    dueActive: active.reduce((sum, stay) => sum + remainingAmount(stay), 0),
    collected: stays.reduce((sum, stay) => sum + collectedAmount(stay), 0),
    remaining: open.reduce((sum, stay) => sum + remainingAmount(stay), 0),
    awaiting,
    todayPayments: stays.flatMap(stay => recordedPayments(stay)
      .filter(item => String(item.at).slice(0, 10) === TODAY)
      .map(item => ({ ...item, guest: stay.guest, room: stay.room }))),
  };
}

function navigateRoomsFilter(filter) {
  state.roomFilter = filter;
  navigate('rooms', { scroll: true });
  document.querySelectorAll('.chip').forEach(item => {
    const on = item.dataset.filter === filter;
    item.classList.toggle('is-on', on);
    item.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  renderRooms(snapshot());
}

function readHouseNotes() {
  const list = readJSON(KEYS.houseNotes, []);
  if (!Array.isArray(list)) return [];
  return list.filter(note => note && typeof note.id === 'string' && typeof note.text === 'string' && note.text.trim());
}

function saveHouseNotes(list) {
  writeJSON(KEYS.houseNotes, list);
}

function canManageHouseNote(note) {
  if (!state.user || !note) return false;
  return userRole(state.user) === 'yonetici' || note.createdBy === state.user.id;
}

function isFreshNote(note) {
  const at = Date.parse(note.createdAt || '');
  return Number.isFinite(at) && Date.now() - at < 24 * 60 * 60 * 1000;
}

function renderHouseNotes() {
  if (!els.houseNotesList) return;
  const notes = readHouseNotes().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  if (!notes.length) {
    els.houseNotesList.innerHTML = emptyCopy('Henüz genel not yok.');
    return;
  }
  els.houseNotesList.innerHTML = notes.map(note => {
    const actions = canManageHouseNote(note)
      ? `<div class="house-note__actions">
          <button type="button" class="btn-ghost btn-sm" data-house-note-edit="${esc(note.id)}">Düzenle</button>
          <button type="button" class="btn-ghost btn-sm btn-danger" data-house-note-delete="${esc(note.id)}">Sil</button>
        </div>`
      : '';
    const edited = note.updatedAt ? ` · düzenlendi ${esc(formatDateTime(note.updatedAt))}` : '';
    return `
    <article class="house-note${isFreshNote(note) ? ' is-new' : ''}">
      <p>${isFreshNote(note) ? '<span class="house-note__new">Yeni</span>' : ''}${esc(note.text)}</p>
      ${actions}
      <p class="house-note__meta">${esc(note.createdByName || 'Personel')} · ${esc(formatDateTime(note.createdAt))}${edited}</p>
    </article>`;
  }).join('');
}

function openHouseNoteModal(noteId) {
  if (!els.houseNoteForm || !els.modalHouseNote) return;
  const note = noteId ? readHouseNotes().find(item => item.id === noteId) : null;
  if (note && !canManageHouseNote(note)) return;
  state.houseNoteId = note ? note.id : '';
  els.houseNoteForm.reset();
  if (els.houseNoteTitle) els.houseNoteTitle.textContent = note ? 'Notu düzenle' : 'Not ekle';
  if (note) els.houseNoteForm.elements.text.value = note.text;
  setError(els.houseNoteError, '');
  openModal(els.modalHouseNote);
  els.houseNoteForm.elements.text.focus();
}

function renderDashboard(data) {
  if (!userCan(state.user, 'dashboard')) return;
  const query = pageQuery('dashboard');
  paintPageHead();
  renderHouseNotes();
  if (els.dashQuick) els.dashQuick.innerHTML = '';
  if (els.metrics) {
    els.metrics.innerHTML = [
      dashStatCard('arrivals', 'Bugünkü Girişler', String(data.arrivals.length), 'arrivals'),
      dashStatCard('departures', 'Bugünkü Çıkışlar', String(data.departures.length), 'departures'),
      dashStatCard('available', 'Müsait Odalar', String(data.stats.available), 'available'),
      dashStatCard('occupied', 'Dolu Odalar', String(data.stats.occupied), 'occupied'),
      dashStatCard('cleaning', 'Temizlik Bekleyen', String(data.stats.cleaning), 'cleaning'),
    ].join('');
  }
  if (els.dashFinance) {
    els.dashFinance.classList.add('is-hidden');
    els.dashFinance.innerHTML = '';
  }
  const matchStay = stay => matches(query, [stay.guest, stay.room, stay.note, stay.phone]);
  const todayRows = staysForDayList(data.stays, TODAY).filter(matchStay);
  const tomorrowRows = staysForDayList(data.stays, addDays(TODAY, 1)).filter(matchStay);
  if (els.dashReservations) {
    els.dashReservations.innerHTML = dashStayTable(
      todayRows,
      query ? 'Aramanızla eşleşen kayıt yok.' : 'Bugün için rezervasyon yok.',
    );
  }
  if (els.dashReservationsTomorrow) {
    els.dashReservationsTomorrow.innerHTML = dashStayTable(
      tomorrowRows,
      query ? 'Aramanızla eşleşen kayıt yok.' : 'Yarın için rezervasyon yok.',
    );
  }
}

function renderRooms(data) {
  if (!userCan(state.user, 'rooms')) return;
  const rooms = filteredRooms(data.rooms, 'rooms');
  els.roomsLede.textContent = `${data.rooms.length} oda · ${data.stats.available} müsait · ${data.stats.occupied} dolu · ${data.stats.cleaning} temizlikte`;
  const addBtn = document.getElementById('btn-add-room');
  if (addBtn) addBtn.hidden = userRole(state.user) !== 'yonetici';
  if (!rooms.length) {
    els.roomsGrid.innerHTML = emptyCopy('Bu görünümde oda yok.');
    return;
  }
  els.roomsGrid.innerHTML = ROOM_GROUPS.map(group => {
    const list = rooms.filter(room => room.max === group.max);
    if (!list.length) return '';
    return `<section class="room-group" aria-label="${esc(group.title)}">
      <header class="room-group__head">
        <h3>${esc(group.title)}</h3>
        <span>${list.length} oda</span>
      </header>
      <div class="room-grid">${list.map(room => roomCard(room, true)).join('')}</div>
    </section>`;
  }).join('');
}

function stayRank(stay) {
  if (stay.status === 'inhouse' && stay.checkOut <= TODAY) return 0;
  if (isUpcoming(stay) && stay.checkIn <= TODAY) return 1;
  if (stay.status === 'inhouse') return 2;
  if (stay.status === 'pending') return 3;
  if (stay.status === 'expected') return 4;
  return 5;
}

function stayBadge(stay) {
  return stayStatusBadge(stay);
}

function stayNights(stay) {
  return nightsBetween(stay.checkIn, stay.checkOut);
}

function stayMatchesFocus(stay) {
  if (state.listFocus === 'arrivals') return isUpcoming(stay) && stay.checkIn === TODAY;
  if (state.listFocus === 'departures') return stay.status === 'inhouse' && stay.checkOut === TODAY;
  return true;
}

function resFilters() {
  if (!state.resFilter) state.resFilter = { status: 'all', room: 'all', from: '', to: '' };
  return state.resFilter;
}

function stayMatchesFilters(stay, query) {
  const f = resFilters();
  if (!stayMatchesFocus(stay)) return false;
  if (f.status !== 'all' && stay.status !== f.status) return false;
  if (f.room !== 'all' && stay.room !== f.room) return false;
  if (f.from && stay.checkOut <= f.from) return false;
  if (f.to && stay.checkIn > f.to) return false;
  const digits = (stay.phone || '').replace(/\D/g, '');
  return matches(query, [stay.guest, stay.phone, digits, `oda ${stay.room}`, stay.code, STAY_LABEL[stay.status]]);
}

function roomOptionsHtml(selected, { includeAll = false, disabled = () => false, label = room => `Oda ${room.no} · ${room.max} kişilik` } = {}) {
  const rooms = roomsCatalog();
  const groups = ROOM_GROUPS.map(group => {
    const list = rooms.filter(room => room.max === group.max);
    if (!list.length) return '';
    const options = list.map(room => {
      const off = disabled(room);
      return `<option value="${esc(room.no)}"${room.no === selected ? ' selected' : ''}${off ? ' disabled' : ''}>${esc(label(room))}${off ? ' — dolu' : ''}</option>`;
    }).join('');
    return `<optgroup label="${esc(group.title)}">${options}</optgroup>`;
  }).join('');
  return `${includeAll ? `<option value="all"${selected === 'all' ? ' selected' : ''}>Tüm odalar</option>` : ''}${groups}`;
}

function renderReservationSummary(stays) {
  const host = document.getElementById('res-metrics');
  if (!host) return;
  const f = resFilters();
  const count = fn => stays.filter(fn).length;
  const cards = [
    ['all', 'Toplam rezervasyon', stays.length],
    ['arrivals', 'Bugünkü girişler', count(s => isUpcoming(s) && s.checkIn === TODAY)],
    ['departures', 'Bugünkü çıkışlar', count(s => s.status === 'inhouse' && s.checkOut === TODAY)],
    ['inhouse', 'Devam eden konaklamalar', count(s => s.status === 'inhouse')],
    ['pending', 'Bekleyen rezervasyonlar', count(s => s.status === 'pending')],
    ['cancelled', 'İptal edilenler', count(s => s.status === 'cancelled')],
  ];
  const activeKey = state.listFocus || (f.status === 'all' ? 'all' : f.status);
  host.innerHTML = cards.map(([key, label, value]) => `
    <button type="button" class="res-stat${activeKey === key ? ' is-on' : ''}" data-res-quick="${key}">
      <span>${esc(label)}</span>
      <strong>${value}</strong>
    </button>`).join('');
}

function syncResFilterInputs() {
  const f = resFilters();
  const status = document.getElementById('res-filter-status');
  const room = document.getElementById('res-filter-room');
  const from = document.getElementById('res-filter-from');
  const to = document.getElementById('res-filter-to');
  if (status) status.value = f.status;
  if (room) {
    room.innerHTML = roomOptionsHtml(f.room, { includeAll: true, label: r => `Oda ${r.no}` });
    room.value = f.room;
  }
  if (from) from.value = f.from;
  if (to) to.value = f.to;
}

function focusBanner() {
  if (state.listFocus === 'arrivals') {
    return `<div class="focus-note"><p>Bugün giriş yapacak rezervasyonlar.</p><button type="button" class="btn-ghost btn-sm" data-clear-focus>Tümünü göster</button></div>`;
  }
  if (state.listFocus === 'departures') {
    return `<div class="focus-note"><p>Bugün çıkış yapacak misafirler.</p><button type="button" class="btn-ghost btn-sm" data-clear-focus>Tümünü göster</button></div>`;
  }
  return '';
}

function renderReservations(data) {
  if (!userCan(state.user, 'reservations')) return;
  const query = pageQuery('reservations');
  renderReservationSummary(data.stays);
  syncResFilterInputs();
  const banner = focusBanner();
  const rows = data.stays
    .filter(stay => stayMatchesFilters(stay, query))
    .sort((a, b) => stayRank(a) - stayRank(b) || a.checkIn.localeCompare(b.checkIn) || compareRoomNo(a.room, b.room));
  const countLine = document.getElementById('res-count');
  if (countLine) countLine.textContent = `${rows.length} kayıt gösteriliyor`;
  if (!rows.length) {
    const empty = state.listFocus === 'arrivals'
      ? 'Bugün giriş yapacak rezervasyon yok.'
      : state.listFocus === 'departures'
        ? 'Bugün çıkış yapacak misafir yok.'
        : 'Filtrelerle eşleşen rezervasyon yok.';
    els.resList.innerHTML = banner + emptyCopy(empty);
    return;
  }
  const body = rows.map(stay => {
    const paid = collectedAmount(stay);
    const remaining = remainingAmount(stay);
    return `<tr data-stay-open="${esc(stay.id)}" tabindex="0">
      <td class="mono">${esc(stayLabel(stay))}</td>
      <td><strong>${esc(stay.guest)}</strong></td>
      <td>${esc(stay.phone || '—')}</td>
      <td>Oda ${esc(stay.room)}</td>
      <td class="num">${stay.pax}</td>
      <td>${esc(formatDay(stay.checkIn))}</td>
      <td>${esc(formatDay(stay.checkOut))}</td>
      <td class="num">${stayNights(stay)}</td>
      <td class="num">${money(stay.total)}</td>
      <td class="num">${money(paid)}</td>
      <td class="num${remaining > 0 && stay.status !== 'cancelled' ? ' is-due' : ''}">${money(remaining)}</td>
      <td>${stayStatusBadge(stay)}</td>
      <td><button type="button" class="btn-line btn-line--sm" data-stay-open="${esc(stay.id)}">Detay</button></td>
    </tr>`;
  }).join('');
  els.resList.innerHTML = `${banner}<div class="table-wrap"><table class="data-table res-table">
    <thead><tr>
      <th>Rez. No</th><th>Misafir</th><th>Telefon</th><th>Oda</th><th class="num">Kişi</th>
      <th>Giriş</th><th>Çıkış</th><th class="num">Gece</th><th class="num">Toplam</th>
      <th class="num">Ödenen</th><th class="num">Kalan</th><th>Durum</th><th></th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

const STAY_COLORS = ['#4F6B58', '#7A5C3E', '#53627E', '#86564F', '#5F6A3A', '#4C6D72', '#6E5576', '#8A6A2F'];

function stayColor(stay) {
  let hash = 0;
  for (const ch of stay.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return STAY_COLORS[hash % STAY_COLORS.length];
}

function calendarRoomState(room) {
  const key = ROOM_STATUSES.includes(room.status) ? room.status : 'available';
  return { key, label: STATUS_LABEL[key] };
}

const TL_STATUS_LABEL = STAY_LABEL;

function renderCalendar(data) {
  if (!userCan(state.user, 'calendar') || !els.calTimeline) return;
  const year = state.calYear;
  const month = state.calMonth;
  const days = new Date(year, month + 1, 0).getDate();
  const start = isoFromDate(new Date(year, month, 1));
  const end = addDays(start, days);
  els.calTitle.textContent = formatMonth(year, month);
  const query = pageQuery('calendar');
  const stays = data.stays.filter(stay => (
    stay.status !== 'cancelled' && stay.checkIn < end && stay.checkOut > start
  ));
  const matchingStay = stay => matches(query, [stay.guest, stay.room, stay.phone]);
  const rooms = data.rooms.filter(room => !query
    || matches(query, [room.no, room.name, room.type])
    || stays.some(stay => stay.room === room.no && matchingStay(stay)));

  const dayIso = [];
  for (let i = 0; i < days; i += 1) dayIso.push(addDays(start, i));
  const dayClass = iso => {
    const dow = parseISO(iso).getDay();
    return `${dow === 0 || dow === 6 ? ' is-weekend' : ''}${iso === TODAY ? ' is-today' : ''}`;
  };
  const head = dayIso.map((iso, i) => {
    const date = parseISO(iso);
    const wd = cap(date.toLocaleDateString('tr-TR', { weekday: 'short' }).replace(/\./g, ''));
    return `<div class="tl-day${dayClass(iso)}" style="grid-column:${i + 2}"><span>${esc(wd)}</span><strong>${date.getDate()}</strong></div>`;
  }).join('');
  const cells = dayIso.map((iso, i) => `<div class="tl-cell${dayClass(iso)}" style="grid-column:${i + 2}"></div>`).join('');

  const roomRow = room => {
    const roomState = calendarRoomState(room);
    const blocks = stays.filter(stay => stay.room === room.no && (!query || matchingStay(stay) || matches(query, [room.no]))).map(stay => {
      const startsIn = stay.checkIn >= start;
      const endsIn = stay.checkOut < end;
      const from = startsIn ? nightsBetween(start, stay.checkIn) : 0;
      const to = endsIn ? nightsBetween(start, stay.checkOut) : days - 1;
      const style = [
        `grid-column:${from + 2} / ${to + 3}`,
        `--c:${stayColor(stay)}`,
        startsIn ? 'margin-left:calc(var(--tl-col) / 2)' : '',
        endsIn ? 'margin-right:calc(var(--tl-col) / 2)' : '',
      ].filter(Boolean).join(';');
      const label = `${stay.guest} · ${formatDay(stay.checkIn)} – ${formatDay(stay.checkOut)}`;
      return `<button type="button" class="tl-block is-${esc(stay.status)}" style="${style}" data-stay-open="${esc(stay.id)}" title="${esc(`${label} · ${TL_STATUS_LABEL[stay.status] || ''}`)}">
        <strong>${esc(stay.guest)}</strong><span>${esc(formatDay(stay.checkIn))} – ${esc(formatDay(stay.checkOut))}</span>
      </button>`;
    }).join('');
    return `<div class="tl-row">
      <div class="tl-room">
        <strong>${esc(roomDisplayLabel(room.no))}</strong>
        <span class="tl-room__meta"><i class="tl-dot tl-dot--${roomState.key}"></i>${esc(roomState.label)} · ${room.max} kişi</span>
      </div>
      ${cells}${blocks}
    </div>`;
  };
  const rows = ROOM_GROUPS.map(group => {
    const list = rooms.filter(room => room.max === group.max);
    if (!list.length) return '';
    return `<div class="tl-row tl-row--group"><div class="tl-group">${esc(group.title)}</div></div>${list.map(roomRow).join('')}`;
  }).join('');

  els.calTimeline.style.setProperty('--days', String(days));
  els.calTimeline.innerHTML = `
    <div class="tl-row tl-row--head"><div class="tl-corner">Oda</div>${head}</div>
    ${rows || `<div class="tl-empty">${esc(query ? 'Aramanızla eşleşen oda veya rezervasyon yok.' : 'Oda yok.')}</div>`}`;
  if (state.calScrollToday) {
    state.calScrollToday = false;
    const todayCell = els.calTimeline.querySelector('.tl-day.is-today');
    if (todayCell) els.calTimeline.scrollLeft = Math.max(0, todayCell.offsetLeft - 220);
  }
}

function renderAudit() {
  if (!userCan(state.user, 'audit')) return;
  const isAdmin = userRole(state.user) === 'yonetici';
  els.auditLede.textContent = isAdmin
    ? 'Tüm kullanıcıların işlem kayıtları. Kayıtları düzenleyebilir veya silebilirsiniz.'
    : 'Yalnızca sizin işlem kayıtlarınız. Kendi kayıtlarınızı düzenleyebilir veya silebilirsiniz.';
  const query = pageQuery('audit');
  let rows = readAudit();
  if (!isAdmin) rows = rows.filter(r => r.userId === state.user.id);
  rows = rows.filter(r => matches(query, [r.action, r.detail, r.userName]));
  const toolbar = isAdmin
    ? `<div class="audit-toolbar">
        <p class="audit-toolbar__hint">En fazla 500 kayıt tutulur.</p>
        <button type="button" class="btn-ghost btn-danger btn-sm" data-audit-clear-all>Tümünü temizle</button>
      </div>`
    : '';
  if (!rows.length) {
    els.auditList.innerHTML = `${toolbar}${emptyCopy('Kayıt yok.')}`;
    return;
  }
  const body = rows.slice(0, 100).map(r => {
    const actions = canManageAuditEntry(r)
      ? `<div class="ledger-actions">
          <button type="button" class="btn-ghost btn-sm" data-audit-edit="${esc(r.id)}">Düzenle</button>
          <button type="button" class="btn-ghost btn-sm btn-danger" data-audit-delete="${esc(r.id)}">Sil</button>
        </div>`
      : '<span class="room-meta">—</span>';
    return `
    <div class="ledger-row">
      <span>${formatDateTime(r.at)}</span>
      <span>${esc(r.userName)}</span>
      <strong>${esc(r.action)}</strong>
      <span>${esc(r.detail)}</span>
      ${actions}
    </div>`;
  }).join('');
  els.auditList.innerHTML = `${toolbar}<div class="ledger ledger--audit-actions" data-layout="audit">
    <div class="ledger-row ledger-head"><span>Zaman</span><span>Kullanıcı</span><span>İşlem</span><span>Detay</span><span>İşlemler</span></div>
    ${body}
  </div>`;
}

function renderFinance(data) {
  if (!userCan(state.user, 'finance')) return;
  const query = pageQuery('finance');
  const fin = financeSnapshot(data.stays);
  els.finMetrics.innerHTML = [
    metricCard('collected', 'Bugünkü tahsilatlar', money(fin.todayCollected), 'bugün kaydedilen ödemeler'),
    metricCard('due', 'Tahsilatı bekleyen', String(fin.awaitingCount), 'bakiyesi kalan rezervasyon'),
    metricCard('inhouse', 'Alınacak toplam tutar', money(fin.dueActive), 'konaklayan ve bekleyen'),
    metricCard('stay', 'Tahsil edilmiş tutar', money(fin.collected), 'ödeme kayıtlarından'),
    metricCard('upcoming', 'Kalan tutar', money(fin.remaining), 'iptal hariç bakiye'),
  ].join('');
  const todayLines = fin.todayPayments.filter(item => matches(query, [item.guest, item.room]));
  const awaiting = fin.awaiting.filter(stay => matches(query, [stay.guest, stay.room, stay.phone]));
  const todayBody = todayLines.length
    ? `<div class="ledger" data-layout="fin">
        <div class="ledger-row ledger-head"><span>Misafir</span><span>Oda</span><span>Tutar</span><span>Saat</span><span>Kayıt</span></div>
        ${todayLines.map(item => `
          <div class="ledger-row">
            <strong>${esc(item.guest)}</strong>
            <span>${esc(item.room)}</span>
            <span>${money(item.amount)}</span>
            <span>${esc(formatDateTime(item.at))}</span>
            <span>${badge('available', 'Tahsil')}</span>
          </div>
        `).join('')}
      </div>`
    : emptyCopy(query ? 'Aramanızla eşleşen tahsilat yok.' : 'Bugün kaydedilmiş tahsilat yok.');
  const waitBody = awaiting.length
    ? `<div class="ledger" data-layout="fin">
        <div class="ledger-row ledger-head"><span>Misafir</span><span>Oda</span><span>Tahsil edilen</span><span>Kalan</span><span>Durum</span></div>
        ${awaiting.map(stay => `
          <div class="ledger-row">
            <strong>${esc(stay.guest)}</strong>
            <span>${esc(stay.room)}</span>
            <span>${money(collectedAmount(stay))}</span>
            <span>${money(remainingAmount(stay))}</span>
            <span>${badge(stay.paymentStatus === 'partial' ? 'soon' : 'neutral', PAYMENT_LABEL[stay.paymentStatus] || 'Ödenmedi')}</span>
          </div>
        `).join('')}
      </div>`
    : emptyCopy(query ? 'Aramanızla eşleşen bakiye yok.' : 'Tahsilatı bekleyen rezervasyon yok.');
  els.finList.innerHTML = `
    <h2 class="fin-sub">Bugünkü tahsilatlar</h2>
    ${todayBody}
    <h2 class="fin-sub">Tahsilatı bekleyen rezervasyonlar</h2>
    ${waitBody}`;
}

const PRICE_HORIZON_DAYS = 30;

function bookedNightsInWindow(stays, roomNo, from, days) {
  const to = addDays(from, days);
  let total = 0;
  let weekend = 0;
  stays.forEach(stay => {
    if (roomNo && stay.room !== roomNo) return;
    if (!isActiveStay(stay)) return;
    const start = stay.checkIn > from ? stay.checkIn : from;
    const end = stay.checkOut < to ? stay.checkOut : to;
    for (let day = start; day < end; day = addDays(day, 1)) {
      total += 1;
      const dow = parseISO(day).getDay();
      if (dow === 5 || dow === 6) weekend += 1;
    }
  });
  return { total, weekend };
}

function weekendNightCount(from, days) {
  let count = 0;
  for (let i = 0; i < days; i += 1) {
    const dow = parseISO(addDays(from, i)).getDay();
    if (dow === 5 || dow === 6) count += 1;
  }
  return count;
}

function seasonFactor(day) {
  const date = parseISO(day);
  const month = date.getMonth() + 1;
  const dom = date.getDate();
  if ((month === 12 && dom >= 20) || (month === 1 && dom <= 5)) return { pct: 5, label: 'Yılbaşı dönemi' };
  if (month >= 6 && month <= 9) return { pct: 6, label: 'Yaz sezonu' };
  if (month === 4 || month === 5 || month === 10) return { pct: 2, label: 'Ara sezon' };
  return { pct: -3, label: 'Düşük sezon' };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function priceContext(data) {
  const stays = data.stays.filter(stay => stay.status !== 'cancelled');
  const rooms = data.rooms;
  const hotel = bookedNightsInWindow(stays, null, TODAY, PRICE_HORIZON_DAYS);
  const weekendNights = weekendNightCount(TODAY, PRICE_HORIZON_DAYS);
  const weekdayNights = PRICE_HORIZON_DAYS - weekendNights;
  const roomCount = Math.max(rooms.length, 1);
  const arrivals14 = stays.filter(stay => isUpcoming(stay) && stay.checkIn >= TODAY && stay.checkIn < addDays(TODAY, 14)).length;
  return {
    stays,
    rooms,
    hotelOcc: hotel.total / (roomCount * PRICE_HORIZON_DAYS),
    weekendOcc: weekendNights ? hotel.weekend / (roomCount * weekendNights) : 0,
    weekdayOcc: weekdayNights ? (hotel.total - hotel.weekend) / (roomCount * weekdayNights) : 0,
    demand: arrivals14 / roomCount,
    arrivals14,
    season: seasonFactor(addDays(TODAY, 15)),
    hasData: stays.some(stay => stay.status !== 'cancelled'),
  };
}

function rulePriceSuggestion(room, ctx) {
  const current = room.priceNight || 0;
  const reasons = [];
  let pct = 0;
  const own = bookedNightsInWindow(ctx.stays, room.no, TODAY, PRICE_HORIZON_DAYS);
  const roomOcc = own.total / PRICE_HORIZON_DAYS;
  const history = ctx.stays.filter(stay => stay.room === room.no && stay.checkOut >= addDays(TODAY, -180));
  const avgStay = history.length
    ? history.reduce((sum, stay) => sum + nightsBetween(stay.checkIn, stay.checkOut), 0) / history.length
    : 0;

  if (ctx.hasData) {
    pct += ctx.season.pct;
    reasons.push(`${ctx.season.label} (${ctx.season.pct > 0 ? '+' : ''}${ctx.season.pct}%)`);
    if (roomOcc >= 0.8) { pct += 10; reasons.push(`Bu odanın 30 günlük doluluğu çok yüksek (%${Math.round(roomOcc * 100)})`); }
    else if (roomOcc >= 0.6) { pct += 6; reasons.push(`Bu odanın 30 günlük doluluğu yüksek (%${Math.round(roomOcc * 100)})`); }
    else if (roomOcc >= 0.4) { pct += 2; reasons.push(`Bu odanın doluluğu orta seviyede (%${Math.round(roomOcc * 100)})`); }
    else if (roomOcc < 0.15 && ctx.hotelOcc < 0.35) { pct -= 5; reasons.push(`Oda ve otel doluluğu düşük (%${Math.round(roomOcc * 100)} / %${Math.round(ctx.hotelOcc * 100)})`); }

    if (ctx.hotelOcc >= 0.75) { pct += 4; reasons.push(`Otel genel doluluğu yüksek (%${Math.round(ctx.hotelOcc * 100)})`); }

    if (ctx.weekendOcc >= 0.4 && ctx.weekendOcc >= ctx.weekdayOcc * 1.5) {
      pct += 3;
      reasons.push(`Hafta sonu talebi hafta içinden belirgin yüksek (%${Math.round(ctx.weekendOcc * 100)} / %${Math.round(ctx.weekdayOcc * 100)})`);
    }

    if (ctx.demand >= 1) { pct += 3; reasons.push(`Talep yoğun: önümüzdeki 14 günde ${ctx.arrivals14} giriş`); }

    if (avgStay >= 5) {
      pct = Math.min(pct, 5);
      reasons.push(`Uzun konaklamalar ağırlıkta (ort. ${avgStay.toFixed(1)} gece), artış sınırlı tutuldu`);
    }
  } else {
    reasons.push(`Henüz rezervasyon verisi yok; ${ctx.season.label.toLocaleLowerCase('tr-TR')} tek başına fiyat değişikliği için yeterli sayılmadı`);
  }

  const peers = ctx.rooms.filter(other => other.max === room.max && other.no !== room.no && other.priceNight > 0);
  if (peers.length && current > 0) {
    const peerMedian = median(peers.map(other => other.priceNight));
    const amenityCount = roomAmenityKeys(room).size;
    const peerAmenities = peers.reduce((sum, other) => sum + roomAmenityKeys(other).size, 0) / peers.length;
    if (current < peerMedian * 0.9 && amenityCount >= peerAmenities) {
      pct += 4;
      reasons.push(`Aynı kapasitedeki odaların ortanca fiyatının (${money(peerMedian)}) altında, olanakları benzer veya fazla`);
    } else if (current > peerMedian * 1.15 && amenityCount < peerAmenities) {
      pct -= 3;
      reasons.push(`Aynı kapasitedeki odalardan pahalı (${money(peerMedian)} ortanca), olanakları daha az`);
    }
  }

  pct = Math.max(-10, Math.min(15, pct));
  const suggested = current > 0 ? Math.max(50, Math.round((current * (1 + pct / 100)) / 50) * 50) : 0;
  return {
    current,
    suggested,
    pct: current > 0 ? Math.round(((suggested - current) / current) * 100) : 0,
    reasons,
    metrics: { roomOcc, avgStay },
  };
}

// Gerçek bir yapay zekâ servisi bağlanırsa aynı suggest(room, ctx) imzasıyla buraya eklenir.
const PRICE_ADVISORS = {
  rules: { label: 'Kural tabanlı öneri', suggest: rulePriceSuggestion },
};

function activePriceAdvisor() {
  return PRICE_ADVISORS.rules;
}

function renderPricing(data) {
  const host = document.getElementById('pricing-list');
  if (!host || !userCan(state.user, 'pricing')) return;
  const advisor = activePriceAdvisor();
  const ctx = priceContext(data);
  const query = pageQuery('pricing');
  const summary = document.getElementById('pricing-summary');
  if (summary) {
    summary.textContent = `${advisor.label} · Otel doluluğu (30 gün): %${Math.round(ctx.hotelOcc * 100)} · Önümüzdeki 14 günde ${ctx.arrivals14} giriş · ${ctx.season.label}`;
  }
  const rooms = data.rooms.filter(room => matches(query, [room.no, room.name, room.type]));
  if (!rooms.length) {
    host.innerHTML = emptyCopy('Eşleşen oda yok.');
    return;
  }
  host.innerHTML = ROOM_GROUPS.map(group => {
    const list = rooms.filter(room => room.max === group.max);
    if (!list.length) return '';
    const rows = list.map(room => {
      const s = advisor.suggest(room, ctx);
      const same = s.suggested === s.current;
      const delta = same ? 'Değişiklik önerilmiyor' : `${s.pct > 0 ? '+' : ''}${s.pct}%`;
      return `<div class="price-row">
        <div class="price-row__room">
          <strong>${esc(roomDisplayLabel(room.no))}</strong>
          <span class="room-meta">${esc(room.name || '')} · ${room.max} kişilik · doluluk %${Math.round(s.metrics.roomOcc * 100)}</span>
        </div>
        <form class="price-row__edit" data-price-form="${esc(room.no)}" novalidate>
          <label class="sr-only" for="price-${esc(room.no)}">Oda ${esc(room.no)} gecelik fiyat</label>
          <input class="field field--sm" id="price-${esc(room.no)}" type="number" name="price" min="1" step="1" value="${room.priceNight || ''}">
          <button type="submit" class="btn-line btn-line--sm">Kaydet</button>
        </form>
        <div class="price-row__suggest">
          <strong>${s.suggested ? money(s.suggested) : '—'}</strong>
          <span class="room-meta">${esc(delta)}</span>
        </div>
        <ul class="price-row__why">${s.reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul>
        <div class="price-row__act">
          ${same || !s.suggested ? '' : `<button type="button" class="btn-primary btn-sm" data-price-approve="${esc(room.no)}" data-price-value="${s.suggested}">Öneriyi onayla</button>`}
        </div>
      </div>`;
    }).join('');
    return `<section class="price-group">
      <h3>${esc(group.title)}</h3>
      <div class="price-table">
        <div class="price-row price-row--head"><span>Oda</span><span>Mevcut fiyat</span><span>Önerilen</span><span>Gerekçe</span><span></span></div>
        ${rows}
      </div>
    </section>`;
  }).join('');
}

function renderSettings() {
  const select = document.getElementById('settings-currency');
  if (select) select.value = readSettings().currency;
  const host = document.getElementById('settings-room-map');
  if (!host) return;
  const rooms = roomsCatalog();
  const rows = ROOM_GROUPS.map(group => {
    const list = rooms.filter(room => room.max === group.max);
    if (!list.length) return '';
    return `<tr class="group-row"><th colspan="4">${esc(group.title)}</th></tr>${list.map(room => `<tr>
      <td>Oda ${esc(room.no)}</td>
      <td>${room.legacyNo ? `Oda ${esc(room.legacyNo)}` : '—'}</td>
      <td>${esc(room.name || '')}</td>
      <td>${room.photoKey ? `oda-${esc(String(room.photoKey).padStart(2, '0'))}` : 'Fotoğraf yok'}</td>
    </tr>`).join('')}`;
  }).join('');
  host.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Yeni numara</th><th>Eski numara</th><th>Oda adı</th><th>Fotoğraf klasörü</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renumberFromSettings() {
  if (userRole(state.user) !== 'yonetici') return;
  const rooms = roomsCatalog();
  const ordered = ROOM_GROUPS.flatMap(group => rooms.filter(room => room.max === group.max).sort((a, b) => compareRoomNo(a.no, b.no)));
  const moves = ordered.filter((room, i) => room.no !== String(i + 1));
  if (!moves.length) {
    toast('Oda numaraları zaten kapasite sırasına göre düzenli.');
    return;
  }
  const preview = moves.map(room => `Oda ${room.no} → Oda ${ordered.indexOf(room) + 1}`).join('\n');
  if (!window.confirm(`Aşağıdaki odaların numarası değişecek. Rezervasyonlar, fiyatlar, notlar ve fotoğraflar odayla birlikte taşınır.\n\n${preview}\n\nDevam edilsin mi?`)) return;
  const result = renumberRooms(rooms.map(room => ({ ...room, legacyNo: room.legacyNo || room.no })), { firstRun: false });
  if (result.error) {
    toast('Numaralandırma tamamlanamadı; veriler önceki hâline döndürüldü.');
    return;
  }
  renderOperational();
  toast('Oda numaraları kapasite sırasına göre düzenlendi.');
}

function stayDetailHtml(stay) {
  const room = findRoom(stay.room);
  const nights = stayNights(stay);
  const paid = collectedAmount(stay);
  const remaining = remainingAmount(stay);
  const rows = [
    ['Rezervasyon no', stayLabel(stay)],
    ['Telefon', stay.phone || '—'],
    ['Oda', `${roomDisplayLabel(stay.room)}${room ? ` · ${room.type}` : ''}`],
    ['Giriş', formatLong(stay.checkIn)],
    ['Çıkış', formatLong(stay.checkOut)],
    ['Konaklama', `${nights} gece`],
    ['Kişi', String(stay.pax)],
    ['Gecelik fiyat', stay.priceNight ? money(stay.priceNight) : 'Kayıtlı değil (eski kayıt)'],
    ['İndirim', money(stay.discount || 0)],
    ['Genel toplam', money(stay.total)],
    ['Ödenen', money(paid)],
    ['Kalan bakiye', money(remaining)],
  ];
  if (stay.actualCheckIn) rows.push(['Giriş saati', formatDateTime(stay.actualCheckIn)]);
  if (stay.actualCheckOut) rows.push(['Çıkış saati', formatDateTime(stay.actualCheckOut)]);
  const id = esc(stay.id);
  const buttons = [];
  if (stay.status === 'pending') buttons.push(`<button type="button" class="btn-line" data-stay-confirm="${id}">Onayla</button>`);
  buttons.push(`<button type="button" class="btn-line" data-stay-edit="${id}">Düzenle</button>`);
  if (stay.status !== 'cancelled' && remaining > 0) buttons.push(`<button type="button" class="btn-line" data-stay-pay="${id}">Ödeme ekle</button>`);
  if (isUpcoming(stay)) {
    buttons.push(`<button type="button" class="btn-ghost btn-danger" data-cancel-stay="${id}">İptal et</button>`);
    if (stay.checkIn <= TODAY) buttons.push(`<button type="button" class="btn-primary" data-check-in="${id}">Giriş yap</button>`);
  }
  if (stay.status === 'inhouse') buttons.push(`<button type="button" class="btn-primary" data-check-out="${id}">Çıkış yap</button>`);
  const payments = paymentEntries(stay);
  const paymentRows = payments.length
    ? payments.map(p => `<li><strong>${money(p.amount)}</strong> <span class="room-meta">${p.at ? esc(formatDateTime(p.at)) : 'tarih bilinmiyor'}${p.method ? ` · ${esc(PAYMENT_METHODS[p.method] || p.method)}` : ''}${p.byName ? ` · ${esc(p.byName)}` : ''}${p.note ? ` · ${esc(p.note)}` : ''}</span></li>`).join('')
    : '<li class="room-meta">Ödeme kaydı yok.</li>';
  const notes = [
    ...(stay.note ? [{ text: stay.note, at: stay.createdAt, byName: 'Rezervasyon açıklaması' }] : []),
    ...stay.notes,
  ];
  const noteRows = notes.length
    ? notes.map(n => `<li><p>${esc(n.text)}</p><span class="room-meta">${esc(n.byName || '')}${n.at ? ` · ${esc(formatDateTime(n.at))}` : ''}</span></li>`).join('')
    : '<li class="room-meta">Not yok.</li>';
  const history = stay.roomHistory.filter(h => h.reason !== 'renumber');
  return `
    <h3 id="stay-detail-title">${esc(stay.guest)}</h3>
    <p class="lede">${stayStatusBadge(stay)}</p>
    <dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${history.length ? `<p class="room-meta">Oda değişiklikleri: ${history.map(h => `Oda ${esc(h.from)} → Oda ${esc(h.to)} (${esc(formatDateTime(h.at))})`).join(', ')}</p>` : ''}
    <section class="detail-block">
      <h4>Ödemeler</h4>
      <ul class="detail-list">${paymentRows}</ul>
    </section>
    <section class="detail-block">
      <h4>Notlar</h4>
      <ul class="detail-list">${noteRows}</ul>
      <form class="stay-note-form" data-stay-note-form="${id}" novalidate>
        <label class="sr-only" for="stay-note-input">Rezervasyon notu</label>
        <textarea class="field field-area" id="stay-note-input" name="text" rows="2" maxlength="300" placeholder="Rezervasyona not ekleyin…"></textarea>
        <button type="submit" class="btn-line btn-line--sm">Not ekle</button>
      </form>
    </section>
    <div class="form-actions form-actions--wrap">
      <button type="button" class="btn-ghost" data-close>Kapat</button>
      <span class="form-actions__spacer"></span>
      ${buttons.join('')}
    </div>`;
}

function stayDetailModal() {
  return document.getElementById('modal-stay-detail');
}

function openStayDetail(stayId) {
  const stay = allStays().find(item => item.id === stayId);
  const modal = stayDetailModal();
  const body = document.getElementById('stay-detail-body');
  if (!stay || !modal || !body) return;
  state.detailStayId = stay.id;
  body.innerHTML = stayDetailHtml(stay);
  body.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(modal)));
  if (!modal.classList.contains('is-open')) openModal(modal);
}

function refreshStayDetail() {
  const modal = stayDetailModal();
  if (modal && modal.classList.contains('is-open') && state.detailStayId) openStayDetail(state.detailStayId);
}

function updateStay(stayId, mutate) {
  const stays = readStays();
  const idx = stays.findIndex(s => s.id === stayId);
  if (idx < 0) return null;
  const next = mutate({ ...stays[idx] });
  if (!next) return null;
  stays[idx] = next;
  saveStays(stays);
  return next;
}

function confirmStay(stayId) {
  const stay = updateStay(stayId, s => (s.status === 'pending' ? { ...s, status: 'expected', confirmedAt: nowISO() } : null));
  if (!stay) return;
  appendAudit('Rezervasyon onaylandı', `${stayLabel(stay)} · ${stay.guest} · Oda ${stay.room}`);
  renderOperational();
  refreshStayDetail();
  toast('Rezervasyon onaylandı.');
}

function addStayNote(stayId, text) {
  const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 300);
  if (clean.length < 2) {
    toast('Notu yazın.');
    return;
  }
  const stay = updateStay(stayId, s => ({
    ...s,
    notes: [...s.notes, { id: `snote-${Date.now()}`, text: clean, at: nowISO(), byName: state.user.name }],
  }));
  if (!stay) return;
  appendAudit('Rezervasyon notu', `${stayLabel(stay)} · ${clean.slice(0, 60)}`);
  refreshStayDetail();
  toast('Not eklendi.');
}

function openPaymentModal(stayId) {
  const stay = allStays().find(s => s.id === stayId);
  const modal = document.getElementById('modal-payment');
  const form = document.getElementById('payment-form');
  if (!stay || !modal || !form) return;
  state.paymentStayId = stay.id;
  form.reset();
  const remaining = remainingAmount(stay);
  form.elements.amount.value = String(remaining);
  form.elements.amount.max = String(remaining);
  document.getElementById('payment-meta').textContent = `${stayLabel(stay)} · ${stay.guest} · Kalan bakiye ${money(remaining)}`;
  setError(document.getElementById('payment-error'), '');
  openModal(modal);
  form.elements.amount.focus();
}

function savePayment(form) {
  const errorNode = document.getElementById('payment-error');
  const stay = allStays().find(s => s.id === state.paymentStayId);
  if (!stay) return setError(errorNode, 'Rezervasyon bulunamadı.');
  if (stay.status === 'cancelled') return setError(errorNode, 'İptal edilen rezervasyona ödeme eklenemez.');
  const amount = Math.round(Number(form.elements.amount.value));
  const method = PAYMENT_METHODS[form.elements.method.value] ? form.elements.method.value : 'cash';
  const note = String(form.elements.note.value || '').trim().slice(0, 120);
  const remaining = remainingAmount(stay);
  if (!Number.isFinite(amount) || amount <= 0) return setError(errorNode, 'Geçerli bir tutar girin.');
  if (amount > remaining) return setError(errorNode, `Tutar kalan bakiyeden (${money(remaining)}) büyük olamaz.`);
  const updated = updateStay(stay.id, s => {
    const entries = paymentEntries(s).map(p => ({ ...p }));
    entries.push({ id: `pay-${Date.now()}`, amount, at: nowISO(), method, note, byName: state.user.name, legacy: false });
    const paid = entries.reduce((sum, p) => sum + p.amount, 0);
    return { ...s, payments: entries, paid, paymentStatus: paymentStatusFrom(s.total, paid) };
  });
  if (!updated) return setError(errorNode, 'Ödeme kaydedilemedi.');
  appendAudit('Ödeme alındı', `${stayLabel(updated)} · ${updated.guest} · ${money(amount)} · ${PAYMENT_METHODS[method]}`);
  closeModal(document.getElementById('modal-payment'));
  renderOperational();
  refreshStayDetail();
  toast(`${money(amount)} ödeme kaydedildi.`);
}

function stayEditQuote(stay, roomNo, checkIn, checkOut) {
  const changed = roomNo !== stay.room || checkIn !== stay.checkIn || checkOut !== stay.checkOut;
  if (!changed) {
    return { changed: false, priceNight: stay.priceNight, nights: stayNights(stay), subtotal: stay.subtotal, discount: stay.discount, total: stay.total };
  }
  const room = findRoom(roomNo);
  const rate = roomNo === stay.room && stay.priceNight ? stay.priceNight : (room ? room.priceNight : 0);
  const nights = isISO(checkIn) && isISO(checkOut) && checkIn < checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const subtotal = nights * rate;
  const discount = Math.min(stay.discount || 0, subtotal);
  return { changed: true, priceNight: rate, nights, subtotal, discount, total: subtotal - discount };
}

function stayEditLocked(stay) {
  return stay.status === 'checked_out' || stay.status === 'cancelled';
}

function openStayEdit(stayId) {
  const stay = allStays().find(s => s.id === stayId);
  const modal = document.getElementById('modal-stay-edit');
  const form = document.getElementById('stay-edit-form');
  if (!stay || !modal || !form) return;
  state.editStayId = stay.id;
  const locked = stayEditLocked(stay);
  form.reset();
  form.elements.guest.value = stay.guest;
  form.elements.phone.value = stay.phone;
  form.elements.checkIn.value = stay.checkIn;
  form.elements.checkOut.value = stay.checkOut;
  form.elements.pax.value = String(stay.pax);
  form.elements.note.value = stay.note;
  form.elements.checkIn.disabled = locked || stay.status === 'inhouse';
  form.elements.checkOut.disabled = locked;
  form.elements.pax.disabled = locked;
  form.elements.room.disabled = locked;
  document.getElementById('stay-edit-title').textContent = `${stayLabel(stay)} — düzenle`;
  document.getElementById('stay-edit-hint').textContent = locked
    ? 'Tamamlanan veya iptal edilen rezervasyonda yalnızca misafir bilgileri ve açıklama düzenlenebilir.'
    : stay.status === 'inhouse'
      ? 'Misafir odada: giriş tarihi değiştirilemez. Oda değişikliğinde eski oda temizliğe alınır.'
      : 'Tarih veya oda değişirse tutar yeniden hesaplanır.';
  refreshStayEditRooms();
  setError(document.getElementById('stay-edit-error'), '');
  updateStayEditQuote();
  openModal(modal);
  form.elements.guest.focus();
}

function refreshStayEditRooms() {
  const form = document.getElementById('stay-edit-form');
  const stay = allStays().find(s => s.id === state.editStayId);
  if (!form || !stay) return;
  const checkIn = form.elements.checkIn.value;
  const checkOut = form.elements.checkOut.value;
  const current = form.elements.room.value || stay.room;
  const stays = allStays();
  form.elements.room.innerHTML = roomOptionsHtml(current, {
    disabled: room => room.no !== stay.room && isISO(checkIn) && isISO(checkOut) && checkIn < checkOut
      && hasConflict(stays, room.no, checkIn, checkOut, stay.id),
    label: room => `Oda ${room.no} · ${room.max} kişilik · ${money(room.priceNight)} / gece`,
  });
  form.elements.room.value = current;
}

function updateStayEditQuote() {
  const form = document.getElementById('stay-edit-form');
  const box = document.getElementById('stay-edit-price');
  const stay = allStays().find(s => s.id === state.editStayId);
  if (!form || !box || !stay) return;
  const q = stayEditQuote(stay, form.elements.room.value, form.elements.checkIn.value, form.elements.checkOut.value);
  const paid = collectedAmount(stay);
  box.innerHTML = `<dl class="price-box__sum">
    <dt>${q.nights} gece × ${money(q.priceNight || 0)}</dt><dd>${money(q.subtotal != null ? q.subtotal : stay.total)}</dd>
    <dt>İndirim</dt><dd>${money(q.discount || 0)}</dd>
    <dt class="is-total">Genel toplam${q.changed ? ' (yeni)' : ''}</dt><dd class="is-total">${money(q.total)}</dd>
    <dt>Ödenen</dt><dd>${money(paid)}</dd>
    <dt>Kalan</dt><dd>${money(Math.max(0, q.total - paid))}</dd>
  </dl>`;
}

function saveStayEdit(form) {
  const errorNode = document.getElementById('stay-edit-error');
  const stay = allStays().find(s => s.id === state.editStayId);
  if (!stay) return setError(errorNode, 'Rezervasyon bulunamadı.');
  const guest = form.elements.guest.value.trim().replace(/\s+/g, ' ');
  const phone = form.elements.phone.value.trim();
  const note = form.elements.note.value.trim().replace(/\s+/g, ' ').slice(0, 300);
  if (guest.length < 2) return setError(errorNode, 'Misafir adını yazın.');
  const changes = [];
  if (guest !== stay.guest) changes.push(`misafir: ${guest}`);
  if (phone !== stay.phone) changes.push('telefon');
  if (note !== stay.note) changes.push('açıklama');
  if (stayEditLocked(stay)) {
    updateStay(stay.id, s => ({ ...s, guest, phone, note }));
  } else {
    const roomNo = form.elements.room.value;
    const checkIn = stay.status === 'inhouse' ? stay.checkIn : form.elements.checkIn.value;
    const checkOut = form.elements.checkOut.value;
    const pax = Number(form.elements.pax.value);
    const room = findRoom(roomNo);
    if (!room) return setError(errorNode, 'Oda seçin.');
    if (!isISO(checkIn) || !isISO(checkOut) || checkIn >= checkOut) return setError(errorNode, 'Çıkış, girişten sonra olmalı.');
    if (isUpcoming(stay) && checkIn !== stay.checkIn && checkIn < TODAY) return setError(errorNode, 'Rezervasyon geçmiş bir tarihe taşınamaz.');
    if (stay.status === 'inhouse' && checkOut < TODAY) return setError(errorNode, 'Çıkış tarihi bugünden önce olamaz.');
    if (!Number.isInteger(pax) || pax < 1 || pax > room.max) return setError(errorNode, `Oda ${room.no} en fazla ${room.max} misafir alır.`);
    if (hasConflict(allStays(), roomNo, checkIn, checkOut, stay.id)) return setError(errorNode, `Oda ${roomNo} bu tarihlerde başka bir rezervasyona ait.`);
    const q = stayEditQuote(stay, roomNo, checkIn, checkOut);
    const paid = collectedAmount(stay);
    if (q.changed && q.total < paid) return setError(errorNode, `Ödenen tutar (${money(paid)}) yeni toplamdan (${money(q.total)}) fazla olamaz.`);
    if (roomNo !== stay.room) changes.push(`oda ${stay.room} → ${roomNo}`);
    if (checkIn !== stay.checkIn || checkOut !== stay.checkOut) changes.push(`tarih ${formatDay(checkIn)}–${formatDay(checkOut)}`);
    if (pax !== stay.pax) changes.push(`kişi ${pax}`);
    if (q.changed) changes.push(`toplam ${money(q.total)}`);
    updateStay(stay.id, s => ({
      ...s,
      guest,
      phone,
      note,
      room: roomNo,
      checkIn,
      checkOut,
      pax,
      roomHistory: roomNo !== s.room ? [...s.roomHistory, { from: s.room, to: roomNo, at: nowISO(), reason: 'move' }] : s.roomHistory,
      ...(q.changed ? {
        priceNight: q.priceNight,
        nights: q.nights,
        subtotal: q.subtotal,
        discount: q.discount,
        total: q.total,
        paymentStatus: paymentStatusFrom(q.total, paid),
      } : {}),
    }));
    if (stay.status === 'inhouse' && roomNo !== stay.room) {
      saveRoom(stay.room, { status: 'cleaning' });
      saveRoom(roomNo, { status: 'occupied' });
    }
  }
  appendAudit('Rezervasyon güncellendi', `${stayLabel(stay)} · ${changes.join(', ') || 'değişiklik yok'}`);
  closeModal(document.getElementById('modal-stay-edit'));
  renderOperational();
  refreshStayDetail();
  toast('Rezervasyon güncellendi.');
}

function openRoomEditModal(roomNo) {
  if (userRole(state.user) !== 'yonetici') return;
  const form = document.getElementById('room-edit-form');
  const modal = document.getElementById('modal-room-edit');
  if (!form || !modal) return;
  const room = roomNo ? findRoom(roomNo) : null;
  form.reset();
  form.dataset.mode = room ? 'edit' : 'add';
  const nextNo = String(roomsCatalog().reduce((m, r) => Math.max(m, Number(r.no) || 0), 0) + 1);
  form.elements.no.value = room ? room.no : nextNo;
  form.elements.no.disabled = Boolean(room);
  form.elements.name.value = room ? room.name || '' : '';
  form.elements.max.value = String(room ? room.max : 2);
  form.elements.price.value = room && room.priceNight ? String(room.priceNight) : '';
  document.getElementById('room-edit-title').textContent = room ? `${roomDisplayLabel(room.no)} — düzenle` : 'Yeni oda';
  setError(document.getElementById('room-edit-error'), '');
  openModal(modal);
  (room ? form.elements.price : form.elements.no).focus();
}

function saveRoomEdit(form) {
  const errorNode = document.getElementById('room-edit-error');
  const isEdit = form.dataset.mode === 'edit';
  const no = String(form.elements.no.value || '').trim();
  const name = String(form.elements.name.value || '').trim().replace(/\s+/g, ' ');
  const max = Number(form.elements.max.value);
  const price = Math.round(Number(form.elements.price.value));
  if (!/^[0-9A-Za-zÇĞİÖŞÜçğıöşü-]{1,8}$/.test(no)) return setError(errorNode, 'Oda numarası 1–8 karakter olsun (harf, rakam veya -).');
  if (![1, 2, 3].includes(max)) return setError(errorNode, 'Kapasite seçin.');
  if (!Number.isFinite(price) || price <= 0) return setError(errorNode, 'Gecelik fiyatı girin.');
  const stays = allStays().filter(stay => stay.room === no && isActiveStay(stay));
  const maxPax = stays.reduce((m, stay) => Math.max(m, stay.pax), 0);
  if (max < maxPax) return setError(errorNode, `Bu odada ${maxPax} kişilik aktif rezervasyon var; kapasite ${maxPax} kişiden az olamaz.`);
  if (isEdit) {
    const room = findRoom(no);
    if (!room) return setError(errorNode, 'Oda bulunamadı.');
    saveRoomMeta(no, { name, max });
    if (room.max !== max) appendAudit('Oda kapasitesi', `Oda ${no}: ${room.max} → ${max} kişi`);
    setRoomPrice(no, price, 'manual');
    toast('Oda bilgileri kaydedildi.');
  } else {
    if (findRoom(no)) return setError(errorNode, 'Bu oda numarası zaten kayıtlı.');
    const registry = readRoomRegistry();
    if (registry) {
      registry.push({ no, legacyNo: '', name: name || CAPACITY_TYPES[max], max, priceNight: price, photoKey: '', blurb: '', floor: '', beds: 1, amenities: [], custom: true, createdAt: nowISO() });
      writeJSON(KEYS.roomRegistry, registry);
    } else {
      const custom = readJSON(KEYS.customRooms, []);
      const list = Array.isArray(custom) ? custom : [];
      list.push({ no, name: name || CAPACITY_TYPES[max], max, priceNight: price, createdAt: nowISO() });
      writeJSON(KEYS.customRooms, list);
    }
    saveRoomMeta(no, { priceNight: price, amenities: [] });
    appendAudit('Oda eklendi', `Oda ${no} · ${max} kişilik · ${money(price)}`);
    toast(`Oda ${no} eklendi.`);
  }
  closeModal(document.getElementById('modal-room-edit'));
  renderOperational();
  if (state.roomModalNo) renderRoomModal(state.roomModalNo);
}

function startOfWeek(iso) {
  const dow = (parseISO(iso).getDay() + 6) % 7;
  return addDays(iso, -dow);
}

function reportState() {
  if (!state.report) state.report = { key: 'month', from: '', to: '' };
  return state.report;
}

function reportRange() {
  const r = reportState();
  const today = parseISO(TODAY);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  if (r.key === 'today') return { from: TODAY, to: TODAY, label: `Bugün (${formatLong(TODAY)})` };
  if (r.key === 'week') {
    const from = startOfWeek(TODAY);
    return { from, to: addDays(from, 6), label: `Bu hafta (${formatDay(from)} – ${formatDay(addDays(from, 6))})` };
  }
  if (r.key === 'year') return { from: `${y}-01-01`, to: `${y}-12-31`, label: `${y} yılı` };
  if (r.key === 'custom' && isISO(r.from) && isISO(r.to) && r.from <= r.to) {
    return { from: r.from, to: r.to, label: `${formatLong(r.from)} – ${formatLong(r.to)}` };
  }
  const last = new Date(y, today.getMonth() + 1, 0).getDate();
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(last).padStart(2, '0')}`, label: formatMonth(y, today.getMonth()) };
}

function overlapNights(stay, from, to) {
  const end = addDays(to, 1);
  const s = stay.checkIn > from ? stay.checkIn : from;
  const e = stay.checkOut < end ? stay.checkOut : end;
  return s < e ? nightsBetween(s, e) : 0;
}

function nightlyRate(stay) {
  const n = stayNights(stay);
  return n ? (Number(stay.total) || 0) / n : 0;
}

function guestKey(stay) {
  const name = stay.guest.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const phone = (stay.phone || '').replace(/\D/g, '').slice(-10);
  return `${name}|${phone}`;
}

function sumBy(list, fn) {
  return list.reduce((sum, item) => sum + (Number(fn(item)) || 0), 0);
}

function collectedBetween(stays, from, to) {
  return sumBy(stays.flatMap(recordedPayments).filter(p => {
    const day = String(p.at).slice(0, 10);
    return day >= from && day <= to;
  }), p => p.amount);
}

function computeReport(data, range) {
  const { from, to } = range;
  const days = nightsBetween(from, to) + 1;
  const rooms = data.rooms;
  const inRange = data.stays.filter(s => s.checkIn <= to && s.checkOut > from);
  const live = inRange.filter(s => s.status !== 'cancelled');
  const roomNights = sumBy(live, s => overlapNights(s, from, to));
  const revenue = sumBy(live, s => nightlyRate(s) * overlapNights(s, from, to));
  const today = parseISO(TODAY);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const monthEnd = `${y}-${m}-${String(new Date(y, today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

  const series = [];
  if (days <= 62) {
    for (let i = 0; i < days; i += 1) {
      const day = addDays(from, i);
      series.push({ label: formatDay(day), value: collectedBetween(data.stays, day, day) });
    }
  } else {
    let cursor = parseISO(from);
    while (isoFromDate(cursor) <= to) {
      const mFrom = isoFromDate(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
      const mTo = isoFromDate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
      series.push({
        label: cap(cursor.toLocaleDateString('tr-TR', { month: 'short' }).replace(/\./g, '')),
        value: collectedBetween(data.stays, mFrom < from ? from : mFrom, mTo > to ? to : mTo),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  const roomRows = rooms.map(room => {
    const list = live.filter(s => s.room === room.no);
    const nights = sumBy(list, s => overlapNights(s, from, to));
    const rev = sumBy(list, s => nightlyRate(s) * overlapNights(s, from, to));
    return { room, stays: list.length, nights, occupancy: days ? nights / days : 0, revenue: rev, adr: nights ? rev / nights : 0 };
  });

  const allTime = new Map();
  data.stays.filter(s => s.status !== 'cancelled').forEach(s => allTime.set(guestKey(s), (allTime.get(guestKey(s)) || 0) + 1));
  const guestMap = new Map();
  live.forEach(s => {
    const key = guestKey(s);
    const entry = guestMap.get(key) || { name: s.guest, phone: s.phone, stays: 0, nights: 0 };
    entry.stays += 1;
    entry.nights += stayNights(s);
    guestMap.set(key, entry);
  });
  const guests = [...guestMap.entries()].map(([key, g]) => ({ ...g, allTime: allTime.get(key) || 0 }));

  const statusCount = status => inRange.filter(s => s.status === status).length;
  return {
    range,
    days,
    general: {
      reservations: live.length,
      guests: sumBy(live, s => s.pax),
      roomNights,
      occupancy: rooms.length && days ? roomNights / (rooms.length * days) : 0,
      adr: roomNights ? revenue / roomNights : 0,
      cancelled: statusCount('cancelled'),
    },
    finance: {
      booked: sumBy(live, s => s.total),
      accrued: revenue,
      collected: collectedBetween(data.stays, from, to),
      undated: sumBy(live.flatMap(paymentEntries).filter(p => !p.at), p => p.amount),
      pendingCount: live.filter(s => remainingAmount(s) > 0).length,
      remaining: sumBy(live, remainingAmount),
      daily: collectedBetween(data.stays, TODAY, TODAY),
      monthly: collectedBetween(data.stays, `${y}-${m}-01`, monthEnd),
      yearly: collectedBetween(data.stays, `${y}-01-01`, `${y}-12-31`),
      series,
    },
    rooms: roomRows,
    guests: {
      total: sumBy(live, s => s.pax),
      unique: guests.length,
      repeat: guests.filter(g => g.allTime >= 2).length,
      top: [...guests].sort((a, b) => b.nights - a.nights || b.stays - a.stays).slice(0, 5),
      avgStay: live.length ? sumBy(live, stayNights) / live.length : 0,
    },
    statuses: STAY_STATUSES.map(status => ({ status, label: STAY_LABEL[status], count: statusCount(status) })),
  };
}

function pct(value) {
  return `%${Math.round(value * 100)}`;
}

function decimal(value) {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function hbarRows(rows) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return rows.map(r => `<div class="hbar">
    <span class="hbar__label">${esc(r.label)}</span>
    <span class="hbar__track"><span style="width:${Math.round((r.value / max) * 100)}%"></span></span>
    <span class="hbar__value">${esc(r.display)}</span>
  </div>`).join('');
}

function vbarChart(series) {
  const max = Math.max(1, ...series.map(s => s.value));
  if (!series.some(s => s.value > 0)) return emptyCopy('Bu dönemde tarihli tahsilat yok.');
  return `<div class="vbars" style="--n:${series.length}">${series.map(s => `
    <div class="vbar" title="${esc(`${s.label}: ${money(s.value)}`)}">
      <span class="vbar__fill" style="height:${Math.round((s.value / max) * 100)}%"></span>
      <span class="vbar__label">${esc(s.label)}</span>
    </div>`).join('')}</div>`;
}

function reportCard(label, value, hint) {
  return `<div class="rep-card"><span>${esc(label)}</span><strong>${esc(value)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
}

function renderReports(data) {
  if (!userCan(state.user, 'reports')) return;
  const host = document.getElementById('report-body');
  if (!host) return;
  const r = reportState();
  document.querySelectorAll('[data-report-range]').forEach(btn => {
    const on = btn.dataset.reportRange === r.key;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const customBox = document.getElementById('report-custom');
  if (customBox) customBox.hidden = r.key !== 'custom';
  const range = reportRange();
  const rep = computeReport(data, range);
  state.lastReport = rep;
  const label = document.getElementById('report-range-label');
  if (label) label.textContent = `${range.label} · ${rep.days} gün · ${data.rooms.length} oda`;
  const g = rep.general;
  const f = rep.finance;
  const topNights = [...rep.rooms].sort((a, b) => b.nights - a.nights)[0];
  const topRevenue = [...rep.rooms].sort((a, b) => b.revenue - a.revenue)[0];
  const roomTable = ROOM_GROUPS.map(group => {
    const list = rep.rooms.filter(row => row.room.max === group.max);
    if (!list.length) return '';
    return `<tr class="group-row"><th colspan="6">${esc(group.title)}</th></tr>${list.map(row => `<tr>
      <td>Oda ${esc(row.room.no)}</td>
      <td class="num">${row.stays}</td>
      <td class="num">${row.nights}</td>
      <td class="num">${pct(row.occupancy)}</td>
      <td class="num">${money(row.revenue)}</td>
      <td class="num">${row.nights ? money(row.adr) : '—'}</td>
    </tr>`).join('')}`;
  }).join('');
  host.innerHTML = `
    <section class="rep-section">
      <h2>Genel otel raporu</h2>
      <div class="rep-grid">
        ${reportCard('Toplam rezervasyon', String(g.reservations), 'iptaller hariç')}
        ${reportCard('Toplam misafir', String(g.guests), 'kişi sayısı toplamı')}
        ${reportCard('Konaklama gecesi', String(g.roomNights), 'oda-gece')}
        ${reportCard('Oda doluluk oranı', pct(g.occupancy), 'rezerve geceler dahil')}
        ${reportCard('Ortalama gecelik oda geliri', g.roomNights ? money(g.adr) : '—', 'gece başına rezervasyon tutarı')}
        ${reportCard('İptal edilen', String(g.cancelled), 'rezervasyon')}
      </div>
    </section>
    <section class="rep-section">
      <h2>Finansal rapor</h2>
      <p class="room-meta">Rezervasyon tutarı ile gerçekleşen tahsilat ayrı gösterilir. Tahsilat, ödemenin kaydedildiği tarihe göre sayılır.</p>
      <div class="rep-grid">
        ${reportCard('Toplam rezervasyon tutarı', money(f.booked), 'dönemle çakışan rezervasyonlar')}
        ${reportCard('Dönem gecelerinin tutarı', money(f.accrued), 'konaklama gecelerine düşen pay')}
        ${reportCard('Tahsil edilen ödeme', money(f.collected), 'dönem içinde alınan')}
        ${reportCard('Bekleyen ödemeler', String(f.pendingCount), 'bakiyesi olan rezervasyon')}
        ${reportCard('Kalan bakiyeler', money(f.remaining), 'tahsil edilmemiş tutar')}
        ${reportCard('Günlük gelir', money(f.daily), 'bugünkü tahsilat')}
        ${reportCard('Aylık gelir', money(f.monthly), 'bu ayki tahsilat')}
        ${reportCard('Yıllık gelir', money(f.yearly), 'bu yılki tahsilat')}
      </div>
      ${f.undated ? `<p class="room-meta">Tarihi kayıtlı olmayan eski tahsilat: ${money(f.undated)} (dönem tahsilatına eklenmedi).</p>` : ''}
      <h3>Tahsilat grafiği</h3>
      ${vbarChart(f.series)}
    </section>
    <section class="rep-section">
      <h2>Oda performans raporu</h2>
      <p class="room-meta">En çok kullanılan: ${topNights && topNights.nights ? `Oda ${esc(topNights.room.no)} (${topNights.nights} gece)` : '—'} · En çok gelir: ${topRevenue && topRevenue.revenue ? `Oda ${esc(topRevenue.room.no)} (${money(topRevenue.revenue)})` : '—'}</p>
      <div class="rep-two">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Oda</th><th class="num">Rezervasyon</th><th class="num">Gece</th><th class="num">Doluluk</th><th class="num">Gelir</th><th class="num">Ort. gecelik</th></tr></thead>
          <tbody>${roomTable}</tbody>
        </table></div>
        <div class="rep-chart"><h3>Oda bazında doluluk</h3>${hbarRows(rep.rooms.map(row => ({ label: `Oda ${row.room.no}`, value: row.occupancy, display: pct(row.occupancy) })))}</div>
      </div>
    </section>
    <section class="rep-section">
      <h2>Misafir raporu</h2>
      <div class="rep-grid">
        ${reportCard('Toplam misafir', String(rep.guests.total), 'kişi')}
        ${reportCard('Farklı misafir', String(rep.guests.unique), 'ad ve telefona göre')}
        ${reportCard('Tekrar gelen misafir', String(rep.guests.repeat), 'en az 2 konaklama')}
        ${reportCard('Ortalama konaklama süresi', `${decimal(rep.guests.avgStay)} gece`, 'rezervasyon başına')}
      </div>
      <h3>En çok konaklayan misafirler</h3>
      ${rep.guests.top.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>Misafir</th><th>Telefon</th><th class="num">Rezervasyon</th><th class="num">Gece</th><th class="num">Toplam konaklama</th></tr></thead>
        <tbody>${rep.guests.top.map(gst => `<tr><td>${esc(gst.name)}</td><td>${esc(gst.phone || '—')}</td><td class="num">${gst.stays}</td><td class="num">${gst.nights}</td><td class="num">${gst.allTime}</td></tr>`).join('')}</tbody>
      </table></div>` : emptyCopy('Bu dönemde misafir kaydı yok.')}
    </section>
    <section class="rep-section">
      <h2>Rezervasyon raporu</h2>
      <div class="rep-two">
        <div class="rep-grid rep-grid--tight">
          ${rep.statuses.map(s => reportCard(s.label, String(s.count), '')).join('')}
        </div>
        <div class="rep-chart">${hbarRows(rep.statuses.map(s => ({ label: s.label, value: s.count, display: String(s.count) })))}</div>
      </div>
    </section>`;
}

function csvCell(value) {
  const text = String(value == null ? '' : value);
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function reportCsv(rep) {
  const rows = [];
  const num = v => (Math.round(v * 100) / 100).toLocaleString('tr-TR', { useGrouping: false });
  rows.push(['ATA LİFE GUEST HOUSE — Rapor'], ['Dönem', rep.range.label], ['Para birimi', readSettings().currency], []);
  rows.push(['GENEL OTEL RAPORU']);
  rows.push(['Toplam rezervasyon', rep.general.reservations], ['Toplam misafir', rep.general.guests], ['Konaklama gecesi', rep.general.roomNights]);
  rows.push(['Doluluk oranı (%)', num(rep.general.occupancy * 100)], ['Ortalama gecelik oda geliri', num(rep.general.adr)], ['İptal edilen', rep.general.cancelled], []);
  rows.push(['FİNANSAL RAPOR']);
  rows.push(['Toplam rezervasyon tutarı', num(rep.finance.booked)], ['Dönem gecelerinin tutarı', num(rep.finance.accrued)], ['Tahsil edilen ödeme', num(rep.finance.collected)]);
  rows.push(['Bekleyen ödeme (adet)', rep.finance.pendingCount], ['Kalan bakiyeler', num(rep.finance.remaining)]);
  rows.push(['Günlük gelir', num(rep.finance.daily)], ['Aylık gelir', num(rep.finance.monthly)], ['Yıllık gelir', num(rep.finance.yearly)]);
  rows.push(['Tarihsiz eski tahsilat', num(rep.finance.undated)], []);
  rows.push(['Tahsilat', 'Tutar'], ...rep.finance.series.map(s => [s.label, num(s.value)]), []);
  rows.push(['ODA PERFORMANS RAPORU'], ['Kategori', 'Oda', 'Rezervasyon', 'Gece', 'Doluluk (%)', 'Gelir', 'Ortalama gecelik']);
  rep.rooms.forEach(row => rows.push([CAPACITY_TYPES[row.room.max], row.room.no, row.stays, row.nights, num(row.occupancy * 100), num(row.revenue), num(row.adr)]));
  rows.push([], ['MİSAFİR RAPORU'], ['Toplam misafir', rep.guests.total], ['Farklı misafir', rep.guests.unique], ['Tekrar gelen', rep.guests.repeat], ['Ortalama konaklama (gece)', num(rep.guests.avgStay)]);
  rows.push(['Misafir', 'Telefon', 'Rezervasyon', 'Gece']);
  rep.guests.top.forEach(gst => rows.push([gst.name, gst.phone, gst.stays, gst.nights]));
  rows.push([], ['REZERVASYON RAPORU']);
  rep.statuses.forEach(s => rows.push([s.label, s.count]));
  return `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}`;
}

async function saveTextFile(name, content, mime) {
  if (window.atalifeDesktop && typeof window.atalifeDesktop.saveFile === 'function') {
    return window.atalifeDesktop.saveFile(name, content);
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true };
}

function reportFileBase() {
  const range = state.lastReport ? state.lastReport.range : reportRange();
  return `ata-life-rapor-${range.from}_${range.to}`;
}

async function exportReportCsv() {
  if (!state.lastReport) renderReports(snapshot());
  const result = await saveTextFile(`${reportFileBase()}.csv`, reportCsv(state.lastReport), 'text/csv;charset=utf-8');
  if (result && result.ok) {
    appendAudit('Rapor dışa aktarıldı', `Excel (CSV) · ${state.lastReport.range.label}`);
    toast('Rapor Excel (CSV) olarak kaydedildi.');
  }
}

async function exportReportPdf() {
  if (!state.lastReport) renderReports(snapshot());
  if (window.atalifeDesktop && typeof window.atalifeDesktop.savePdf === 'function') {
    const result = await window.atalifeDesktop.savePdf(`${reportFileBase()}.pdf`);
    if (result && result.ok) {
      appendAudit('Rapor dışa aktarıldı', `PDF · ${state.lastReport.range.label}`);
      toast('Rapor PDF olarak kaydedildi.');
    }
    return;
  }
  appendAudit('Rapor dışa aktarıldı', `PDF (yazdır) · ${state.lastReport.range.label}`);
  window.print();
}

async function exportBackup() {
  const payload = JSON.stringify({ app: 'ATA LİFE GUEST HOUSE', exportedAt: nowISO(), data: snapshotStorage() }, null, 1);
  const result = await saveTextFile(`ata-life-yedek-${TODAY}.json`, payload, 'application/json');
  if (result && result.ok) {
    appendAudit('Veri yedeği alındı', `ata-life-yedek-${TODAY}.json`);
    toast('Yedek dosyası kaydedildi.');
  }
}

function renderStaff() {
  if (!userCan(state.user, 'staff')) {
    els.staffList.innerHTML = '';
    return;
  }
  const users = readJSON(KEYS.users, []);
  const visible = (Array.isArray(users) ? users : []).filter(user => matches(pageQuery('staff'), [user.name, user.username, ROLES[user.role]]));
  const activeCount = visible.filter(user => user.active !== false).length;
  els.staffLede.textContent = `${visible.length} hesap · ${activeCount} aktif. Pasif hesaplar giriş yapamaz; geçmiş kayıtları silinmez.`;
  els.staffList.innerHTML = visible.length ? visible.map(user => {
    const inactive = user.active === false;
    const isSelf = user.id === state.user.id;
    const toggleLabel = inactive ? 'Aktifleştir' : 'Pasifleştir';
    return `
    <article class="staff-card${inactive ? ' is-inactive' : ''}${isSelf ? ' is-self' : ''}">
      ${avatarHtml(user.name, user.photo, 'avatar')}
      <span class="who">
        <strong>${esc(user.name)}</strong>
        <span class="room-meta">${esc(user.username)} · ${esc(ROLES[user.role] || 'Personel')}${inactive ? ' · pasif' : ''}</span>
      </span>
      <div class="staff-card__actions">
        <button type="button" class="btn-ghost btn-sm" data-edit-staff="${esc(user.id)}">Düzenle</button>
        <button type="button" class="btn-ghost btn-sm" data-staff-toggle="${esc(user.id)}" data-next-active="${inactive ? '1' : '0'}">${toggleLabel}</button>
      </div>
    </article>`;
  }).join('') : emptyCopy('Bu isimde bir kişi yok.');
}

function renderGalleryHtml(room) {
  const items = resolveGallery(room);
  if (!items.length) return '';
  const idx = Math.min(Math.max(state.galleryIndex, 0), items.length - 1);
  const current = items[idx];
  const thumbs = items.map((item, i) => `
    <button type="button" class="room-gallery__thumb${i === idx ? ' is-on' : ''}" data-gallery-index="${i}" aria-label="${esc(item.label)}">
      <img src="${esc(item.src)}" alt="" loading="lazy" onerror="this.parentElement.remove()">
    </button>
  `).join('');
  return `
    <section class="room-gallery" aria-label="Oda fotoğrafları">
      <p class="room-meta">Temsili yapay zekâ görselleri — gerçek oda fotoğrafı olmayabilir.</p>
      <button type="button" class="room-gallery__main" data-gallery-zoom="${esc(current.src)}" aria-label="Büyük görüntüle">
        <img src="${esc(current.src)}" alt="${esc(current.label)}" id="gallery-main-img" onerror="this.src='${esc(items[0].src)}';this.alt='Görsel yüklenemedi'">
      </button>
      <p class="room-meta" id="gallery-caption">${esc(current.label)}</p>
      <div class="room-gallery__thumbs">${thumbs}</div>
    </section>`;
}

function renderRoomModal(roomNo) {
  const data = snapshot();
  const room = data.rooms.find(r => r.no === roomNo);
  if (!room) return;
  state.roomModalNo = roomNo;
  if (state.galleryIndex >= resolveGallery(room).length) state.galleryIndex = 0;
  const meta = readRoomMeta()[room.no] || {};
  const sizeLine = meta.sizeSqm ? `${meta.sizeSqm} m²` : '—';
  const switches = ROOM_STATUSES.map(status => `
    <button type="button" class="switch${room.status === status ? ' is-on' : ''}" data-room-status="${status}" aria-pressed="${room.status === status ? 'true' : 'false'}">${STATUS_LABEL[status]}</button>
  `).join('');
  const saved = roomSaved(roomNo);
  const cleanInfo = [
    saved.statusChangedAt ? `<p class="room-meta">Son durum değişikliği: ${esc(saved.statusChangedBy || '—')} · ${formatDateTime(saved.statusChangedAt)}</p>` : '',
    saved.lastCleaning ? `<p class="room-meta">Son temizlik: ${esc(saved.lastCleaning.byName || '—')} · ${formatDateTime(saved.lastCleaning.at)}</p>` : '',
    room.occupant ? `<p class="room-meta">Konaklayan: ${esc(room.occupant.guest)} · çıkış ${formatDay(room.occupant.checkOut)}</p>` : '',
  ].join('');
  const notesHtml = room.notes.length
    ? room.notes.map(n => `
      <li class="note-item${n.completedAt ? ' is-done' : ''}${n.urgent && !n.completedAt ? ' is-urgent' : ''}">
        <p>${esc(n.text)}</p>
        <span class="room-meta">${esc(n.createdByName)} · ${formatDateTime(n.createdAt)}${n.urgent ? ' · acil' : ''}</span>
        <div class="note-item__actions">
          <button type="button" class="btn-ghost btn-sm" data-room-note-open="${esc(room.no)}" data-note-id="${esc(n.id)}">Düzenle</button>
          ${!n.completedAt ? `<button type="button" class="btn-ghost btn-sm" data-room-note-complete="${esc(room.no)}" data-note-id="${esc(n.id)}">Tamamlandı</button>` : `<span class="room-meta">Tamamlandı · ${formatDateTime(n.completedAt)}</span>`}
          <button type="button" class="btn-ghost btn-sm btn-danger" data-room-note-delete="${esc(room.no)}" data-note-id="${esc(n.id)}">Sil</button>
        </div>
      </li>
    `).join('')
    : '<li class="note-item is-empty"><span class="room-meta">Henüz not yok.</span></li>';
  els.roomModalBody.innerHTML = `
    <h3 id="room-modal-title">${esc(roomDisplayLabel(room.no))}${room.name ? ` · ${esc(room.name)}` : ''}</h3>
    ${renderGalleryHtml(room)}
    <div class="status-switch" role="group" aria-label="Oda durumu">${switches}</div>
    <section class="note-section">
      <header class="note-section__head">
        <h4>Oda notları ${room.openNotes ? `<span class="note-badge">${room.openNotes}</span>` : ''}</h4>
        <button type="button" class="btn-ghost btn-sm" data-room-note-add="${esc(room.no)}">+ Not ekle</button>
      </header>
      <ul class="note-list">${notesHtml}</ul>
    </section>
    <section class="panel room-info" style="margin-top:12px;padding:16px 18px">
      <header class="room-info__head">
        <h4>Oda bilgileri</h4>
        ${userRole(state.user) === 'yonetici' ? `<button type="button" class="btn-line btn-line--sm" data-room-edit="${esc(room.no)}">Bilgileri ve fiyatı düzenle</button>` : ''}
      </header>
      <ul class="settings-meta">
        <li>Kategori: <strong>${esc(room.type)}</strong></li>
        <li>Kapasite: <strong>${room.max} kişi</strong></li>
        <li>Yatak düzeni: <strong>${esc(bedLayoutText(room))}</strong></li>
        <li>Banyo: <strong>${esc(bathText(room))}</strong></li>
        <li>Oda büyüklüğü: <strong>${esc(sizeLine)}</strong></li>
        <li>Gecelik fiyat: <strong>${room.priceNight ? money(room.priceNight) : 'Girilmedi'}</strong></li>
        <li>Durum: ${statusBadge(room.status)}</li>
      </ul>
      ${room.blurb ? `<p class="lede" style="margin-top:12px">${esc(room.blurb)}</p>` : ''}
      ${cleanInfo}
    </section>
    <section>
      <h4>Olanaklar</h4>
      ${userRole(state.user) === 'yonetici' ? amenityEditorHtml(room) : renderAmenitiesHtml(room)}
    </section>
  `;
}

function amenityEditorHtml(room) {
  const active = roomAmenityKeys(room);
  const groups = AMENITY_GROUPS.map(group => {
    const items = group.items.map(item => `
      <label class="check-row">
        <input type="checkbox" name="amenity" value="${esc(item.key)}"${active.has(item.key) ? ' checked' : ''}>
        <span>${esc(item.label)}</span>
      </label>
    `).join('');
    return `<fieldset class="amenity-edit"><legend>${esc(group.title)}</legend>${items}</fieldset>`;
  }).join('');
  return `<form id="amenity-form" data-room="${esc(room.no)}">${groups}<button type="submit" class="btn-line">Olanakları kaydet</button></form>`;
}

function renderOperational() {
  const data = snapshot();
  if (userCan(state.user, 'dashboard')) renderDashboard(data);
  if (userCan(state.user, 'rooms')) renderRooms(data);
  if (userCan(state.user, 'reservations')) renderReservations(data);
  if (userCan(state.user, 'calendar')) renderCalendar(data);
  if (userCan(state.user, 'audit')) renderAudit();
  if (userCan(state.user, 'finance')) renderFinance(data);
  if (userCan(state.user, 'pricing')) renderPricing(data);
  if (userCan(state.user, 'settings')) renderSettings();
  if (userCan(state.user, 'reports')) renderReports(data);
  if (state.roomModalNo && els.modalRoom.classList.contains('is-open')) renderRoomModal(state.roomModalNo);
}

function applyChrome() {
  state.page = guardPage(state.page);
  document.querySelectorAll('.page').forEach(section => {
    const pageId = section.id.replace('page-', '');
    const allowed = userCan(state.user, pageId);
    const on = allowed && section.id === `page-${state.page}`;
    section.classList.toggle('is-active', on);
    section.setAttribute('aria-hidden', on ? 'false' : 'true');
  });
  document.querySelectorAll('.nav-item').forEach(button => {
    const on = button.dataset.page === state.page;
    button.classList.toggle('is-active', on);
    if (on) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const staffPage = state.page === 'staff';
  const showHead = state.page === 'dashboard' || state.page === 'rooms';
  if (els.pageHead) els.pageHead.hidden = !showHead;
  els.btnStay.classList.toggle('is-hidden', staffPage || showHead);
  els.btnStaff.classList.toggle('is-hidden', !staffPage);
  const label = staffPage
    ? 'Personel ara'
    : state.page === 'reservations'
      ? 'Misafir, telefon, oda veya rezervasyon no ara'
      : 'Misafir veya oda ara';
  els.search.placeholder = label;
  els.search.setAttribute('aria-label', label);
  document.title = `${PAGE_TITLES[state.page] || 'Ana Sayfa'} · ATA LİFE GUEST HOUSE`;
  if (els.topbar) els.topbar.classList.toggle('is-hidden', state.page === 'dashboard');
  document.querySelector('.content')?.classList.toggle('content--wide', state.page === 'dashboard');
  const roomCount = document.getElementById('settings-room-count');
  if (roomCount) roomCount.textContent = String(roomsCatalog().length);
  try { sessionStorage.setItem(PAGE_KEY, state.page); } catch (err) { /* yoksay */ }
}

function performCheckIn(stayId) {
  const stays = readStays();
  const idx = stays.findIndex(s => s.id === stayId);
  if (idx < 0) return;
  const stay = stays[idx];
  if (!isUpcoming(stay)) return;
  if (stay.checkIn > TODAY) {
    toast('Giriş tarihi henüz gelmedi.');
    return;
  }
  if (hasConflict(stays, stay.room, stay.checkIn, stay.checkOut, stay.id)) {
    toast('Oda çakışması var.');
    return;
  }
  const other = stays.find(s => s.id !== stay.id && s.room === stay.room && s.status === 'inhouse');
  if (other) {
    toast(`Oda ${stay.room} şu anda ${other.guest} adına dolu. Önce onun çıkışını yapın.`);
    return;
  }
  const roomStatus = roomSaved(stay.room).status;
  if (roomStatus === 'cleaning' && !window.confirm(`Oda ${stay.room} temizlikte görünüyor. Yine de giriş yapılsın mı?`)) return;
  stays[idx] = {
    ...stay,
    status: 'inhouse',
    confirmedAt: stay.confirmedAt || nowISO(),
    actualCheckIn: nowISO(),
  };
  saveStays(stays);
  saveRoom(stay.room, { status: 'occupied' });
  appendAudit('Check-in', `${stayLabel(stay)} · ${stay.guest} · Oda ${stay.room}`);
  renderOperational();
  refreshStayDetail();
  toast(`${stay.guest} odaya alındı. Oda ${stay.room} dolu.`);
}

function performCheckOut(stayId) {
  const stays = readStays();
  const idx = stays.findIndex(s => s.id === stayId);
  if (idx < 0) return;
  const stay = stays[idx];
  if (stay.status !== 'inhouse') return;
  const remaining = remainingAmount(stay);
  if (remaining > 0 && !window.confirm(`${stay.guest} için ${money(remaining)} kalan bakiye var. Yine de çıkış yapılsın mı?`)) return;
  stays[idx] = {
    ...stay,
    status: 'checked_out',
    actualCheckOut: nowISO(),
  };
  saveStays(stays);
  saveRoom(stay.room, { status: 'cleaning' });
  appendAudit('Check-out', `${stayLabel(stay)} · ${stay.guest} · Oda ${stay.room}${remaining > 0 ? ` · kalan ${money(remaining)}` : ''}`);
  renderOperational();
  refreshStayDetail();
  toast(`${stay.guest} çıkış yaptı. Oda ${stay.room} temizlikte.`);
}

function cancelStay(stayId) {
  const stays = readStays();
  const idx = stays.findIndex(s => s.id === stayId);
  if (idx < 0) return;
  const stay = stays[idx];
  if (!isUpcoming(stay)) return;
  stays[idx] = { ...stay, status: 'cancelled', cancelledAt: nowISO() };
  saveStays(stays);
  appendAudit('Rezervasyon iptali', `${stayLabel(stay)} · ${stay.guest} · Oda ${stay.room} · ${formatDay(stay.checkIn)}–${formatDay(stay.checkOut)}`);
  renderOperational();
  refreshStayDetail();
  toast('Rezervasyon iptal edildi; oda bu tarihler için yeniden müsait.');
}

let toastTimer = 0;
let returnFocus = null;

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('is-on'), 3200);
}

function setError(node, message) {
  node.textContent = message || '';
  node.hidden = !message;
}

function openModal(modal) {
  returnFocus = document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('modal-open');
}

function closeModal(modal) {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  if (modal === els.modalRoom) state.roomModalNo = null;
  if (modal === els.modalAudit) state.auditEditId = null;
  if (!document.querySelector('.modal.is-open')) document.documentElement.classList.remove('modal-open');
  if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
}

function refreshStayRooms() {
  const checkIn = stayForm.elements.checkIn.value;
  const checkOut = stayForm.elements.checkOut.value;
  const previous = stayForm.elements.room.value;
  const free = availableRooms(allStays(), checkIn, checkOut);
  const select = stayForm.elements.room;
  if (!free.length) {
    select.innerHTML = '<option value="">Uygun oda yok</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = ROOM_GROUPS.map(group => {
    const list = free.filter(room => room.max === group.max);
    if (!list.length) return '';
    const options = list.map(room => {
      const price = room.priceNight ? `${money(room.priceNight)} / gece` : 'fiyat yok';
      return `<option value="${esc(room.no)}">Oda ${esc(room.no)} · ${room.max} kişilik · ${esc(price)}</option>`;
    }).join('');
    return `<optgroup label="${esc(group.title)}">${options}</optgroup>`;
  }).join('');
  if (free.some(room => room.no === previous)) select.value = previous;
  clampStayPax();
}

function clampStayPax() {
  const room = findRoom(stayForm.elements.room.value);
  const max = room ? room.max : 3;
  const input = stayForm.elements.pax;
  input.max = String(max);
  const current = Number(input.value);
  if (!Number.isInteger(current) || current > max) input.value = String(max);
  if (Number(input.value) < 1) input.value = '1';
  const hint = document.getElementById('stay-pax-hint');
  if (hint) hint.textContent = room ? `Bu oda en fazla ${room.max} kişi alır.` : '';
}

function stayFormQuote() {
  const f = stayForm.elements;
  const isAdmin = userRole(state.user) === 'yonetici';
  const base = quoteStay({
    roomNo: f.room.disabled ? '' : f.room.value,
    checkIn: f.checkIn.value,
    checkOut: f.checkOut.value,
    discount: isAdmin ? f.discount.value : 0,
    paid: 0,
  });
  const mode = f.payment.value;
  const paidRaw = mode === 'paid' ? base.total : mode === 'partial' ? Number(f.paid.value) || 0 : 0;
  return quoteStay({
    roomNo: f.room.disabled ? '' : f.room.value,
    checkIn: f.checkIn.value,
    checkOut: f.checkOut.value,
    discount: isAdmin ? f.discount.value : 0,
    paid: paidRaw,
  });
}

function updateStayQuote() {
  const f = stayForm.elements;
  const mode = f.payment.value;
  f.paid.disabled = mode !== 'partial';
  const q = stayFormQuote();
  if (mode === 'paid') f.paid.value = String(q.total);
  if (mode === 'unpaid') f.paid.value = '0';
  const box = document.getElementById('stay-price');
  if (!box) return;
  if (!q.room || !q.nights) {
    box.innerHTML = `<p class="price-box__empty">${q.room ? 'Geçerli giriş ve çıkış tarihi seçin.' : 'Fiyat için oda ve tarih seçin.'}</p>`;
    return;
  }
  box.innerHTML = `
    <dl class="price-box__facts">
      <dt>Oda</dt><dd>${esc(roomDisplayLabel(q.room.no))} · ${esc(q.room.type)}</dd>
      <dt>Gecelik fiyat</dt><dd>${money(q.priceNight)}</dd>
      <dt>Giriş</dt><dd>${esc(formatLong(f.checkIn.value))}</dd>
      <dt>Çıkış</dt><dd>${esc(formatLong(f.checkOut.value))}</dd>
      <dt>Konaklama</dt><dd>${q.nights} gece</dd>
    </dl>
    <dl class="price-box__sum">
      <dt>${q.nights} gece × ${money(q.priceNight)}</dt><dd>${money(q.subtotal)}</dd>
      <dt>İndirim</dt><dd>${q.discount ? `− ${money(q.discount)}` : money(0)}</dd>
      <dt class="is-total">Genel toplam</dt><dd class="is-total">${money(q.total)}</dd>
      <dt>Ödenen</dt><dd>${money(q.paid)}</dd>
      <dt>Kalan</dt><dd>${money(q.remaining)}</dd>
    </dl>
    ${q.priceNight ? '' : '<p class="form-error">Bu odanın gecelik fiyatı girilmemiş. Yönetici oda detayından fiyat girmeli.</p>'}`;
}

function openStayModal() {
  stayForm.reset();
  stayForm.elements.checkIn.value = TODAY;
  stayForm.elements.checkOut.value = addDays(TODAY, 1);
  stayForm.elements.pax.value = '1';
  stayForm.elements.status.value = 'expected';
  stayForm.elements.payment.value = 'unpaid';
  stayForm.elements.paid.value = '0';
  stayForm.elements.discount.value = '0';
  const discountWrap = document.getElementById('stay-discount-wrap');
  if (discountWrap) discountWrap.hidden = userRole(state.user) !== 'yonetici';
  setError(els.stayError, '');
  refreshStayRooms();
  updateStayQuote();
  openModal(els.modalStay);
  stayForm.elements.guest.focus();
}

function setStaffModalMode(mode) {
  const isEdit = mode === 'edit';
  const title = document.getElementById('staff-title');
  const lede = document.getElementById('staff-lede-modal');
  const hint = document.getElementById('staff-password-hint');
  const submit = staffForm.querySelector('[type="submit"]');
  if (title) title.textContent = isEdit ? 'Personeli düzenle' : 'Yeni personel';
  if (lede) lede.textContent = isEdit
    ? 'Ad, rol ve erişim durumunu güncelleyin. Şifreyi yalnızca değiştirmek istiyorsanız doldurun.'
    : 'Bu kişi kendi kullanıcı adı ve şifresiyle giriş yapar.';
  if (hint) hint.hidden = !isEdit;
  if (submit) submit.textContent = isEdit ? 'Değişiklikleri Kaydet' : 'Kaydet';
  staffForm.elements.password.placeholder = isEdit ? 'Değiştirmek için yeni şifre' : 'En az 4 karakter';
  staffForm.elements.password.required = !isEdit;
}

function refreshStaffPhotoPreview() {
  const preview = document.getElementById('staff-photo-preview');
  const name = staffForm && staffForm.elements.fullName ? staffForm.elements.fullName.value : '';
  paintPhotoPreview(preview, name || '?', state.staffPhoto);
}

async function applyPhotoFile(input, assign) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  try {
    assign(await compressProfilePhoto(file));
  } catch (err) {
    toast(err && err.message === 'size'
      ? 'Fotoğraf 6 MB’dan küçük olmalı.'
      : 'Bu dosya profil fotoğrafı olarak kullanılamadı.');
  }
}

function applyUserPhoto(user, photo) {
  const next = { ...user };
  const src = safePhoto(photo);
  if (src) next.photo = src;
  else delete next.photo;
  return next;
}

function openProfileModal() {
  if (!state.user || !els.modalProfile) return;
  state.profilePhoto = safePhoto(state.user.photo);
  paintPhotoPreview(document.getElementById('profile-photo-preview'), state.user.name, state.profilePhoto);
  closeAccountMenu();
  openModal(els.modalProfile);
}

function saveOwnProfilePhoto() {
  if (!state.user) return;
  const users = readUsersList();
  const existing = findUserById(users, state.user.id);
  if (!existing) return toast('Hesap bulunamadı.');
  const updated = applyUserPhoto(existing, state.profilePhoto);
  const next = users.map(user => (user.id === updated.id ? updated : user));
  saveUsers(next);
  state.user = updated;
  rememberUser(updated);
  closeModal(els.modalProfile);
  renderSession();
  renderDashboard(snapshot());
  renderStaff();
  toast(safePhoto(updated.photo) ? 'Profil fotoğrafı kaydedildi.' : 'Profil fotoğrafı kaldırıldı.');
}

function openStaffModal(userId) {
  if (!userCan(state.user, 'staff')) return;
  staffForm.reset();
  setError(els.staffError, '');
  if (userId) {
    const user = findUserById(readUsersList(), userId);
    if (!user) return toast('Personel bulunamadı.');
    state.staffEditId = user.id;
    state.staffPhoto = safePhoto(user.photo);
    staffForm.elements.userId.value = user.id;
    staffForm.elements.fullName.value = user.name;
    staffForm.elements.username.value = user.username;
    staffForm.elements.role.value = user.role === 'yonetici' ? 'yonetici' : 'personel';
    staffForm.elements.active.checked = user.active !== false;
    setStaffModalMode('edit');
  } else {
    state.staffEditId = null;
    state.staffPhoto = '';
    staffForm.elements.userId.value = '';
    staffForm.elements.active.checked = true;
    setStaffModalMode('create');
  }
  refreshStaffPhotoPreview();
  openModal(els.modalStaff);
  staffForm.elements.fullName.focus();
}

async function toggleStaffActive(userId, makeActive) {
  if (!userCan(state.user, 'staff')) return;
  const users = readUsersList();
  const user = findUserById(users, userId);
  if (!user) return toast('Personel bulunamadı.');
  if (user.active !== false === makeActive) return;
  if (!makeActive) {
    if (user.id === state.user.id) {
      return toast('Kendi hesabınızı pasifleştiremezsiniz; başka bir yönetici devralsın.');
    }
    if (!window.confirm(`${user.name} pasifleştirilsin mi? Giriş yapamaz; eski işlem kayıtları kalır.`)) return;
    if (wouldRemoveLastYonetici(users, userId, user.role, false)) {
      return toast('Son aktif yönetici pasifleştirilemez.');
    }
  }
  const next = users.map(item => (item.id === userId ? { ...item, active: makeActive } : item));
  saveUsers(next);
  appendAudit(makeActive ? 'Personel aktifleştirildi' : 'Personel pasifleştirildi', user.username);
  renderStaff();
  toast(makeActive ? `${user.name} tekrar aktif.` : `${user.name} pasifleştirildi.`);
}

function openRoomNoteModal(roomNo, noteId = null) {
  if (!roomNo) return;
  state.noteModalRoom = roomNo;
  state.noteModalId = noteId;
  const note = noteId ? findRoomNote(roomNo, noteId) : null;
  roomNoteModalForm.reset();
  setError(els.roomNoteError, '');
  els.roomNoteTitle.textContent = noteId
    ? `${roomDisplayLabel(roomNo)} · Not`
    : `${roomDisplayLabel(roomNo)} · Yeni not`;
  if (note) {
    roomNoteModalForm.elements.text.value = note.text;
    roomNoteModalForm.elements.urgent.checked = note.urgent === true;
    els.roomNoteMeta.textContent = `${note.createdByName || '—'} · ${formatDateTime(note.createdAt)}${note.completedAt ? ` · Tamamlandı ${formatDateTime(note.completedAt)}` : ''}`;
    els.roomNoteDelete.classList.remove('is-hidden');
    els.roomNoteComplete.classList.toggle('is-hidden', Boolean(note.completedAt));
    roomNoteModalForm.elements.text.disabled = Boolean(note.completedAt);
    roomNoteModalForm.elements.urgent.disabled = Boolean(note.completedAt);
    roomNoteModalForm.querySelector('[type="submit"]').classList.toggle('is-hidden', Boolean(note.completedAt));
  } else {
    els.roomNoteMeta.textContent = 'Başlık veya kategori yok — yalnızca kısa not yazın.';
    els.roomNoteDelete.classList.add('is-hidden');
    els.roomNoteComplete.classList.add('is-hidden');
    roomNoteModalForm.elements.text.disabled = false;
    roomNoteModalForm.elements.urgent.disabled = false;
    roomNoteModalForm.querySelector('[type="submit"]').classList.remove('is-hidden');
  }
  openModal(els.modalRoomNote);
  if (!note || !note.completedAt) roomNoteModalForm.elements.text.focus();
}

function saveRoomNoteFromModal() {
  const roomNo = state.noteModalRoom;
  if (!roomNo) return;
  const text = String(roomNoteModalForm.elements.text.value || '').trim();
  if (text.length < 2) return setError(els.roomNoteError, 'En az 2 karakter yazın.');
  const urgent = roomNoteModalForm.elements.urgent.checked;
  const saved = roomSaved(roomNo);
  let notes;
  if (state.noteModalId) {
    notes = saved.notes.map(n => (
      n.id === state.noteModalId
        ? { ...n, text, urgent, updatedAt: nowISO() }
        : n
    ));
    appendAudit('Oda notu güncellendi', `Oda ${roomNo}`);
  } else {
    notes = saved.notes.concat([{
      id: `note-${Date.now()}`,
      text,
      urgent,
      createdBy: state.user.id,
      createdByName: state.user.name,
      createdAt: nowISO(),
      completedAt: null,
      completedBy: null,
      completedByName: null,
    }]);
    appendAudit('Oda notu', `Oda ${roomNo}`);
  }
  upsertRoomNotes(roomNo, notes);
  closeModal(els.modalRoomNote);
  state.noteModalRoom = null;
  state.noteModalId = null;
  renderOperational();
  toast('Not kaydedildi.');
}

function deleteRoomNote(roomNo, noteId) {
  if (!roomNo || !noteId) return;
  if (!window.confirm('Bu not silinsin mi?')) return;
  const notes = roomSaved(roomNo).notes.filter(n => n.id !== noteId);
  upsertRoomNotes(roomNo, notes);
  appendAudit('Oda notu silindi', `Oda ${roomNo}`);
  closeModal(els.modalRoomNote);
  state.noteModalRoom = null;
  state.noteModalId = null;
  renderOperational();
  toast('Not silindi.');
}

function completeRoomNote(roomNo, noteId) {
  if (!roomNo || !noteId) return;
  const notes = roomSaved(roomNo).notes.map(n => (
    n.id === noteId
      ? { ...n, completedAt: nowISO(), completedBy: state.user.id, completedByName: state.user.name }
      : n
  ));
  upsertRoomNotes(roomNo, notes);
  appendAudit('Oda notu tamamlandı', `Oda ${roomNo}`);
  closeModal(els.modalRoomNote);
  state.noteModalRoom = null;
  state.noteModalId = null;
  renderOperational();
  toast('Not tamamlandı.');
}

function openRoomModal(no) {
  state.galleryIndex = 0;
  renderRoomModal(no);
  openModal(els.modalRoom);
}

function enter(user, fresh) {
  state.user = user;
  if (fresh) {
    writeJSON(KEYS.session, { id: user.id });
    rememberUser(user);
    state.loginPickUsername = '';
    try { sessionStorage.removeItem(PAGE_KEY); } catch (err) { /* yoksay */ }
  }
  document.documentElement.dataset.screen = 'app';
  let saved = null;
  try { saved = sessionStorage.getItem(PAGE_KEY); } catch (err) { saved = null; }
  if (saved === 'handovers' || saved === 'issues' || !userCan(user, saved)) saved = null;
  state.page = saved || 'dashboard';
  state.query = '';
  els.search.value = '';
  renderNav();
  renderSession();
  renderLogin();
  renderOperational();
  renderStaff();
  applyChrome();
}

function logout() {
  showLoginScreen('');
}

function openListFocus(focus) {
  navigate('reservations', { scroll: true, keepFocus: true, focus });
}

function navigate(page, options = {}) {
  page = guardPage(page);
  if (!userCan(state.user, page)) page = 'dashboard';
  const focus = options.keepFocus ? (options.focus || state.listFocus || '') : '';
  const same = page === state.page && focus === state.listFocus;
  state.listFocus = focus;
  if (same) return;
  state.page = page;
  state.query = '';
  els.search.value = '';
  applyChrome();
  renderOperational();
  renderStaff();
  if (options.scroll) {
    window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
  }
}

function prefersReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shiftMonth(delta) {
  const date = new Date(state.calYear, state.calMonth + delta, 1);
  state.calYear = date.getFullYear();
  state.calMonth = date.getMonth();
  const today = parseISO(TODAY);
  state.selectedDay = today.getFullYear() === state.calYear && today.getMonth() === state.calMonth
    ? TODAY
    : isoFromDate(new Date(state.calYear, state.calMonth, 1));
  renderCalendar(snapshot());
}

function bindModal(modal) {
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal(modal);
  });
  modal.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => closeModal(modal));
  });
}

function setSidebarOpen(open) {
  document.documentElement.classList.toggle('sidebar-open', open);
  const toggle = document.getElementById('menu-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (backdrop) backdrop.hidden = !open;
}

function bindEvents() {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const username = String(loginForm.elements.username.value || '').trim();
    const password = loginForm.elements.password.value;
    await ensureUsers();
    const users = readJSON(KEYS.users, []);
    const user = Array.isArray(users) ? users.find(item => (
      item.username.toLocaleLowerCase('tr-TR') === username.toLocaleLowerCase('tr-TR')
      && item.active !== false
    )) : null;
    if (!user) return setError(els.loginError, 'Kullanıcı adı veya şifre hatalı.');
    let ok = false;
    if (isHashed(user.passwordHash)) {
      const hash = await hashPassword(password);
      ok = hash === user.passwordHash;
    }
    if (!ok && typeof user.password === 'string') {
      ok = user.password === password;
      if (ok) {
        user.passwordHash = await hashPassword(password);
        delete user.password;
        const list = users.map(u => (u.id === user.id ? user : u));
        saveUsers(list);
      }
    }
    if (!ok) return setError(els.loginError, 'Kullanıcı adı veya şifre hatalı.');
    setError(els.loginError, '');
    loginForm.reset();
    enter(user, true);
    appendAudit('Giriş', user.username);
  });

  document.getElementById('logout').addEventListener('click', logout);
  document.getElementById('brand-home').addEventListener('click', () => navigate('dashboard', { scroll: true }));

  if (els.sessionMenuToggle) {
    els.sessionMenuToggle.addEventListener('click', event => {
      event.stopPropagation();
      if (state.accountMenuOpen) closeAccountMenu();
      else openAccountMenu(els.sessionMenuToggle);
    });
  }
  if (els.pageHeadAccount) {
    els.pageHeadAccount.addEventListener('click', event => {
      event.stopPropagation();
      if (state.accountMenuOpen) closeAccountMenu();
      else openAccountMenu(els.pageHeadAccount);
    });
  }

  els.nav.addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    navigate(button.dataset.page, { scroll: true });
    setSidebarOpen(false);
  });

  els.search.addEventListener('input', () => {
    state.query = els.search.value;
    renderOperational();
    renderStaff();
  });

  els.search.addEventListener('keydown', event => {
    if (event.key === 'Escape' && els.search.value) {
      event.stopPropagation();
      els.search.value = '';
      state.query = '';
      renderOperational();
      renderStaff();
    }
  });

  els.btnStay.addEventListener('click', openStayModal);
  document.getElementById('btn-head-stay')?.addEventListener('click', openStayModal);
  document.getElementById('btn-house-note')?.addEventListener('click', () => openHouseNoteModal(''));
  els.btnStaff.addEventListener('click', () => openStaffModal(''));
  stayForm.elements.room.addEventListener('change', clampStayPax);
  if (els.houseNoteForm) {
    els.houseNoteForm.addEventListener('submit', event => {
      event.preventDefault();
      const text = els.houseNoteForm.elements.text.value.trim().replace(/\s+/g, ' ');
      if (text.length < 2) return setError(els.houseNoteError, 'Notu yazın.');
      const notes = readHouseNotes();
      if (state.houseNoteId) {
        const idx = notes.findIndex(note => note.id === state.houseNoteId);
        if (idx >= 0 && canManageHouseNote(notes[idx])) {
          notes[idx] = { ...notes[idx], text, updatedAt: nowISO() };
          appendAudit('Genel not güncellendi', text.slice(0, 80));
        }
      } else {
        notes.push({
          id: `hnote-${Date.now()}`,
          text,
          createdAt: nowISO(),
          createdBy: state.user.id,
          createdByName: state.user.name,
          updatedAt: null,
        });
        appendAudit('Genel not', text.slice(0, 80));
      }
      saveHouseNotes(notes);
      state.houseNoteId = '';
      closeModal(els.modalHouseNote);
      renderHouseNotes();
      toast(state.page === 'dashboard' ? 'Not kaydedildi.' : 'Not kaydedildi. Ana sayfadaki Genel Notlar alanında görünür.');
    });
  }
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form || form.id !== 'amenity-form') return;
    event.preventDefault();
    if (userRole(state.user) !== 'yonetici') return;
    const roomNo = form.dataset.room;
    const keys = [...form.querySelectorAll('input[name="amenity"]:checked')].map(input => input.value);
    const meta = readRoomMeta();
    meta[roomNo] = { ...(meta[roomNo] || {}), amenities: keys };
    writeJSON(KEYS.roomMeta, meta);
    appendAudit('Oda olanakları', `Oda ${roomNo}`);
    toast('Olanaklar kaydedildi.');
    renderRoomModal(roomNo);
  });

  if (els.roomNoteDelete) {
    els.roomNoteDelete.addEventListener('click', () => {
      if (state.noteModalRoom && state.noteModalId) {
        deleteRoomNote(state.noteModalRoom, state.noteModalId);
      }
    });
  }
  if (els.roomNoteComplete) {
    els.roomNoteComplete.addEventListener('click', () => {
      if (state.noteModalRoom && state.noteModalId) {
        completeRoomNote(state.noteModalRoom, state.noteModalId);
      }
    });
  }
  if (els.auditForm) {
    els.auditForm.addEventListener('submit', event => {
      event.preventDefault();
      saveAuditFromModal();
    });
  }
  if (els.auditDelete) {
    els.auditDelete.addEventListener('click', () => removeAuditFromModal());
  }
  const staffPhotoFile = document.getElementById('staff-photo-file');
  const staffPhotoClear = document.getElementById('staff-photo-clear');
  if (staffPhotoFile) {
    staffPhotoFile.addEventListener('change', () => {
      applyPhotoFile(staffPhotoFile, data => {
        state.staffPhoto = data;
        refreshStaffPhotoPreview();
      });
    });
  }
  if (staffPhotoClear) {
    staffPhotoClear.addEventListener('click', () => {
      state.staffPhoto = '';
      refreshStaffPhotoPreview();
    });
  }
  const profileForm = document.getElementById('profile-form');
  const profilePhotoFile = document.getElementById('profile-photo-file');
  const profilePhotoClear = document.getElementById('profile-photo-clear');
  if (profileForm) {
    profileForm.addEventListener('submit', event => {
      event.preventDefault();
      saveOwnProfilePhoto();
    });
  }
  if (profilePhotoFile) {
    profilePhotoFile.addEventListener('change', () => {
      applyPhotoFile(profilePhotoFile, data => {
        state.profilePhoto = data;
        paintPhotoPreview(document.getElementById('profile-photo-preview'), state.user ? state.user.name : '?', state.profilePhoto);
      });
    });
  }
  if (profilePhotoClear) {
    profilePhotoClear.addEventListener('click', () => {
      state.profilePhoto = '';
      paintPhotoPreview(document.getElementById('profile-photo-preview'), state.user ? state.user.name : '?', '');
    });
  }

  document.addEventListener('click', event => {
    if (state.accountMenuOpen && !event.target.closest('#account-menu') && !event.target.closest('#session-menu-toggle') && !event.target.closest('#page-head-account')) {
      closeAccountMenu();
    }
    if (!event.target.closest('.room-status-picker') && state.roomStatusMenuNo) {
      closeRoomStatusMenus();
    }
    const pickLogin = event.target.closest('[data-pick-login-user]');
    if (pickLogin) {
      state.loginPickUsername = pickLogin.dataset.pickLoginUser || '';
      if (loginForm) {
        loginForm.elements.username.value = state.loginPickUsername;
        loginForm.elements.password.focus();
      }
      renderLogin();
      return;
    }
    const removeRemembered = event.target.closest('[data-remove-remembered]');
    if (removeRemembered) {
      removeRememberedUser(removeRemembered.dataset.removeRemembered);
      renderLogin();
      return;
    }
    const switchUser = event.target.closest('[data-switch-user]');
    if (switchUser) {
      switchToLoginAs(switchUser.dataset.switchUser || '');
      return;
    }
    const goLoginSwitch = event.target.closest('[data-go-login-switch]');
    if (goLoginSwitch) {
      switchToLoginAs('');
      return;
    }
    const openProfile = event.target.closest('[data-open-profile]');
    if (openProfile) {
      openProfileModal();
      return;
    }
    const clearFocus = event.target.closest('[data-clear-focus]');
    if (clearFocus) {
      state.listFocus = '';
      renderReservations(snapshot());
      return;
    }
    const dashStat = event.target.closest('[data-dash-stat]');
    if (dashStat) {
      const key = dashStat.dataset.dashStat;
      if (key === 'arrivals') openListFocus('arrivals');
      else if (key === 'departures') openListFocus('departures');
      else if (key === 'available') navigateRoomsFilter('available');
      else if (key === 'occupied') navigateRoomsFilter('occupied');
      else if (key === 'cleaning') navigateRoomsFilter('cleaning');
      return;
    }
    const resQuick = event.target.closest('[data-res-quick]');
    if (resQuick) {
      const key = resQuick.dataset.resQuick;
      const f = resFilters();
      state.listFocus = key === 'arrivals' || key === 'departures' ? key : '';
      f.status = ['inhouse', 'pending', 'cancelled'].includes(key) ? key : 'all';
      renderReservations(snapshot());
      return;
    }
    const resClear = event.target.closest('#res-filter-clear');
    if (resClear) {
      state.resFilter = null;
      state.listFocus = '';
      state.query = '';
      els.search.value = '';
      renderReservations(snapshot());
      return;
    }
    const reportRangeBtn = event.target.closest('[data-report-range]');
    if (reportRangeBtn) {
      const r = reportState();
      r.key = reportRangeBtn.dataset.reportRange;
      if (r.key === 'custom' && !r.from) {
        r.from = addDays(TODAY, -29);
        r.to = TODAY;
        const fromInput = document.getElementById('report-from');
        const toInput = document.getElementById('report-to');
        if (fromInput) fromInput.value = r.from;
        if (toInput) toInput.value = r.to;
      }
      renderReports(snapshot());
      return;
    }
    if (event.target.closest('#report-export-pdf')) {
      exportReportPdf();
      return;
    }
    if (event.target.closest('#report-export-csv')) {
      exportReportCsv();
      return;
    }
    if (event.target.closest('#settings-backup')) {
      exportBackup();
      return;
    }
    if (event.target.closest('#settings-renumber')) {
      renumberFromSettings();
      return;
    }
    const stayConfirm = event.target.closest('[data-stay-confirm]');
    if (stayConfirm) {
      confirmStay(stayConfirm.dataset.stayConfirm);
      return;
    }
    const stayEdit = event.target.closest('[data-stay-edit]');
    if (stayEdit) {
      openStayEdit(stayEdit.dataset.stayEdit);
      return;
    }
    const stayPay = event.target.closest('[data-stay-pay]');
    if (stayPay) {
      openPaymentModal(stayPay.dataset.stayPay);
      return;
    }
    const statusMenu = event.target.closest('[data-room-status-menu]');
    if (statusMenu) {
      event.stopPropagation();
      event.preventDefault();
      toggleRoomStatusMenu(statusMenu.dataset.roomStatusMenu);
      return;
    }
    const statusSet = event.target.closest('[data-room-status-set]');
    if (statusSet) {
      event.stopPropagation();
      event.preventDefault();
      applyRoomStatusFromUi(statusSet.dataset.roomStatusSet, statusSet.dataset.roomStatus);
      return;
    }
    const houseEdit = event.target.closest('[data-house-note-edit]');
    if (houseEdit) {
      openHouseNoteModal(houseEdit.dataset.houseNoteEdit);
      return;
    }
    const houseDelete = event.target.closest('[data-house-note-delete]');
    if (houseDelete) {
      const target = readHouseNotes().find(note => note.id === houseDelete.dataset.houseNoteDelete);
      if (!canManageHouseNote(target)) return;
      if (!window.confirm('Bu genel not silinsin mi?')) return;
      saveHouseNotes(readHouseNotes().filter(note => note.id !== target.id));
      appendAudit('Genel not silindi', target.text.slice(0, 80));
      renderHouseNotes();
      toast('Not silindi.');
      return;
    }
    const noteAdd = event.target.closest('[data-room-note-add]');
    if (noteAdd) {
      event.stopPropagation();
      event.preventDefault();
      openRoomNoteModal(noteAdd.dataset.roomNoteAdd);
      return;
    }
    const noteOpen = event.target.closest('[data-room-note-open]');
    if (noteOpen) {
      event.stopPropagation();
      openRoomNoteModal(noteOpen.dataset.roomNoteOpen, noteOpen.dataset.noteId);
      return;
    }
    const noteDeleteBtn = event.target.closest('[data-room-note-delete]');
    if (noteDeleteBtn) {
      event.stopPropagation();
      deleteRoomNote(noteDeleteBtn.dataset.roomNoteDelete, noteDeleteBtn.dataset.noteId);
      return;
    }
    const noteCompleteBtn = event.target.closest('[data-room-note-complete]');
    if (noteCompleteBtn) {
      event.stopPropagation();
      completeRoomNote(noteCompleteBtn.dataset.roomNoteComplete, noteCompleteBtn.dataset.noteId);
      return;
    }
    const auditEditBtn = event.target.closest('[data-audit-edit]');
    if (auditEditBtn) {
      openAuditModal(auditEditBtn.dataset.auditEdit);
      return;
    }
    const auditDeleteBtn = event.target.closest('[data-audit-delete]');
    if (auditDeleteBtn) {
      const id = auditDeleteBtn.dataset.auditDelete;
      if (!window.confirm('Bu işlem kaydı silinsin mi?')) return;
      if (deleteAuditEntry(id)) {
        renderAudit();
        toast('Kayıt silindi.');
      } else {
        toast('Kayıt silinemedi.');
      }
      return;
    }
    const auditClearAll = event.target.closest('[data-audit-clear-all]');
    if (auditClearAll) {
      if (!window.confirm('Tüm işlem geçmişi temizlensin mi? Bu işlem geri alınamaz.')) return;
      if (clearAuditLog()) {
        renderAudit();
        toast('İşlem geçmişi temizlendi.');
      }
      return;
    }
    const openRoom = event.target.closest('[data-room-open]');
    if (openRoom) {
      openRoomModal(openRoom.dataset.roomOpen);
      return;
    }
    const stayOpen = event.target.closest('[data-stay-open]');
    if (stayOpen && !event.target.closest('.modal')) {
      openStayDetail(stayOpen.dataset.stayOpen);
      return;
    }
    const checkIn = event.target.closest('[data-check-in]');
    if (checkIn) {
      performCheckIn(checkIn.dataset.checkIn);
      return;
    }
    const checkOut = event.target.closest('[data-check-out]');
    if (checkOut) {
      performCheckOut(checkOut.dataset.checkOut);
      return;
    }
    const cancelBtn = event.target.closest('[data-cancel-stay]');
    if (cancelBtn) {
      if (!window.confirm('Bu rezervasyon iptal edilsin mi? Oda bu tarihler için yeniden müsait olur.')) return;
      cancelStay(cancelBtn.dataset.cancelStay);
      return;
    }
    const roomEdit = event.target.closest('[data-room-edit]');
    if (roomEdit) {
      openRoomEditModal(roomEdit.dataset.roomEdit);
      return;
    }
    const priceApprove = event.target.closest('[data-price-approve]');
    if (priceApprove) {
      if (userRole(state.user) !== 'yonetici') return;
      const roomNo = priceApprove.dataset.priceApprove;
      const value = Number(priceApprove.dataset.priceValue);
      if (!window.confirm(`Oda ${roomNo} gecelik fiyatı ${money(value)} olarak güncellensin mi? Mevcut rezervasyonların fiyatı değişmez.`)) return;
      if (setRoomPrice(roomNo, value, 'suggestion')) {
        renderOperational();
        toast(`Oda ${roomNo} fiyatı güncellendi.`);
      }
      return;
    }
    const statusBtn = event.target.closest('[data-room-status]');
    if (statusBtn && state.roomModalNo && !statusBtn.closest('.room-status-picker')) {
      applyRoomStatusFromUi(state.roomModalNo, statusBtn.dataset.roomStatus, { toast: false });
      return;
    }
    const galleryThumb = event.target.closest('[data-gallery-index]');
    if (galleryThumb && state.roomModalNo) {
      state.galleryIndex = Number(galleryThumb.dataset.galleryIndex) || 0;
      renderRoomModal(state.roomModalNo);
      return;
    }
    const galleryZoom = event.target.closest('[data-gallery-zoom]');
    if (galleryZoom) {
      const box = document.getElementById('gallery-lightbox');
      const img = document.getElementById('gallery-lightbox-img');
      if (box && img) {
        img.src = galleryZoom.dataset.galleryZoom;
        box.hidden = false;
        box.classList.add('is-open');
      }
      return;
    }
    const editStaff = event.target.closest('[data-edit-staff]');
    if (editStaff) {
      openStaffModal(editStaff.dataset.editStaff);
      return;
    }
    const staffToggle = event.target.closest('[data-staff-toggle]');
    if (staffToggle) {
      toggleStaffActive(staffToggle.dataset.staffToggle, staffToggle.dataset.nextActive === '1');
      return;
    }
  });

  if (roomNoteModalForm) {
    roomNoteModalForm.addEventListener('submit', event => {
      event.preventDefault();
      saveRoomNoteFromModal();
    });
  }

  document.querySelector('.chips').addEventListener('click', event => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    state.roomFilter = chip.dataset.filter;
    document.querySelectorAll('.chip').forEach(item => {
      const on = item === chip;
      item.classList.toggle('is-on', on);
      item.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderRooms(snapshot());
  });

  document.getElementById('cal-prev').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => shiftMonth(1));
  document.getElementById('cal-today').addEventListener('click', () => {
    const today = parseISO(TODAY);
    state.calYear = today.getFullYear();
    state.calMonth = today.getMonth();
    state.selectedDay = TODAY;
    state.calScrollToday = true;
    renderCalendar(snapshot());
  });

  const roomEditForm = document.getElementById('room-edit-form');
  if (roomEditForm) {
    roomEditForm.addEventListener('submit', event => {
      event.preventDefault();
      if (userRole(state.user) !== 'yonetici') return;
      saveRoomEdit(roomEditForm);
    });
  }
  document.getElementById('btn-add-room')?.addEventListener('click', () => openRoomEditModal(''));

  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', event => {
      event.preventDefault();
      savePayment(paymentForm);
    });
  }
  const stayEditForm = document.getElementById('stay-edit-form');
  if (stayEditForm) {
    stayEditForm.addEventListener('submit', event => {
      event.preventDefault();
      saveStayEdit(stayEditForm);
    });
    ['checkIn', 'checkOut'].forEach(name => stayEditForm.elements[name].addEventListener('change', () => {
      refreshStayEditRooms();
      updateStayEditQuote();
    }));
    stayEditForm.elements.room.addEventListener('change', updateStayEditQuote);
  }
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-stay-note-form]');
    if (!form) return;
    event.preventDefault();
    addStayNote(form.dataset.stayNoteForm, form.elements.text.value);
  });
  [['res-filter-status', 'status'], ['res-filter-room', 'room'], ['res-filter-from', 'from'], ['res-filter-to', 'to']].forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', () => {
      resFilters()[key] = input.value || (key === 'status' || key === 'room' ? 'all' : '');
      if (key === 'status') state.listFocus = '';
      renderReservations(snapshot());
    });
  });
  ['report-from', 'report-to'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', () => {
      const r = reportState();
      r.key = 'custom';
      r[id === 'report-from' ? 'from' : 'to'] = input.value;
      if (isISO(r.from) && isISO(r.to) && r.from > r.to) {
        toast('Başlangıç tarihi bitişten sonra olamaz.');
        return;
      }
      renderReports(snapshot());
    });
  });

  const currencySelect = document.getElementById('settings-currency');
  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      if (userRole(state.user) !== 'yonetici') return;
      saveSettings({ currency: currencySelect.value });
      appendAudit('Para birimi', CURRENCIES[currencySelect.value] || currencySelect.value);
      renderOperational();
      toast('Para birimi kaydedildi.');
    });
  }

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-price-form]');
    if (!form) return;
    event.preventDefault();
    if (userRole(state.user) !== 'yonetici') return;
    const roomNo = form.dataset.priceForm;
    if (!setRoomPrice(roomNo, form.elements.price.value, 'manual')) {
      toast('Geçerli bir fiyat girin.');
      return;
    }
    renderOperational();
    toast(`Oda ${roomNo} fiyatı kaydedildi.`);
  });

  ['checkIn', 'checkOut'].forEach(key => {
    stayForm.elements[key].addEventListener('change', () => {
      const checkIn = stayForm.elements.checkIn.value;
      if (isISO(checkIn) && stayForm.elements.checkOut.value <= checkIn) {
        stayForm.elements.checkOut.value = addDays(checkIn, 1);
      }
      setError(els.stayError, '');
      refreshStayRooms();
    });
  });

  stayForm.addEventListener('input', () => updateStayQuote());
  stayForm.addEventListener('change', () => updateStayQuote());

  stayForm.addEventListener('submit', event => {
    event.preventDefault();
    const guest = stayForm.elements.guest.value.trim().replace(/\s+/g, ' ');
    const phone = stayForm.elements.phone.value.trim();
    const checkIn = stayForm.elements.checkIn.value;
    const checkOut = stayForm.elements.checkOut.value;
    const wantInhouse = stayForm.elements.status.value === 'inhouse';
    const room = stayForm.elements.room.value;
    const pax = Number(stayForm.elements.pax.value);
    const note = stayForm.elements.note.value.trim().replace(/\s+/g, ' ').slice(0, 300);
    const paymentMode = stayForm.elements.payment.value;
    if (guest.length < 2) return setError(els.stayError, 'Misafir adını yazın.');
    if (!isISO(checkIn) || !isISO(checkOut)) return setError(els.stayError, 'Tarihleri seçin.');
    if (checkIn >= checkOut) return setError(els.stayError, 'Çıkış, girişten sonra olmalı.');
    if (wantInhouse && checkIn > TODAY) return setError(els.stayError, 'Misafir girişi için tarih bugün veya önce olmalı.');
    if (!wantInhouse && checkIn < TODAY) return setError(els.stayError, 'Geçmiş güne rezervasyon yazılamaz.');
    const catalog = findRoom(room);
    if (!room || stayForm.elements.room.disabled || !catalog) return setError(els.stayError, 'Bu tarihlerde uygun oda yok.');
    if (!Number.isInteger(pax) || pax < 1 || pax > catalog.max) return setError(els.stayError, `Bu oda en fazla ${catalog.max} misafir alır.`);
    if (hasConflict(allStays(), room, checkIn, checkOut)) return setError(els.stayError, 'Oda bu tarihlerde dolu.');
    const quote = stayFormQuote();
    if (!quote.priceNight) return setError(els.stayError, 'Bu odanın gecelik fiyatı girilmemiş.');
    if (paymentMode === 'partial' && (quote.paid <= 0 || quote.paid >= quote.total)) {
      return setError(els.stayError, 'Kısmi ödemede tutar sıfırdan büyük ve genel toplamdan küçük olmalı.');
    }
    if (wantInhouse && allStays().some(s => s.room === room && s.status === 'inhouse')) return setError(els.stayError, `Oda ${room} şu anda dolu.`);
    const total = quote.total;
    const paid = quote.paid;
    const status = wantInhouse ? 'inhouse' : (stayForm.elements.status.value === 'pending' ? 'pending' : 'expected');
    const submit = stayForm.querySelector('[type="submit"]');
    submit.disabled = true;
    const stays = readStays();
    const newStay = {
      id: `stay-${Date.now()}`,
      code: nextStayCode(stays, parseISO(TODAY).getFullYear()),
      guest,
      phone,
      room,
      checkIn,
      checkOut,
      pax,
      status,
      time: isUpcoming({ status }) ? '15:00' : '',
      note,
      total,
      paid,
      payments: paid > 0 ? [{ id: `pay-${Date.now()}`, amount: paid, at: nowISO(), method: 'cash', note: 'Rezervasyon sırasında', byName: state.user.name }] : [],
      confirmedAt: status === 'pending' ? null : nowISO(),
      paymentStatus: paymentStatusFrom(total, paid),
      actualCheckIn: wantInhouse ? nowISO() : null,
      actualCheckOut: null,
      priceNight: quote.priceNight,
      nights: quote.nights,
      subtotal: quote.subtotal,
      discount: quote.discount,
      currency: readSettings().currency,
      createdAt: nowISO(),
      createdBy: state.user.id,
    };
    stays.push(newStay);
    saveStays(stays);
    if (wantInhouse) saveRoom(room, { status: 'occupied' });
    submit.disabled = false;
    closeModal(els.modalStay);
    appendAudit(wantInhouse ? 'Check-in (yeni)' : 'Rezervasyon', `${newStay.code} · ${guest} · Oda ${room} · ${STAY_LABEL[status]}`);
    renderOperational();
    toast(wantInhouse ? `${guest} odaya alındı.` : `${newStay.code} · ${guest} rezervasyonu kaydedildi.`);
  });

  staffForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!userCan(state.user, 'staff')) return;
    const editId = String(staffForm.elements.userId.value || '').trim() || null;
    const name = staffForm.elements.fullName.value.trim().replace(/\s+/g, ' ');
    const username = String(staffForm.elements.username.value || '').trim();
    const password = staffForm.elements.password.value;
    const role = staffForm.elements.role.value === 'yonetici' ? 'yonetici' : 'personel';
    const active = staffForm.elements.active.checked;
    if (name.length < 2) return setError(els.staffError, 'Ad soyad yazın.');
    if (!/^[\p{L}\p{N}._-]{3,24}$/u.test(username)) return setError(els.staffError, 'Kullanıcı adı 3–24 karakter olsun.');
    const users = readUsersList();
    const exists = users.some(user => (
      user.username.toLocaleLowerCase('tr-TR') === username.toLocaleLowerCase('tr-TR')
      && user.id !== editId
    ));
    if (exists) return setError(els.staffError, 'Bu kullanıcı adı zaten kayıtlı.');
    if (!editId && password.length < 4) return setError(els.staffError, 'Şifre en az 4 karakter olsun.');
    if (editId && password.length > 0 && password.length < 4) return setError(els.staffError, 'Yeni şifre en az 4 karakter olsun.');
    if (editId) {
      const existing = findUserById(users, editId);
      if (!existing) return setError(els.staffError, 'Personel bulunamadı.');
      if (!active && existing.id === state.user.id) {
        return setError(els.staffError, 'Kendi hesabınızı pasifleştiremezsiniz.');
      }
      if (wouldRemoveLastYonetici(users, editId, role, active)) {
        return setError(els.staffError, 'En az bir aktif yönetici kalmalı.');
      }
    }
    const submit = staffForm.querySelector('[type="submit"]');
    submit.disabled = true;
    if (editId) {
      const existing = findUserById(users, editId);
      const updated = applyUserPhoto({
        ...existing,
        name,
        username,
        role,
        active,
      }, state.staffPhoto);
      if (password.length >= 4) updated.passwordHash = await hashPassword(password);
      const next = users.map(user => (user.id === editId ? updated : user));
      saveUsers(next);
      submit.disabled = false;
      closeModal(els.modalStaff);
      state.staffEditId = null;
      appendAudit('Personel güncellendi', username);
      if (state.user.id === editId) {
        state.user = updated;
        rememberUser(updated);
        renderSession();
        applyChrome();
      } else {
        const remembered = readRememberedUsers().some(item => item.id === editId);
        if (remembered) rememberUser(updated);
      }
      renderStaff();
      toast(`${name} güncellendi.`);
      return;
    }
    const passwordHash = await hashPassword(password);
    users.push(applyUserPhoto({
      id: `usr-${Date.now()}`,
      name,
      username,
      passwordHash,
      role,
      active,
    }, state.staffPhoto));
    saveUsers(users);
    submit.disabled = false;
    closeModal(els.modalStaff);
    appendAudit('Personel eklendi', username);
    renderStaff();
    toast(`${name} eklendi.`);
  });

  [
    els.modalStay, els.modalStaff, els.modalRoom, els.modalRoomNote, els.modalAudit, els.modalProfile,
    els.modalHouseNote, document.getElementById('modal-room-edit'), document.getElementById('modal-stay-detail'),
    document.getElementById('modal-payment'), document.getElementById('modal-stay-edit'),
  ].forEach(modal => {
    if (modal) bindModal(modal);
  });

  const menuToggle = document.getElementById('menu-toggle');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const lightboxClose = document.getElementById('gallery-lightbox-close');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      setSidebarOpen(!document.documentElement.classList.contains('sidebar-open'));
    });
  }
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));

  if (lightboxClose) lightboxClose.addEventListener('click', () => {
    const box = document.getElementById('gallery-lightbox');
    if (box) {
      box.classList.remove('is-open');
      box.hidden = true;
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (state.accountMenuOpen) {
      closeAccountMenu();
      return;
    }
    if (state.roomStatusMenuNo) {
      closeRoomStatusMenus();
      return;
    }
    const box = document.getElementById('gallery-lightbox');
    if (box && box.classList.contains('is-open')) {
      box.classList.remove('is-open');
      box.hidden = true;
      return;
    }
    document.querySelectorAll('.modal.is-open').forEach(closeModal);
  });
}

async function init() {
  migrateStorage();
  await ensureUsers();
  bindEvents();
  renderLogin();
  const user = currentUser();
  if (user) enter(user, false);
  else {
    delete document.documentElement.dataset.screen;
    document.title = 'ATA LİFE GUEST HOUSE · Giriş';
  }
}

init().catch(err => {
  console.error(err);
  delete document.documentElement.dataset.screen;
  document.title = 'ATA LİFE GUEST HOUSE · Giriş';
  if (els.loginError) {
    els.loginError.hidden = false;
    els.loginError.textContent = 'Sistem açılamadı. Sayfayı yenileyin veya proje klasöründeki baslat.bat dosyasını çalıştırın.';
  }
});
