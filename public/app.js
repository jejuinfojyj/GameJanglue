"use strict";
const $ = (id) => document.getElementById(id);
const GENRES = [
  { name: "액션 · 아케이드", icon: "ϟ", color: "#c7b6ec", background: "#36304a" },
  { name: "퍼즐 · 캐주얼", icon: "▧", color: "#e6c38e", background: "#463b2a" },
  { name: "레이싱 · 스포츠", icon: "⚑", color: "#92cbd5", background: "#263e46" },
];
const DETAILS = {
  "탕탕특공대": ["끊임없이 몰려오는 적들 사이에서 살아남으세요.", "🛸"],
  "쿠키런 오븐브레이크": ["달콤한 질주! 점프하고 슬라이드하며 젤리를 모아요.", "🍪"],
  "젬 브롤": ["나만의 브롤러로 펼치는 짜릿한 아레나 대결.", "💎"],
  "끝없는 계단": ["한 계단 더, 조금 더 높이. 순발력으로 기록에 도전!", "🪜"],
  "Snake.io": ["먹고, 자라고, 살아남고. 가장 긴 뱀이 되어 보세요.", "🐍"],
  "find out!": ["구석구석 숨어 있는 물건과 작은 비밀을 찾아요.", "🔎"],
  "가십하버": ["같은 재료를 합쳐 요리하고 나만의 식당을 꾸며요.", "🍳"],
  "로얄매치": ["반짝이는 보석을 맞추며 나만의 왕국을 완성해요.", "👑"],
  "블락블라스트": ["블록을 채우고 줄을 지우는 기분 좋은 두뇌 운동.", "🧩"],
  "새총 요새 대작전": ["각도와 힘을 맞춰 발사! 단단한 요새를 무너뜨려요.", "🐤"],
  "수박게임": ["작은 과일이 만나 커다란 수박이 되는 순간!", "🍉"],
  "우노 카드 파티": ["색깔과 숫자를 맞추고, 마지막 한 장엔 우노!", "🃏"],
  "덩크 슛": ["슛! 정확한 타이밍으로 다음 바스켓을 노려요.", "🏀"],
  "레일 서퍼": ["세 갈래 레일 위를 달리며 장애물을 피하세요.", "🛹"],
  "로켓 리그 사이드와이프": ["하늘을 나는 로켓카로 펼치는 화끈한 축구 한 판.", "🚀"],
  "워터슬라이드 레이스": ["시원한 물살을 타고 결승선까지 미끄러져요.", "🌊"],
  "힐 클라임 레이싱": ["울퉁불퉁한 언덕길, 균형을 잡고 더 멀리 달려요.", "🚙"],
};
let games = [];
let selectedGenre = "all";
let activeGame = null;
let savedScroll = 0;
let toastTimer;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function notify(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3500);
}

function readRecent() {
  try { return localStorage.getItem("playroom:last-game:v1"); }
  catch { return null; }
}

function updateRecent() {
  const game = games.find((entry) => entry.id === readRecent());
  $("recent-section").hidden = !game;
  if (game) {
    $("recent-play").textContent = game.title + " 다시 플레이";
    $("recent-play").onclick = () => launch(game);
  }
}

function renderNavigation() {
  const nav = $("genre-nav");
  const choices = [{ name: "all", label: "모든 게임", icon: "▦" }, ...GENRES.map((genre) => ({ ...genre, label: genre.name }))];
  nav.replaceChildren();
  choices.forEach((choice, index) => {
    if (index === 1) nav.append(element("div", "nav-divider"));
    const button = element("button", "genre-link" + (selectedGenre === choice.name ? " active" : ""));
    button.type = "button";
    button.dataset.genre = choice.name;
    button.setAttribute("aria-pressed", String(selectedGenre === choice.name));
    const count = choice.name === "all" ? games.length : games.filter((game) => game.genre === choice.name).length;
    button.append(element("span", "genre-icon", choice.icon), element("span", "genre-label", choice.label), element("span", "genre-count", String(count).padStart(2, "0")));
    button.addEventListener("click", () => {
      selectedGenre = choice.name;
      renderNavigation();
      renderGames();
      nav.querySelector('[data-genre="' + choice.name + '"]')?.focus();
    });
    nav.append(button);
  });
}

function gameCard(game, index) {
  const genre = GENRES.find((entry) => entry.name === game.genre) || GENRES[0];
  const details = DETAILS[game.title] || [game.description.slice(0, 65), "🎮"];
  const card = element("article", "game-card");
  card.style.setProperty("--art-bg", genre.background);
  card.style.setProperty("--tag-color", genre.color);
  const button = element("button", "game-launch");
  button.type = "button";
  button.dataset.gameId = game.id;
  button.setAttribute("aria-label", game.title + " 플레이");
  button.addEventListener("click", () => launch(game));
  const art = element("div", "card-art");
  if (game.preview) {
    const image = element("img");
    image.src = game.preview;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    art.append(image);
  } else {
    art.append(element("div", "fallback-art", details[1]));
  }
  art.append(element("span", "card-number", "GAME " + String(index + 1).padStart(2, "0")));
  art.append(element("span", "orientation-badge", game.width > game.height ? "가로 화면" : "세로 화면"));
  const body = element("div", "card-body");
  body.append(element("span", "card-tag", game.genre), element("h3", "", game.title), element("p", "", details[0]));
  const bottom = element("div", "card-bottom");
  bottom.append(element("span", "play-label", "플레이하기"), element("span", "play-circle", "↗"));
  body.append(bottom);
  button.append(art, body);
  card.append(button);
  return card;
}

