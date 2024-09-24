
class Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    scale(value: number): Vector2 {
        return new Vector2(this.x * value, this.y * value);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    norm(): Vector2 {
        const length = this.length();
        if (length === 0) return new Vector2(0, 0);
        const invLength = 1.0 / length;
        return new Vector2(this.x * invLength, this.y * invLength);
    }

    perp(): Vector2 {
        return new Vector2(-this.y, this.x);
    }

    rotate(angle: number): Vector2 {
        const rad = angle * Math.PI / 180;
        return new Vector2(
            this.x * Math.cos(rad) - this.y * Math.sin(rad),
            this.x * Math.sin(rad) + this.y * Math.cos(rad),
        );
    }

    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }

    static lerp(a: Vector2, b: Vector2, t: number) {
        return a.scale(1-t).add(b.scale(t));
    }
    
    static angleBetween(a: Vector2, b: Vector2) {
        return Math.acos(a.dot(b) / (a.length() * b.length()));
    }

};

type Texture = {
    pixels: Uint32Array,
    width: number,
    height: number,
}

const MAP: Array<Array<number>> = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 2, 0, 3, 0, 1, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 2, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 3, 3, 3, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 4, 0, 4, 0, 0, 0, 1],
    [1, 0, 0, 4, 0, 0, 4, 0, 0, 1],
    [1, 0, 0, 4, 0, 0, 4, 0, 0, 1],
    [1, 0, 0, 4, 0, 0, 4, 0, 0, 1],
    [1, 0, 0, 0, 4, 4, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];



const GRID_ROWS: number = MAP.length;
const GRID_COLS: number = MAP[0].length;

const MAP_COLORS: string[] = [
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ff00ff",
    "#00ffff"
];

const downSampleFactor = 1 / 4;

const SCREEN_WIDTH: number = 1920 / 2
const SCREEN_HEIGHT: number = 1080 / 2

const playerRad: number = 0.3;
const playerSpeed: number = 2;
const playerRotSpeed: number = 180;
let playerPos: Vector2 = new Vector2(GRID_COLS/2 - 3, GRID_ROWS/2 - 1);
let playerDir: Vector2 = new Vector2(1, 0);
let playerVel: Vector2 = new Vector2(0, 0);

let cameraFOV: number = 90;
let cameraNear: number = 1;

const TEXTURES: Texture[] = [];

