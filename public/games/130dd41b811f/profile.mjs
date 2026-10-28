// 기기 안에 최고 기록, 모은 코인, 산 캐릭터를 저장한다.
const KEY = 'endless-stairs-save-v1';

function defaults() {
  return { best: 0, coins: 0, hero: 'sky', pet: 'none', sound: true, owned: { heroes: ['sky'], pets: ['none'] } };
}

export function loadProfile({ heroIds = [], petIds = [] } = {}) {
  const profile = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (Number.isFinite(saved.best)) profile.best = Math.max(0, Math.floor(saved.best));
      if (Number.isFinite(saved.coins)) profile.coins = Math.max(0, Math.floor(saved.coins));
      if (typeof saved.sound === 'boolean') profile.sound = saved.sound;
      for (const [kind, ids] of [['heroes', heroIds], ['pets', petIds]]) {
        const list = Array.isArray(saved.owned?.[kind]) ? saved.owned[kind] : [];
        for (const id of list) if (ids.includes(id) && !profile.owned[kind].includes(id)) profile.owned[kind].push(id);
      }
      if (profile.owned.heroes.includes(saved.hero)) profile.hero = saved.hero;
      if (profile.owned.pets.includes(saved.pet)) profile.pet = saved.pet;
    }
  } catch { /* 저장소를 쓸 수 없으면 기본값으로 시작한다. */ }
  return profile;
}

export function saveProfile(profile) {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* 저장 공간이 없으면 이번 실행에서만 기억한다. */ }
}
