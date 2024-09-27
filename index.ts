
import { Vector2 } from "./vector2.js"
import { Display } from "./display.js"
import { Backbuffer, Texture } from "./backbuffer.js"

const MAP: Array<Array<number>> = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 3, 3, 3, 3, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 2, 2, 0, 2, 2, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const GRID_ROWS: number = MAP.length;
const GRID_COLS: number = MAP[0].length;

const SPRITES: Vector2[] = [
    new Vector2(1.5, 1.5),
    new Vector2(2.5, 1.5),
    new Vector2(3.5, 1.5),
    new Vector2(4.5, 1.5),

    new Vector2(GRID_COLS/2, GRID_ROWS/2),
    new Vector2(GRID_COLS/2-1, GRID_ROWS/2),
    new Vector2(GRID_COLS/2+1, GRID_ROWS/2),
    new Vector2(GRID_COLS/2, GRID_ROWS/2-1),
    new Vector2(GRID_COLS/2, GRID_ROWS/2+1),
]

const BACKBUFFER_W = Math.floor(1920 / 8);
const BACKBUFFER_H = Math.floor(1080 / 8)

const playerRad: number = 0.3;
const playerSpeed: number = 3;
const playerRotSpeed: number = 240;
let playerPos: Vector2 = new Vector2(GRID_COLS/2 - 2.5, GRID_ROWS/2 - 1);
let playerDir: Vector2 = new Vector2(1, 0);
let playerVel: Vector2 = new Vector2(0, 0);

let cameraFOV: number = 90;
let cameraNear: number = 1;
let cameraFar: number = 10;

const TEXTURES: Texture[] = [];

let spriteTextureIndex = 0;
let spriteTextureSpeed = 0.7;
let spriteTextureCurrentTime = 0;

async function loadTextures() {
    for (let index = 0; index < document.images.length; index++) {

        const texture: HTMLImageElement = document.images[index];

        const canvas = new OffscreenCanvas(texture.width, texture.height);
        const ctx = canvas.getContext("2d");
        if (ctx === null) throw new Error("2d canvas is not supported");
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
        TEXTURES.push(result);
    }
    
}

type Hit = {
    result: boolean,
    t: number,
    texture: (Texture|undefined),
    isVertical: boolean,
};

function calculateNearIntersection(pos: Vector2, dir: Vector2): Hit {

    const dx = dir.x;
    const dy = dir.y;

    let stepX = 0;
    let stepY = 0;

    let mapX = Math.floor(pos.x);
    let mapY = Math.floor(pos.y);
    
    let edgeX: number;
    if (dx < 0) {
        edgeX = Math.floor(pos.x);
        stepX = -1;
    } else if(dx > 0){
        edgeX = Math.ceil(pos.x);
        if(pos.x === edgeX) edgeX += 1;
        stepX = 1;
    } else {
        edgeX = pos.x;
    }

    let edgeY: number;
    if (dy < 0) {
        edgeY = Math.floor(pos.y);
        stepY = -1;
    } else if (dy > 0) {
        edgeY = Math.ceil(pos.y);
        if(pos.y === edgeY) edgeY += 1;
        stepY = 1;
    } else {
        edgeY = pos.y;
    }
    
    for(;;) {
        let tx: number = Infinity;
        if (dx !== 0) {
            tx = (edgeX - pos.x) / dx;

        }
        let ty: number = Infinity;
        if (dy !== 0) {
            ty = (edgeY - pos.y) / dy;
        }
        
        let t = 0;
        let isVertical = false;

        if (tx < ty) {
            edgeX += stepX;
            mapX += stepX;
            t = tx;
        } else {
            edgeY += stepY;
            mapY += stepY;
            t = ty;
            isVertical = true;
        }

        if(mapY < 0 || mapY >= GRID_ROWS || mapX < 0 || mapX >= GRID_COLS) {
            return { result: false, t: 0, texture: TEXTURES[0], isVertical: false };
        }
        
        const mapIndex = MAP[mapY][mapX];
        if (mapIndex !== undefined &&  mapIndex !== 0) {
            return { result: true, t, texture: TEXTURES[mapIndex - 1], isVertical };
        }
    }
}

function halfPlaneDir(): Vector2 {
    const halfFovRad: number = (cameraFOV / 2) * Math.PI / 180;
    const planeHalfLength: number = cameraNear * Math.tan(halfFovRad);
    const planeDir = playerDir.perp().norm().scale(planeHalfLength);
    return planeDir;
}

