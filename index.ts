
import { Vector2 } from "./vector2.js"
import { Display } from "./display.js"
import { Backbuffer, Texture } from "./backbuffer.js"
import { Map } from "./map.js"
import { Render3d, Sprite, createCoin, createSprite } from "./render3d.js"

const BACKBUFFER_W = Math.floor(1920 / 8);
const BACKBUFFER_H = Math.floor(1080 / 8);

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
}

function loadTextures(): Texture[] {
    const textures: Texture[] = [];
    
    for (let index = 0; index < document.images.length; index++) {

        const texture: HTMLImageElement = document.images[index];

        const canvas = new OffscreenCanvas(texture.width, texture.height);
        const ctx = canvas.getContext("2d");
        if (ctx === null) throw new Error("2d canvas is not supported");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(texture, 0, 0);

        const textureData: ImageData = ctx.getImageData(0, 0, texture.width, texture.height);
        const textureBuffer: ArrayBuffer = new ArrayBuffer(texture.width * texture.height * 4);
        const textureBuffer32: Uint32Array = new Uint32Array(textureBuffer);
        textureBuffer32.set(new Uint32Array(textureData.data.buffer));

        const result = {
            pixels: textureBuffer32,
            width: texture.width,
            height: texture.height
        };
        textures.push(result);
    }

    return textures;
}


