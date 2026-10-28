import { Game } from "./game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("canvas #game 이 없습니다.");

const game = new Game(canvas);
game.start();

declare global {
  interface Window {
    __game?: Game;
  }
}

window.__game = game;
