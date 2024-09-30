import { Display } from "./display.js"
import { Backbuffer } from "./backbuffer.js"
import { Render3d } from "./render3d.js"
import { getInput } from "./browser.js"
import { init, update, draw, GameState } from "./game.js"

const BACKBUFFER_W = Math.floor(1920 / 8);
const BACKBUFFER_H = Math.floor(1080 / 8);

window.onload = () => {
    

    const canvas = document.getElementById("canvas") as (HTMLCanvasElement | null);
    if (canvas === null) {
        throw new Error("cannot find canvas with id 'canvas'");
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true }) as (CanvasRenderingContext2D | null);
    if (ctx === null) {
        throw new Error("2d context is not supported");
    }

    const display = new Display();
    const backbuffer = new Backbuffer(BACKBUFFER_W, BACKBUFFER_H);
    const r3d = new Render3d();
    const gs: GameState = init();

    let lastTime: number = 0;
    const loop = (currentTime: number) => {
        
        let dt: number = (currentTime - lastTime) / 1000;
        lastTime = currentTime;        

        const keyboard = getInput();
        update(gs, keyboard, dt);
        draw(gs, r3d, backbuffer, display);
        
        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    
};
