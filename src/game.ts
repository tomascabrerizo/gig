import { Vector2 } from "./vector2.js"
import { Backbuffer, Texture } from "./backbuffer.js"
import { DrawCommand } from "./render2d.js"
import { Render3d, Sprite, createCoin, createSprite } from "./render3d.js"
import { Map } from "./map.js"
import { DebugMinimap } from "./debug_minimap.js"
import { Input, loadTextures } from "./browser.js"

export type GameState = {
    playerRad: number;
    playerSpeed: number;
    playerRotSpeed: number;
    playerPos: Vector2;
    playerDir: Vector2;
    playerVel: Vector2;

    cameraFOV: number;
    cameraNear: number;
    cameraFar: number;

    textures: Texture[];
    sprites: Sprite[];
    map: Map;
    drawCommands2d: DrawCommand[];
    gunTextureIndex: number;

}

export function init(): GameState {
    const map = new Map();
    const textures: Texture[] = loadTextures();

    return {
        playerRad: 0.3,
        playerSpeed: 3,
        playerRotSpeed: 240,
        playerPos: new Vector2(map.getWidth() / 2 - 2.5, map.getHeight() / 2 - 1),
        playerDir: new Vector2(1, 0),
        playerVel: new Vector2(0, 0),

        cameraFOV: 90,
        cameraNear: 1,
        cameraFar: 7,

        textures,
        sprites: [
            createCoin(new Vector2(1.5, 1.5), textures),
            createCoin(new Vector2(2.5, 1.5), textures),
            createCoin(new Vector2(3.5, 1.5), textures),
            createCoin(new Vector2(4.5, 1.5), textures),

            createSprite(new Vector2(map.getWidth() / 2, map.getHeight() / 2), textures[11], 0.5, 0),
            createSprite(new Vector2(map.getWidth() / 2, map.getHeight() / 2 + 1), textures[12], 0.5, 0),
            createSprite(new Vector2(map.getWidth() / 2, map.getHeight() / 2 - 1), textures[13], 0.5, 0),

            createSprite(new Vector2(map.getWidth() - 3, map.getHeight() - 3), textures[14], 1, 0.5),

        ],
        map,
        drawCommands2d: [],
        gunTextureIndex: 15,
    };
    
}

export function update(gs: GameState, input: Input, dt: number) {

    const keyboard = input.keyboard;
    const mouse = input.mouse;
    const sensitivity = 0.1;
    
    gs.playerDir = gs.playerDir.rotate(mouse.relX*sensitivity);
    
    if(keyboard.keySpace === true) {
        gs.gunTextureIndex = 16;
    } else {
        gs.gunTextureIndex = 15;
    }
    
    gs.playerVel = new Vector2(0, 0);
    
    if (keyboard.keyW === true) {
        gs.playerVel = gs.playerVel.add(gs.playerDir.scale(1));
    }

    if (keyboard.keyS === true) {
        gs.playerVel = gs.playerVel.add(gs.playerDir.scale(-1));
    }

    if (keyboard.keyA === true) {
        gs.playerVel = gs.playerVel.add(gs.playerDir.perp().scale(-1));
    }

    if (keyboard.keyD === true) {
        gs.playerVel = gs.playerVel.add(gs.playerDir.perp().scale(1));
    }

    gs.playerVel = gs.playerVel.norm().scale(gs.playerSpeed * dt);

    if (keyboard.keyLeft === true) {
        gs.playerDir = gs.playerDir.rotate(-gs.playerRotSpeed * dt);
        gs.playerVel = gs.playerVel.rotate(-gs.playerRotSpeed * dt);
    }
    if (keyboard.keyRight === true) {
        gs.playerDir = gs.playerDir.rotate(gs.playerRotSpeed * dt);
        gs.playerVel = gs.playerVel.rotate(gs.playerRotSpeed * dt);
    }
    
    let newPlayerPos: Vector2 = gs.playerPos.add(gs.playerVel);

    const cellX = Math.floor(gs.playerPos.x);
    const cellY = Math.floor(gs.playerPos.y);
    const targetCellX = Math.floor(newPlayerPos.x);
    const targetCellY = Math.floor(newPlayerPos.y);

    const offset = Math.ceil(gs.playerRad);

    const minX = Math.max(Math.min(cellX, targetCellX) - offset, 0);
    const maxX = Math.min(Math.max(cellX, targetCellX) + offset, gs.map.getWidth() - 1);
    const minY = Math.max(Math.min(cellY, targetCellY) - offset, 0);
    const maxY = Math.min(Math.max(cellY, targetCellY) + offset, gs.map.getHeight() - 1);

    DebugMinimap.getInstance().drawRect(new Vector2(minX, minY), new Vector2((maxX - minX + 1), (maxY - minY + 1)), "rgb(0, 0, 255, 0.3)");

    for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {

            if (gs.map.tiles[y][x] > 0) {
                const closestPoint: Vector2 = new Vector2(
                    Math.min(Math.max(x, newPlayerPos.x), x + 1),
                    Math.min(Math.max(y, newPlayerPos.y), y + 1),
                );

                const rayToClosest = closestPoint.sub(newPlayerPos);
                let overlap = gs.playerRad - rayToClosest.length();

                if (overlap > 0) {
                    newPlayerPos = newPlayerPos.add(rayToClosest.norm().scale(-overlap));
                }

            }

        }
    }

    gs.playerPos = newPlayerPos;

    DebugMinimap.getInstance().drawCircle(gs.playerPos, gs.playerRad, "yellow");
    DebugMinimap.getInstance().drawLine(gs.playerPos, gs.playerPos.add(gs.playerDir), 0.1, "red");

    gs.sprites.forEach((sprite) => {
        if (sprite.textures.length <= 1) return;
        const timePerImage = sprite.speed / 5;
        sprite.index = Math.floor(sprite.currentTime / timePerImage) % sprite.textures.length;
        sprite.currentTime += dt;
    });
}

export function draw(gs: GameState, r3d: Render3d, backbuffer: Backbuffer) {
    backbuffer.clear(0xff774444);
    r3d.drawFloor(gs, backbuffer);
    r3d.drawMap3d(gs, backbuffer);
    r3d.drawSprites(gs, backbuffer);
    
    let gunTexture = gs.textures[gs.gunTextureIndex];    
    const screenGunW = 120;
    const screenGunH = 50;
    const screenGunX = Math.floor(backbuffer.width/2 - screenGunW/2);
    const screenGunY = Math.floor(backbuffer.height - screenGunH);
    backbuffer.drawTexture(gunTexture, 0, 0, gunTexture.width, gunTexture.height, screenGunX, screenGunY, screenGunW, screenGunH);

    backbuffer.draw();
}