class Backbuffer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    imageData: ImageData;
    buffer: Uint32Array;

    width: number;
    height: number;
 
    constructor(canvas: HTMLCanvasElement, width: number, height: number) {

        this.canvas = canvas;
        const ctx = canvas.getContext("2d", { willReadFrequently: true }) as (CanvasRenderingContext2D | null);
        if (ctx === null) {
            throw new Error("2d context is not supported");
        }
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;

        this.imageData = ctx.getImageData(0, 0, width, height);
        this.buffer = new Uint32Array(this.imageData.data.buffer);
        this.width = width;
        this.height = height;

        const saveCanvasWidth = canvas.width;
        const saveCanvasHeight = canvas.height;

        for (let index = 0; index < document.images.length; index++) {

            const texture: HTMLImageElement = document.images[index];

            canvas.width = texture.width;
            canvas.height = texture.height;
            this.ctx.drawImage(texture, 0, 0)

            const textureData: ImageData = this.ctx.getImageData(0, 0, texture.width, texture.height);
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

        canvas.width = saveCanvasWidth;
        canvas.height = saveCanvasHeight;
        
    }

    draw() {
        this.ctx.reset();
        this.ctx.putImageData(this.imageData, 0, 0);
        this.ctx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, this.canvas.width, this.canvas.height);
    }

    clear(color: number) {
        this.buffer.fill(color);
    }

    drawRect(x: number, y: number, w: number, h: number, color: number) {
        let minX = x;
        let maxX = minX + (w - 1);
        let minY = y;
        let maxY = minY + (h - 1);

        if (minX < 0) minX = 0;
        if (maxX >= this.width) maxX = (this.width - 1);
        if (minY < 0) minY = 0;
        if (maxY >= this.height) maxY = (this.height - 1);

        for (let offsetY: number = minY; offsetY <= maxY; ++offsetY) {
            for (let offsetX: number = minX; offsetX <= maxX; ++offsetX) {
                this.buffer[offsetY * this.width + offsetX] = color;
            }
        }
    }

    putTexture(texture: Texture) {
        for (let y = 0; y < texture.height; ++y) {
            for (let x = 0; x < texture.width; ++x) {
                this.buffer[y * this.width + x] = texture.pixels[y * texture.width + x];
            }
        }
    }

    drawTexture(texture: Texture,
        srcX: number, srcY: number, srcW: number, srcH: number,
        desX: number, desY: number, desW: number, desH: number,
        vertical?: boolean) {

        let minX = desX;
        let maxX = minX + (desW - 1);
        let minY = desY;
        let maxY = minY + (desH - 1);

        let offsetX: number = 0;
        let offsetY: number = 0;

        if (minX < 0) {
            offsetX = -minX;
            minX = 0;
        }
        if (maxX >= this.width) {
            maxX = (this.width - 1);
        }

        if (minY < 0) {
            offsetY = -minY;
            minY = 0;
        }
        if (maxY >= this.height) {
            maxY = (this.height - 1);
        }

        for (let y = minY; y <= maxY; ++y) {

            const ty = ((y - minY) + offsetY) / desH;
            for (let x = minX; x <= maxX; ++x) {
                const tx = ((x - minX) + offsetX) / desW;

                const srcOffsetX = srcX + Math.floor(tx * srcW);
                const srcOffsetY = srcY + Math.floor(ty * srcH);
                const desOffsetX = x;
                const desOffsetY = y;

                let srcColor = texture.pixels[srcOffsetY * texture.width + srcOffsetX];

                if (vertical === true) {
                    const scale = 0.4;
                    const r = ((srcColor >> 16) & 0xff) * scale;
                    const g = ((srcColor >> 8) & 0xff) * scale;
                    const b = ((srcColor >> 0) & 0xff) * scale;
                    srcColor = (0xff << 24) | (r << 16) | (g << 8) | (b);
                }

                this.buffer[desOffsetY * this.width + desOffsetX] = srcColor;
            }
        }
    }
};

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
    
    let maxSteps = 20;
    while (maxSteps > 0) {
        maxSteps = maxSteps - 1;

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

        const mapIndex = MAP[mapY][mapX];
        if (mapIndex !== undefined &&  mapIndex !== 0) {
            return { result: true, t, texture: TEXTURES[mapIndex - 1], isVertical };
        }
    }

    return { result: false, t: 0, texture: TEXTURES[0], isVertical: false };
}

function halfPlaneDir(): Vector2 {
    const halfFovRad: number = (cameraFOV / 2) * Math.PI / 180;
    const planeHalfLength: number = cameraNear * Math.tan(halfFovRad);
    const planeDir = playerDir.perp().norm().scale(planeHalfLength);
    return planeDir;
}

