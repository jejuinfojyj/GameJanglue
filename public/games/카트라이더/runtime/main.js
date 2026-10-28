import { Game } from "./game.js";
const canvas = document.querySelector("#game");
if (!canvas)
    throw new Error("canvas #game 이 없습니다.");
const game = new Game(canvas);
game.start();
window.__game = game;