function easeInExpo(x: number): number {
    return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}

function calculateFog(distance:number): { color: number, t: number } {
    const fogColor = 0xff88bb88;
    //const fogT = Math.max(Math.min((hitDir.length() - (cameraFar - fogStart)) / cameraFar, 1) , 0);
    const t = Math.max(Math.min(distance / cameraFar, 1), 0);
    const fogT = t*t * (3 - 2 * t);
    return {
        color: fogColor,
        t: fogT
    };
}

function drawFloor(backbuffer: Backbuffer) {
    const yStart: number = Math.floor(backbuffer.height/2+1);
    const cameraPosY: number = Math.floor(backbuffer.height/2);

    const p1: Vector2 = playerDir.sub(halfPlaneDir());
    const p2: Vector2 = playerDir.add(halfPlaneDir());

    const floorTexture: Texture = TEXTURES[4];
    const ceilTexture: Texture = TEXTURES[4];
    
    for(let y = yStart; y < backbuffer.height; ++y) {
        const posY = cameraPosY - y;
        const distance = Math.abs(cameraPosY / posY);

        for(let x = 0; x < backbuffer.width; ++x) {
            const t = x / (backbuffer.width - 1);
            const floor = playerPos.add(Vector2.lerp(p1, p2, t).scale(distance));
            
            const tx: number = Math.floor((floor.x - Math.floor(floor.x)) * floorTexture.width);
            const ty: number = Math.floor((floor.y - Math.floor(floor.y)) * floorTexture.height);

            const fog = calculateFog(distance);

            {
                const fogT = fog.t;
                const fogColor = fog.color;
                const srcColor: number = floorTexture.pixels[ty * floorTexture.width + tx];

                const dr = ((fogColor >> 16) & 0xff);
                const dg = ((fogColor >> 8) & 0xff);
                const db = ((fogColor >> 0) & 0xff);

                const sr = ((srcColor >> 16) & 0xff);
                const sg = ((srcColor >> 8) & 0xff);
                const sb = ((srcColor >> 0) & 0xff);

                const r = Math.floor(sr * (1 - fogT) + dr * fogT);
                const g = Math.floor(sg * (1 - fogT) + dg * fogT);
                const b = Math.floor(sb * (1 - fogT) + db * fogT);

                let color = (0xff << 24) | (r << 16) | (g << 8) | (b);

                backbuffer.buffer[y * backbuffer.width + x] = color;
            }
            
            {                
                const fogT = fog.t;
                const fogColor = fog.color;
                const srcColor: number = ceilTexture.pixels[ty * ceilTexture.width + tx];

                const dr = ((fogColor >> 16) & 0xff);
                const dg = ((fogColor >> 8) & 0xff);
                const db = ((fogColor >> 0) & 0xff);

                const sr = ((srcColor >> 16) & 0xff);
                const sg = ((srcColor >> 8) & 0xff);
                const sb = ((srcColor >> 0) & 0xff);

                const r = Math.floor(sr * (1 - fogT) + dr * fogT);
                const g = Math.floor(sg * (1 - fogT) + dg * fogT);
                const b = Math.floor(sb * (1 - fogT) + db * fogT);

                let color = (0xff << 24) | (r << 16) | (g << 8) | (b);

                const ceilingY: number = (backbuffer.height - y - 1);
                backbuffer.buffer[ceilingY * backbuffer.width + x] = color;
            }
        }        
    }
}