function drawFloor(backbuffer: Backbuffer) {
    const yStart: number = Math.floor(backbuffer.height/2+1);
    const cameraPosY: number = Math.floor(backbuffer.height/2);

    const p1: Vector2 = playerDir.sub(halfPlaneDir());
    const p2: Vector2 = playerDir.add(halfPlaneDir());

    const floorTexture: Texture = TEXTURES[4];
    
    for(let y = yStart; y < backbuffer.height; ++y) {
        const posY = cameraPosY - y;
        const distance = Math.abs(cameraPosY / posY);

        for(let x = 0; x < backbuffer.width; ++x) {
            const t = x / (backbuffer.width - 1);
            const floor = playerPos.add(Vector2.lerp(p1, p2, t).scale(distance));
            
            const tx: number = Math.floor((floor.x - Math.floor(floor.x)) * floorTexture.width);
            const ty: number = Math.floor((floor.y - Math.floor(floor.y)) * floorTexture.height);

            const color: number = floorTexture.pixels[ty * floorTexture.width + tx];
            backbuffer.buffer[y * backbuffer.width + x] = color;

            const ceilingY: number = (backbuffer.height - y - 1);
            backbuffer.buffer[ceilingY * backbuffer.width + x] = color;
        }        
    }
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
            
            const height = Math.floor(backbuffer.height / z);
            const y = Math.floor((backbuffer.height / 2) - (height / 2));

            let samplePosX = 0;

            if (hit.isVertical) {
                samplePosX = hitPos.x - Math.floor(hitPos.x);
            } else {
                samplePosX = hitPos.y - Math.floor(hitPos.y);
            }
            
            const srcX = Math.floor(samplePosX * (hit.texture.width - 1));
            const srcY = 0;
            const srcW = 1;
            const srcH = hit.texture.height;

            backbuffer.drawTexture(hit.texture, srcX, srcY, srcW, srcH, index, y, 1, height, hit.isVertical);
        }
    }
}

function drawMiniMap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    
    const startX = x;
    const startY = y;
    const tileDim = w / GRID_COLS;
    
    ctx.fillStyle = "white";
    for (let y = 0; y < GRID_ROWS; ++y) {
        for (let x = 0; x < GRID_COLS; ++x) {
            ctx.fillRect(startX + x * tileDim, startY + y * tileDim, tileDim, tileDim);
            const textureIndex = MAP[y][x] - 1;
            if (textureIndex >= 0) {
                const texture: HTMLImageElement = document.images[textureIndex];
                ctx.drawImage(texture, startX + x * tileDim, startY + y * tileDim, tileDim, tileDim);
            }

        }
    }

    ctx.strokeStyle = "black"
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
    const rayAmount = 10;

    for (let index = 0; index < rayAmount; ++index) {

        const rayFactor: number = (index / rayAmount) * 2 - 1;
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

    // Draw player dir
    const playerSreenDirPos = screenPlayerPos.add(playerDir.scale(tileDim));
    ctx.strokeStyle = "yellow"
    ctx.beginPath();
    ctx.moveTo(screenPlayerPos.x, screenPlayerPos.y);
    ctx.lineTo(playerSreenDirPos.x, playerSreenDirPos.y);
    ctx.stroke();

    
    // Draw player vel
    const playerSreenVelPos = screenPlayerPos.add(playerVel.scale(tileDim));
    ctx.strokeStyle = "red"
    ctx.beginPath();
    ctx.moveTo(screenPlayerPos.x, screenPlayerPos.y);
    ctx.lineTo(playerSreenVelPos.x, playerSreenVelPos.y);
    ctx.stroke();
    
}

type TileHit = {
    result: boolean,
    t: number,
};

function testHorizontalTileEdge(x: number, edgeY: number, dy: number): TileHit {

    if (dy !== 0) {
        const ty = (edgeY - playerPos.y) / dy;
        const hitPos: Vector2 = playerPos.add(playerVel.scale(ty));
        
        if (hitPos.x >= (x-playerRad) && hitPos.x <= (x + 1+playerRad) && ty >= 0 && ty <= 1) {
            return { result: true, t: ty };
        }
    }

    return { result: false, t: Infinity };
}

function testVerticalTileEdge(y: number, edgeX: number, dx: number): TileHit {

    if (dx !== 0) {
        const tx = (edgeX - playerPos.x) / dx;
        const hitPos: Vector2 = playerPos.add(playerVel.scale(tx));

        if (hitPos.y >= (y-playerRad)  && hitPos.y <= (y + 1+playerRad) && tx >= 0 && tx <= 1) {
            return { result: true, t: tx };
        }
    }

    return { result: false, t: Infinity };
}


