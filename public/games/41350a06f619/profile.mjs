// 기기 안에 최고 점수, 모은 코인, 연 캐릭터와 보드, 소리 설정을 저장한다.
const KEY = 'rail-surfer-save-v1';

function defaults(heroIds, boardIds) {
  return { best: 0, coins: 0, hero: heroIds[0], board: boardIds[0], sound: true, owned: { heroes: [heroIds[0]], boards: [boardIds[0]] } };
}

export function loadProfile({ heroIds, boardIds }) {
  const profile = defaults(heroIds, boardIds);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (Number.isFinite(saved.best)) profile.best = Math.max(0, Math.floor(saved.best));
      if (Number.isFinite(saved.coins)) profile.coins = Math.max(0, Math.floor(saved.coins));
      if (typeof saved.sound === 'boolean') profile.sound = saved.sound;
      for (const [kind, ids] of [['heroes', heroIds], ['boards', boardIds]]) {
        const list = Array.isArray(saved.owned?.[kind]) ? saved.owned[kind] : [];
        for (const id of list) if (ids.includes(id) && !profile.owned[kind].includes(id)) profile.owned[kind].push(id);
      }
      if (profile.owned.heroes.includes(saved.hero)) profile.hero = saved.hero;
      if (profile.owned.boards.includes(saved.board)) profile.board = saved.board;
    }
  } catch { /* 저장소를 쓸 수 없으면 기본값으로 시작한다. */ }
  return profile;
}

export function saveProfile(profile) {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* 저장 공간이 없으면 이번 실행에서만 기억한다. */ }
}
