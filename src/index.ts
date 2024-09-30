import { Display } from "./display.js"
import { Vector2 } from "./vector2.js"
import { Backbuffer } from "./backbuffer.js"
import { Render3d } from "./render3d.js"
import { getInput } from "./browser.js"
import { init, update, draw, GameState } from "./game.js"
import { DebugMinimap } from "./debug_minimap.js"


const BACKBUFFER_W = Math.floor(1920 / 8);
const BACKBUFFER_H = Math.floor(1080 / 8);

window.onload = () => {
    
    const display = new Display();
    const backbuffer = new Backbuffer(BACKBUFFER_W, BACKBUFFER_H);
    const r3d = new Render3d();
    const gs: GameState = init();

    let lastTime: number = 0;
    const loop = (currentTime: number) => {

        drawMiniMap(gs);
        
        let dt: number = (currentTime - lastTime) / 1000;
        lastTime = currentTime;        

        update(gs, getInput(), dt);
        draw(gs, r3d, backbuffer);

        // Blit 3d scene
        display.draw(backbuffer);

        // Blit the debug stuff
        display.draw(DebugMinimap.getInstance().getCommands());
        DebugMinimap.getInstance().clearCommands();
        
        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    
};

function drawMiniMap(gs: GameState) {

    const mapWidth = gs.map.getWidth();
    const mapHeight = gs.map.getHeight();

    // Draw tilemap
    for (let y = 0; y < mapHeight; ++y) {
        for (let x = 0; x < mapWidth; ++x) {
            const textureIndex = gs.map.tiles[y][x] - 1;
            if (textureIndex >= 0) {
                const texture: HTMLImageElement = document.images[textureIndex];
                DebugMinimap.getInstance().drawImage(new Vector2(x, y), new Vector2(1, 1), texture);
            } else {
                const texture: HTMLImageElement = document.images[4];
                DebugMinimap.getInstance().drawImage(new Vector2(x, y), new Vector2(1, 1), texture);
            }

        }
    }

    // Draw grid
    const color = "rgba(128, 128, 128, 0.3)"
    for (let y = 0; y < mapHeight; ++y) {
        DebugMinimap.getInstance().drawLine(new Vector2(0, y), new Vector2(mapWidth, y), 0.06, color);
    }

    for (let x = 0; x < mapWidth; ++x) {
        DebugMinimap.getInstance().drawLine(new Vector2(x, 0), new Vector2(x, mapHeight), 0.06, color);
    }

}