type Keyboard = {
    keyW: boolean,
    keyS: boolean,
    keyRight: boolean,
    keyLeft: boolean,
};


let keyboard: Keyboard = { keyW: false, keyS: false, keyRight: false, keyLeft: false};
let lastKeyboard: Keyboard = { keyW: false, keyS: false, keyRight: false, keyLeft: false};

function update(dt: number) { 
    
    if (keyboard.keyW === true) {
        playerVel = playerDir.scale(playerSpeed * dt);
    }

    if(lastKeyboard.keyW === true && keyboard.keyW === false) {
        playerVel = new Vector2(0, 0);
    }
    
    if (keyboard.keyS === true) {
        playerVel = playerDir.scale(-playerSpeed * dt);
    }

    if(lastKeyboard.keyS === true && keyboard.keyS === false) {
        playerVel = new Vector2(0, 0);
    }

    
    if (keyboard.keyLeft === true) {
        playerDir = playerDir.rotate(-playerRotSpeed * dt);
        playerVel = playerVel.rotate(-playerRotSpeed * dt);
    }
    if (keyboard.keyRight === true) {
        playerDir = playerDir.rotate(playerRotSpeed * dt);
        playerVel = playerVel.rotate(playerRotSpeed * dt);
    }


    let normal = new Vector2(0, 0);

    for (let y = 0; y < GRID_ROWS; ++y) {
        for (let x = 0; x < GRID_COLS; ++x) {
            const mapIndex = MAP[y][x];
            if (mapIndex > 0) {

                let t = Infinity;

                let edgeTest;
                edgeTest = testHorizontalTileEdge(x, y - playerRad, playerVel.y);
                if (edgeTest.result && edgeTest.t < t) {
                    t = edgeTest.t;
                    normal = new Vector2(0, 1);
                }

                edgeTest = testHorizontalTileEdge(x, y + 1 + playerRad, playerVel.y);
                if (edgeTest.result && edgeTest.t < t) {
                    t = edgeTest.t;
                    normal = new Vector2(0, -1);
                }

                edgeTest = testVerticalTileEdge(y, x - playerRad, playerVel.x);
                if (edgeTest.result && edgeTest.t < t) {
                    t = edgeTest.t;
                    normal = new Vector2(-1, 0);
                }

                edgeTest = testVerticalTileEdge(y, x + 1 + playerRad, playerVel.x);
                if (edgeTest.result && edgeTest.t < t) {
                    t = edgeTest.t;
                    normal = new Vector2(1, 0);
                }

                if (t < Infinity) {
                    const perp = normal.perp();
                    playerVel = perp.scale(playerVel.dot(perp));
                }
            }
        }

    }

    playerPos = playerPos.add(playerVel);

}

function draw(ctx: CanvasRenderingContext2D, backbuffer: Backbuffer) {
    backbuffer.clear(0xff774444);
    drawFloor(backbuffer);
    drawMap3d(backbuffer);
    backbuffer.draw();

    drawMiniMap(ctx, 0, 0, 200);
    
}

(() => {
    
    const canvas = document.getElementById("canvas") as (HTMLCanvasElement | null);
    if (canvas === null) {
        throw new Error("cannot find canvas with id 'canvas'");
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true }) as (CanvasRenderingContext2D | null);
    if (ctx === null) {
        throw new Error("2d context is not supported");
    }
    
    console.log("Welcome to my raycasting GAME!");
    
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    canvas.style.backgroundColor = "#444444";

    const backbuffer = new Backbuffer(canvas, canvas.width*downSampleFactor, canvas.height*downSampleFactor);
    
    window.addEventListener("keydown", (event) => {
        if(event.key === "w") {
            keyboard.keyW = true;
        }
        if(event.key === "s") {
            keyboard.keyS = true;
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
        draw(ctx, backbuffer);

        lastKeyboard = {...keyboard};
        
        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    
})();