function drawSprites(backbuffer: Backbuffer) {

    // Sort srites
    SPRITES.sort((a, b) => {
        const distanceToA = playerPos.sub(a).length();
        const distanceToB = playerPos.sub(b).length(); 
        return distanceToB - distanceToA;
    });
    
    // Draw sprites
    const halfCameraPlane = halfPlaneDir();
    const p0 = playerDir.sub(halfCameraPlane);
    const p1 = playerDir.add(halfCameraPlane);
    const cameraPlane = p1.sub(p0);
    const cameraPlaneNorm = cameraPlane.norm();
    const cameraPlaneLen = cameraPlane.length();

    const near = playerDir.norm().scale(cameraNear);
    const nearLen = near.length();

    const spriteTextureBase = 5;
    const spriteTexture: Texture = TEXTURES[spriteTextureBase + spriteTextureIndex];
    
    SPRITES.forEach((sprite) => {
        const spritePos: Vector2 = sprite;

        const a = spritePos.sub(playerPos);
        const aLen = a.length();

        const denom = a.dot(near);
        if (denom > 0) {

            const cLen: number = (aLen * nearLen * nearLen) / denom;
            const c = a.norm().scale(cLen);

            const t: number = c.sub(p0).dot(cameraPlaneNorm) / cameraPlaneLen;
            const z = a.dot(playerDir.norm());
            
            const spriteDim = Math.floor(backbuffer.height*0.25/z);
            const y = Math.floor(backbuffer.height/2 - spriteDim / 2) + Math.floor((backbuffer.height/2) /z) - Math.floor(spriteDim/2);
            const screenX = Math.floor(t * (backbuffer.width - 1));
            const startX = screenX - Math.floor(spriteDim / 2);
            const endX = screenX + Math.floor(spriteDim / 2);

            for(let index = startX; index <= endX; ++index) {

                if(index < 0 || index >= backbuffer.width) continue;
                if(z >= backbuffer.zBuffer[index]) continue;

                const samplePosX = (index - startX) / (endX - startX);
  
                const srcX = Math.round(samplePosX * (spriteTexture.width - 1));
                const srcY = 0;
                const srcW = 1;
                const srcH = spriteTexture.height;

                const fog = calculateFog(z);
                
                backbuffer.drawTexture(spriteTexture, srcX, srcY, srcW, srcH, index, y, 1, spriteDim, false, fog.color, fog.t);

            }

        }
    });

}

function drawMap3d(backbuffer: Backbuffer) {

    const rayAmount = backbuffer.width;

    for (let index = 0; index < rayAmount; ++index) {
        const rayFactor: number = ((index / (rayAmount - 1)) * 2 - 1);
        const rayDir: Vector2 = playerDir.add(halfPlaneDir().scale(rayFactor)).norm();
        const hit = calculateNearIntersection(playerPos, rayDir);

        if (hit.result === true && hit.texture !== undefined) {

            const hitDir: Vector2 = rayDir.scale(hit.t);
            const hitPos: Vector2 = playerPos.add(hitDir);
            const z = hitDir.dot(playerDir.norm());

            backbuffer.zBuffer[index] = z;
            
            const height = Math.floor(backbuffer.height / z);
            const y = Math.floor((backbuffer.height / 2) - (height / 2));

            let samplePosX = 0;

            if (hit.isVertical) {
                samplePosX = hitPos.x - Math.floor(hitPos.x);
            } else {
                samplePosX = hitPos.y - Math.floor(hitPos.y);
            }
            
            const srcX = Math.round(samplePosX * (hit.texture.width - 1));
            const srcY = 0;
            const srcW = 1;
            const srcH = hit.texture.height;
            const fog = calculateFog(z);
            backbuffer.drawTexture(hit.texture, srcX, srcY, srcW, srcH, index, y, 1, height, hit.isVertical, fog.color, fog.t);
        }
    }
}