function filteredGames() {
  const query = $("search").value.trim().toLocaleLowerCase().replace(/\s/g, "");
  return games.filter((game) => (selectedGenre === "all" || game.genre === selectedGenre)
    && (game.title + game.genre).toLocaleLowerCase().replace(/\s/g, "").includes(query));
}

function renderGames() {
  const filtered = filteredGames();
  $("game-grid").replaceChildren(...filtered.map((game) => gameCard(game, games.indexOf(game))));
  $("empty-state").hidden = filtered.length > 0;
  const title = selectedGenre === "all" ? "모든 게임" : selectedGenre;
  $("collection-title").firstChild.textContent = title + " ";
  $("visible-count").textContent = filtered.length;
  $("breadcrumb-current").textContent = title;
  $("collection-subtitle").textContent = $("search").value.trim() ? "검색한 게임 " + filtered.length + "개를 찾았어요." : "오늘은 어떤 게임을 해 볼까요?";
}

function launch(game) {
  if (location.hash === "#play=" + game.id) syncRoute();
  else location.hash = "play=" + game.id;
}

function syncRoute() {
  const match = location.hash.match(/^#play=([a-f0-9]{12})$/);
  const game = match && games.find((entry) => entry.id === match[1]);
  if (!game) { closePlayer(); return; }
  if (activeGame?.id === game.id) return;
  if (!activeGame) savedScroll = window.scrollY;
  activeGame = game;
  $("library").hidden = true;
  $("player").hidden = false;
  document.body.classList.add("playing");
  $("player-title").textContent = game.title;
  $("player-genre").textContent = game.genre;
  $("player-controls").textContent = game.controls;
  $("player-help").hidden = true;
  $("toggle-help").setAttribute("aria-expanded", "false");
  $("open-game").href = game.url;
  $("player-loading").hidden = false;
  $("game-frame").title = game.title + " 게임 화면";
  $("game-frame").src = game.url;
  document.title = game.title + " — PLAYROOM";
  try { localStorage.setItem("playroom:last-game:v1", game.id); } catch { /* Play remains available without browser storage. */ }
}

function closePlayer() {
  if (!activeGame) return;
  const previousId = activeGame.id;
  activeGame = null;
  $("game-frame").src = "about:blank";
  $("player").hidden = true;
  $("library").hidden = false;
  document.body.classList.remove("playing");
  document.title = "PLAYROOM — 나의 게임방";
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  updateRecent();
  requestAnimationFrame(() => {
    window.scrollTo(0, savedScroll);
    document.querySelector('[data-game-id="' + previousId + '"]')?.focus({ preventScroll: true });
  });
}

$("search").addEventListener("input", renderGames);
$("clear-search").addEventListener("click", () => { $("search").value = ""; renderGames(); $("search").focus(); });
$("random-play").addEventListener("click", () => {
  const pool = filteredGames();
  if (pool.length) launch(pool[Math.floor(Math.random() * pool.length)]);
  else notify("검색을 초기화하면 랜덤 게임을 고를 수 있어요.");
});
$("back-library").addEventListener("click", () => { location.hash = ""; });
$("reload-game").addEventListener("click", () => {
  if (!activeGame) return;
  $("player-loading").hidden = false;
  $("game-frame").src = activeGame.url;
});
$("toggle-help").addEventListener("click", () => {
  $("player-help").hidden = !$("player-help").hidden;
  $("toggle-help").setAttribute("aria-expanded", String(!$("player-help").hidden));
});
$("fullscreen-game").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $("player").requestFullscreen();
  } catch { notify("전체 화면을 사용할 수 없어요. 새 탭 버튼으로 넓게 플레이해 보세요."); }
});
$("game-frame").addEventListener("load", () => {
  if (activeGame) {
    $("player-loading").hidden = true;
    $("game-frame").focus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !activeGame && !event.target.closest("input,textarea")) {
    event.preventDefault();
    $("search").focus();
  }
});
window.addEventListener("hashchange", syncRoute);

async function init() {
  try {
    const response = await fetch("/api/games");
    if (!response.ok) throw new Error("Catalog unavailable");
    games = (await response.json()).games;
    games.sort((a, b) => GENRES.findIndex((g) => g.name === a.genre) - GENRES.findIndex((g) => g.name === b.genre) || a.title.localeCompare(b.title, "ko"));
    $("total-count").textContent = new Set(games.map((game) => game.genre)).size + " GENRES · " + games.length + " GAMES";
    $("random-play").disabled = games.length === 0;
    renderNavigation();
    renderGames();
    updateRecent();
    syncRoute();
  } catch {
    $("game-grid").replaceChildren(element("p", "loading", "게임 목록을 불러오지 못했어요. 잠시 후 새로고침해 주세요."));
    $("random-play").disabled = true;
  }
}
init();