function drawMiniMap(gs: GameState, r3d: Render3d, ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {

    const mapWidth = gs.map.getWidth();
    const mapHeight = gs.map.getHeight();
    
    const startX = x;
    const startY = y;
    const tileDim = w / mapWidth;
    
    // Draw tilemap
    for (let y = 0; y < mapHeight; ++y) {
        for (let x = 0; x < mapWidth; ++x) {
            const textureIndex = gs.map.tiles[y][x] - 1;
            if (textureIndex >= 0) {
                const texture: HTMLImageElement = document.images[textureIndex];
                ctx.drawImage(texture, startX + x * tileDim, startY + y * tileDim, tileDim, tileDim);
            } else {
                const texture: HTMLImageElement = document.images[4];
                ctx.drawImage(texture, startX + x * tileDim, startY + y * tileDim, tileDim, tileDim);
            }

        }
    }

    let newPlayerPos: Vector2 = gs.playerPos.add(gs.playerVel);

    const cellX = Math.floor(gs.playerPos.x);
    const cellY = Math.floor(gs.playerPos.y);
    const targetCellX = Math.floor(newPlayerPos.x);
    const targetCellY = Math.floor(newPlayerPos.y);

    const offset = Math.ceil(gs.playerRad);
    
    const minX = Math.max(Math.min(cellX, targetCellX) - offset, 0);
    const maxX = Math.min(Math.max(cellX, targetCellX) + offset, mapWidth-1);

    const minY = Math.max(Math.min(cellY, targetCellY) - offset, 0);
    const maxY = Math.min(Math.max(cellY, targetCellY) + offset, mapHeight-1);

    ctx.fillStyle = "rgb(0, 0, 255, 0.3)"
    ctx.fillRect(minX*tileDim, minY*tileDim, (maxX - minX + 1)*tileDim, (maxY - minY + 1)*tileDim)

    // Draw grid

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"
    for (let y = 0; y < mapHeight; ++y) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + y * tileDim);
        ctx.lineTo(startX + mapWidth * tileDim, startY + y * tileDim);
        ctx.stroke();
    }

    for (let x = 0; x < mapWidth; ++x) {
        ctx.beginPath();
        ctx.moveTo(startX + x * tileDim, startY);
        ctx.lineTo(startX + x * tileDim, startY + mapHeight * tileDim);
        ctx.stroke();
    }

    const screenPlayerPos = new Vector2(startX, startY).add(gs.playerPos.scale(tileDim));

    // Draw rays
    const rayAmount = 20;

    for (let index = 0; index < rayAmount; ++index) {

        const rayFactor: number = (index / (rayAmount - 1)) * 2 - 1;
        const rayDir: Vector2 = gs.playerDir.add(r3d.halfPlaneDir(gs).scale(rayFactor)).norm();
        const hit = r3d.calculateNearIntersection(gs, gs.playerPos, rayDir);

        if (hit.result === true) {
            const hitDir: Vector2 = rayDir.scale(hit.t);
            const hitPos: Vector2 = gs.playerPos.add(hitDir);
            const screenHitPos: Vector2 = new Vector2(startX, startY).add(hitPos.scale(tileDim));

            // Draw ray
            ctx.strokeStyle = "yellow"
            ctx.beginPath();
            ctx.moveTo(screenPlayerPos.x, screenPlayerPos.y);
            ctx.lineTo(screenHitPos.x, screenHitPos.y);
            ctx.stroke();

            // Draw hit position
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(screenHitPos.x, screenHitPos.y, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    
    }
    
    // Draw player    
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(screenPlayerPos.x, screenPlayerPos.y, gs.playerRad*tileDim, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw player vel
    const playerSreenVelPos = screenPlayerPos.add(gs.playerVel.scale(tileDim));
    ctx.strokeStyle = "red"
    ctx.beginPath();
    ctx.moveTo(screenPlayerPos.x, screenPlayerPos.y);
    ctx.lineTo(playerSreenVelPos.x, playerSreenVelPos.y);
    ctx.stroke();
    
}

type Keyboard = {
    keyW: boolean,
    keyS: boolean,
    keyA: boolean,
    keyD: boolean,
    keyRight: boolean,
    keyLeft: boolean,
};

let keyboard: Keyboard = { keyW: false, keyS: false, keyA: false, keyD: false,  keyRight: false, keyLeft: false};

function update(gs: GameState, dt: number) { 

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

    for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {

            if(gs.map.tiles[y][x] > 0) {
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
    
    gs.sprites.forEach((sprite) => {
        if(sprite.textures.length <= 1) return;
        const timePerImage = sprite.speed / 5;
        sprite.index = Math.floor(sprite.currentTime / timePerImage) % sprite.textures.length;
        sprite.currentTime += dt;
    });


}

function draw(gs: GameState, r3d: Render3d, backbuffer: Backbuffer, display: Display) {

    backbuffer.clear(0xff774444);
    r3d.drawFloor(gs, backbuffer);
    r3d.drawMap3d(gs, backbuffer);
    r3d.drawSprites(gs, backbuffer);
    backbuffer.draw();

    display.draw(backbuffer);

    // drawMiniMap(ctx, 0, 0, 200);
}

window.onload = () => {
    
    const canvas = document.getElementById("canvas") as (HTMLCanvasElement | null);
    if (canvas === null) {
        throw new Error("cannot find canvas with id 'canvas'");
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true }) as (CanvasRenderingContext2D | null);
    if (ctx === null) {
        throw new Error("2d context is not supported");
    }

    const map = new Map();
    const textures: Texture[] = loadTextures();
    
    const gs: GameState = {
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
            createSprite(new Vector2(map.getWidth() / 2, map.getHeight() / 2+1), textures[12], 0.5, 0),
            createSprite(new Vector2(map.getWidth() / 2, map.getHeight() / 2-1), textures[13], 0.5, 0),

            createSprite(new Vector2(map.getWidth() - 3, map.getHeight() - 3), textures[14], 1, 0.5),

        ],
        map,
    };
    
    const display = new Display();
    const backbuffer = new Backbuffer(BACKBUFFER_W, BACKBUFFER_H);
    const r3d = new Render3d();
    
    window.addEventListener("keydown", (event) => {
        if(event.key === "w") {
            keyboard.keyW = true;
        }
        if(event.key === "s") {
            keyboard.keyS = true;
        }
        if(event.key === "a") {
            keyboard.keyA = true;
        }
        if(event.key === "d") {
            keyboard.keyD = true;
        }
        if(event.key === "ArrowLeft") {
            keyboard.keyLeft = true;
        }
        if(event.key == "ArrowRight") {
            keyboard.keyRight = true;
        }
    });

    window.addEventListener("keyup", (event) => {
        if (event.key === "w") {
            keyboard.keyW = false;
        }
        if (event.key === "s") {
            keyboard.keyS = false;
        }
        if (event.key === "a") {
            keyboard.keyA = false;
        }
        if (event.key === "d") {
            keyboard.keyD = false;
        }
        if (event.key === "ArrowLeft") {
            keyboard.keyLeft = false;
        }
        if (event.key == "ArrowRight") {
            keyboard.keyRight = false;
        }
    });

    let lastTime: number = 0;
    
    const loop = (currentTime: number) => {

        let dt: number = (currentTime - lastTime) / 1000;
        lastTime = currentTime;        
        update(gs, dt);
        draw(gs, r3d, backbuffer, display);

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    
};