function drawMiniMap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    
    const startX = x;
    const startY = y;
    const tileDim = w / GRID_COLS;

    // Draw tilemap
    
    for (let y = 0; y < GRID_ROWS; ++y) {
        for (let x = 0; x < GRID_COLS; ++x) {
            const textureIndex = MAP[y][x] - 1;
            if (textureIndex >= 0) {
                const texture: HTMLImageElement = document.images[textureIndex];
                ctx.drawImage(texture, startX + x * tileDim, startY + y * tileDim, tileDim, tileDim);
            } else {
                const texture: HTMLImageElement = document.images[4];
                ctx.drawImage(texture, startX + x * tileDim, startY + y * tileDim, tileDim, tileDim);
            }

        }
    }

    let newPlayerPos: Vector2 = playerPos.add(playerVel);

    const cellX = Math.floor(playerPos.x);
    const cellY = Math.floor(playerPos.y);
    const targetCellX = Math.floor(newPlayerPos.x);
    const targetCellY = Math.floor(newPlayerPos.y);

    const offset = Math.ceil(playerRad);
    
    const minX = Math.max(Math.min(cellX, targetCellX) - offset, 0);
    const maxX = Math.min(Math.max(cellX, targetCellX) + offset, GRID_COLS-1);

    const minY = Math.max(Math.min(cellY, targetCellY) - offset, 0);
    const maxY = Math.min(Math.max(cellY, targetCellY) + offset, GRID_ROWS-1);

    ctx.fillStyle = "rgb(0, 0, 255, 0.3)"
    ctx.fillRect(minX*tileDim, minY*tileDim, (maxX - minX + 1)*tileDim, (maxY - minY + 1)*tileDim)

    // Draw grid

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"
    for (let y = 0; y < GRID_ROWS; ++y) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + y * tileDim);
        ctx.lineTo(startX + GRID_COLS * tileDim, startY + y * tileDim);
        ctx.stroke();
    }

    for (let x = 0; x < GRID_COLS; ++x) {
        ctx.beginPath();
        ctx.moveTo(startX + x * tileDim, startY);
        ctx.lineTo(startX + x * tileDim, startY + GRID_ROWS * tileDim);
        ctx.stroke();
    }

    const screenPlayerPos = new Vector2(startX, startY).add(playerPos.scale(tileDim));

    // Draw rays
    const rayAmount = 20;

    for (let index = 0; index < rayAmount; ++index) {

        const rayFactor: number = (index / (rayAmount - 1)) * 2 - 1;
        const rayDir: Vector2 = playerDir.add(halfPlaneDir().scale(rayFactor)).norm();
        const hit = calculateNearIntersection(playerPos, rayDir);

        if (hit.result === true) {
            const hitDir: Vector2 = rayDir.scale(hit.t);
            const hitPos: Vector2 = playerPos.add(hitDir);
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
    ctx.arc(screenPlayerPos.x, screenPlayerPos.y, playerRad*tileDim, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw player vel
    const playerSreenVelPos = screenPlayerPos.add(playerVel.scale(tileDim));
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

function update(dt: number) { 

    playerVel = new Vector2(0, 0);
    
    if (keyboard.keyW === true) {
        playerVel = playerVel.add(playerDir.scale(1));
    }
    
    if (keyboard.keyS === true) {
        playerVel = playerVel.add(playerDir.scale(-1));
    }

    if (keyboard.keyA === true) {
        playerVel = playerVel.add(playerDir.perp().scale(-1));
    }

    if (keyboard.keyD === true) {
        playerVel = playerVel.add(playerDir.perp().scale(1));
    }

    playerVel = playerVel.norm().scale(playerSpeed * dt);
    
    if (keyboard.keyLeft === true) {
        playerDir = playerDir.rotate(-playerRotSpeed * dt);
        playerVel = playerVel.rotate(-playerRotSpeed * dt);
    }
    if (keyboard.keyRight === true) {
        playerDir = playerDir.rotate(playerRotSpeed * dt);
        playerVel = playerVel.rotate(playerRotSpeed * dt);
    }

    let newPlayerPos: Vector2 = playerPos.add(playerVel);

    const cellX = Math.floor(playerPos.x);
    const cellY = Math.floor(playerPos.y);
    const targetCellX = Math.floor(newPlayerPos.x);
    const targetCellY = Math.floor(newPlayerPos.y);

    const offset = Math.ceil(playerRad);
    
    const minX = Math.max(Math.min(cellX, targetCellX) - offset, 0);
    const maxX = Math.min(Math.max(cellX, targetCellX) + offset, GRID_COLS - 1);
    const minY = Math.max(Math.min(cellY, targetCellY) - offset, 0);
    const maxY = Math.min(Math.max(cellY, targetCellY) + offset, GRID_ROWS - 1);

    for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {

            if(MAP[y][x] > 0) {
                const closestPoint: Vector2 = new Vector2(
                    Math.min(Math.max(x, newPlayerPos.x), x + 1),
                    Math.min(Math.max(y, newPlayerPos.y), y + 1),
                );

                const rayToClosest = closestPoint.sub(newPlayerPos);
                let overlap = playerRad - rayToClosest.length();

                if (overlap > 0) {
                    newPlayerPos = newPlayerPos.add(rayToClosest.norm().scale(-overlap));
                }

            }
            
        }
    }
    
    playerPos = newPlayerPos;

    // NOTE: Update sprite animation
    const timePerImage = spriteTextureSpeed / 5;
    spriteTextureIndex = Math.floor(spriteTextureCurrentTime / timePerImage) % 5;
    spriteTextureCurrentTime += dt;
}

function draw(display: Display, backbuffer: Backbuffer) {

    backbuffer.clear(0xff774444);
    drawFloor(backbuffer);
    drawMap3d(backbuffer);
    drawSprites(backbuffer);
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
    
    console.log("Welcome to my raycasting GAME!");
    loadTextures();
    
    canvas.style.backgroundColor = "#444444";

    const display = new Display();
    const backbuffer = new Backbuffer(BACKBUFFER_W, BACKBUFFER_H);
    
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
        update(dt);
        draw(display, backbuffer);

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    
};
