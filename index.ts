(() => {

    // function errorAssert(expresion: boolean, message: string) {
    //     if(expresion === false) {
    //         throw new Error(message);
    //     }
    // }
    
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

        rotate(angle: number) : Vector2 {
            const rad = angle * Math.PI / 180;
            return new Vector2(
                this.x*Math.cos(rad)-this.y*Math.sin(rad),
                this.x*Math.sin(rad)+this.y*Math.cos(rad),
            );
        }

        dot(other: Vector2): number {
            return this.x*other.x + this.y*other.y;
        }

        static angleBetween(a: Vector2, b: Vector2) {
            return Math.acos(a.dot(b)/(a.length()*b.length()));
        }
        
    };

    type Texture = {
        pixels: Uint32Array,
        width: number,
        height: number,
    }
    
    const GRID_COLS: number = 10;
    const GRID_ROWS: number = 10;
    const MAP: number[] = [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 2, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 2, 0, 3, 0, 1, 0, 0, 1,
        1, 0, 2, 0, 0, 0, 1, 0, 0, 1,
        1, 0, 2, 0, 0, 0, 1, 0, 0, 1,
        1, 0, 0, 0, 1, 1, 1, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ];

    const MAP_COLORS: number[] = [
        0xff000000,
        0xffff0000,
        0xff00ff00,
        0xff0000ff,
        0xffff00ff,
        0xff00ffff,
    ];

    const downSampleFactor = 1/4;

    const SCREEN_WIDTH: number = 1920/2
    const SCREEN_HEIGHT: number = 1080/2
    
    let playerPos: Vector2 = new Vector2(GRID_COLS / 2 - 0.5, GRID_ROWS / 2 + 0.5);
    let playerDir: Vector2 = new Vector2(1, 0);
    let cameraFOV: number = 90;
    let cameraNear: number = 1; 
    
    const playerSpeed: number = 0.1;
    const TEXTURES: Texture[] = [];
    
    class Backbuffer {
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        imageData: ImageData;
        buffer: Uint32Array;
        
        width: number;
        height: number;
        widthScale: number;
        heightScale: number;
        
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

            this.widthScale = canvas.width / width;
            this.heightScale = canvas.height / height;

            const saveCanvasWidth = canvas.width;
            const saveCanvasHeight = canvas.height; 
            
            for(let index = 0; index < document.images.length; index++) {

                const texture: HTMLImageElement = document.images[index];

                canvas.width = texture.width;
                canvas.height = texture.height;
                this.ctx.drawImage(texture, 0, 0)

                const textureData: ImageData = this.ctx.getImageData(0, 0, texture.width, texture.height);
                const textureBuffer: ArrayBuffer = new ArrayBuffer(texture.width*texture.height*4);
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
            this.ctx.putImageData(this.imageData, 0, 0);
            this.ctx.drawImage(this.canvas, 0, 0, this.canvas.width*this.widthScale, this.canvas.height*this.heightScale);
        }
        
        clear(color: number) {
            this.buffer.fill(color);
        }
        
        drawRect(x: number, y: number, w: number, h: number, color: number) {
            let minX = x;
            let maxX = minX + (w-1);
            let minY = y;
            let maxY = minY + (h-1);

            if(minX < 0) minX = 0;
            if(maxX >= this.width) maxX = (this.width - 1);
            if(minY < 0) minY = 0;
            if(maxY >= this.height) maxY = (this.height - 1);

            for(let offsetY: number = minY; offsetY <= maxY; ++offsetY) {
                for(let offsetX: number = minX; offsetX <= maxX; ++offsetX) {
                    this.buffer[offsetY*this.width+offsetX] = color;
                }
            }            
        }

        putTexture(texture: Texture) {
            console.log(texture.width, texture.height);
            
            for(let y = 0; y < texture.height; ++y) {
                for(let x = 0; x < texture.width; ++x) {
                    this.buffer[y*this.width+x] = texture.pixels[y*texture.width+x];
                }
            }
        }
        
        drawTexture(texture: Texture,
                    srcX: number, srcY: number, srcW: number, srcH: number,
                    desX: number, desY: number, desW: number, desH: number,
                    vertical?: boolean) {

            let minX = desX;
            let maxX = minX + (desW-1);
            let minY = desY;
            let maxY = minY + (desH-1);

            let offsetX: number = 0;
            let offsetY: number = 0;
            
            if(minX < 0) {
                offsetX = -minX;
                minX = 0;
            }
            if(maxX >= this.width) {
                maxX = (this.width - 1);
            }

            if(minY < 0) {
                offsetY = -minY;
                minY = 0;
            }
            if(maxY >= this.height) {
                maxY = (this.height - 1);
            }

           for(let y = minY; y <= maxY; ++y) {

                const ty = ((y - minY) + offsetY) / desH;
                for(let x = minX; x <= maxX; ++x) {
                    const tx = ((x - minX) + offsetX) / desW;

                    const srcOffsetX = srcX + Math.floor(tx*srcW);
                    const srcOffsetY = srcY + Math.floor(ty*srcH);
                    const desOffsetX = x;
                    const desOffsetY = y;

                    let srcColor = texture.pixels[srcOffsetY*texture.width+srcOffsetX];

                    if(vertical === true) {
                        const scale = 0.4;
                        const r = ((srcColor >> 16) & 0xff) * scale;
                        const g = ((srcColor >> 8) & 0xff) * scale;
                        const b = ((srcColor >> 0) & 0xff) * scale;
                        srcColor = (0xff << 24) | (r << 16) | (g << 8) | (b);
                    }
                    
                    this.buffer[desOffsetY*this.width+desOffsetX] = srcColor;

                    
                }
            }
        }
        
    };

    type Hit = {
        result: boolean,
        t: number,
        texture: Texture,
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
        } else {
            edgeX = Math.ceil(pos.x);
            stepX = 1;
        }

        let edgeY: number;
        if (dy < 0) {
            edgeY = Math.floor(pos.y);
            stepY = -1;
        } else {
            edgeY = Math.ceil(pos.y);
            stepY = 1;
        }

        let maxSteps = 20;
        while (maxSteps > 0) {
            maxSteps = maxSteps - 1;

            let tx: number = 0;
            if(dx !== 0) {
                tx = (edgeX - pos.x) / dx;
            
            }
            let ty: number = 0;
            if(dy !== 0 ){
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

            const mapIndex = MAP[mapY * GRID_COLS + mapX];
            if (mapIndex !== 0) {
                return { result: true, t, texture: TEXTURES[mapIndex-1], isVertical};
            }
        }

        return { result: false, t: 0, texture: TEXTURES[0], isVertical: false};
    }

    function planeDir(): Vector2 {
        const halfFovRad: number = (cameraFOV / 2) * Math.PI / 180;
        const planeHalfLength: number = cameraNear*Math.tan(halfFovRad);
        const planeDir = playerDir.perp().norm().scale(planeHalfLength);
        return planeDir;
    }
    
    function drawFloor(backbuffer: Backbuffer) {

        const floorTexture: Texture = TEXTURES[4];
        const cellingTexture: Texture = TEXTURES[4];

        for(let y: number = Math.floor(backbuffer.height / 2) + 1; y < backbuffer.height; ++y) {

            const plane = planeDir();
            const rayLeft: Vector2 = playerDir.sub(plane);
            const rayRight: Vector2 = playerDir.add(plane);
            
            const p: number = y - Math.floor(backbuffer.height / 2);
            if(p === 0) continue;
            
            const posZ: number = backbuffer.height * 0.5;
            const rowDistance: number = posZ / p;
            
            const floorStep: Vector2 = rayRight.sub(rayLeft).scale(rowDistance/backbuffer.width);
            let floor: Vector2 = playerPos.add(rayLeft.scale(rowDistance));

            for(let x: number = 0; x < backbuffer.width; ++x) {
                const cellX: number = Math.floor(floor.x);
                const cellY: number = Math.floor(floor.y);

                floor = floor.add(floorStep);
                
                {
                    const tx: number = Math.floor(floorTexture.width * (floor.x - cellX)) % floorTexture.width;
                    const ty: number = Math.floor(floorTexture.height * (floor.y - cellY)) % floorTexture.height;

                    const color = floorTexture.pixels[ty * floorTexture.width + tx];
                    backbuffer.buffer[y * backbuffer.width + x] = color;
                }
                
                {
                    const tx: number = Math.floor(cellingTexture.width * (floor.x - cellX)) % cellingTexture.width;
                    const ty: number = Math.floor(cellingTexture.height * (floor.y - cellY)) % cellingTexture.height;

                    const ceilingY: number = (backbuffer.height - y - 1);
                    const color = cellingTexture.pixels[ty * cellingTexture.width + tx];
                    backbuffer.buffer[ceilingY*backbuffer.width+x] = color;
                }

            }
            
        }
    }

    function drawMap3d(backbuffer: Backbuffer) {
        
        const rayAmount = backbuffer.width;
        
        for (let index = 0; index < rayAmount; ++index) {
            const rayFactor: number = ((index / (rayAmount - 1)) * 2 - 1);
            const rayDir: Vector2 = playerDir.add(planeDir().scale(rayFactor)).norm();
            const hit = calculateNearIntersection(playerPos, rayDir);
            
            if (hit.result === true) {

                const hitDir: Vector2 = rayDir.scale(hit.t);
                const hitPos: Vector2 = playerPos.add(hitDir);
                const distance: number = hitPos.sub(playerPos).length();
                const B: number = Vector2.angleBetween(hitDir, playerDir);
                const z: number = distance * Math.cos(B);

                const height = Math.floor(backbuffer.height / z);
                const y = Math.floor((backbuffer.height / 2) - (height / 2));

                let samplePosX = 0;

                if (hit.isVertical) {
                    samplePosX = hitPos.x - Math.floor(hitPos.x);
                } else {
                    samplePosX = hitPos.y - Math.floor(hitPos.y);
                }

                const srcX = Math.floor(samplePosX * (hit.texture.width-1));
                const srcY = 0;
                const srcW = 1;
                const srcH = hit.texture.height;
                
                backbuffer.drawTexture(hit.texture, srcX, srcY, srcW, srcH, index, y, 1, height, hit.isVertical);
            }
        }
    }
    
    function draw(backbuffer: Backbuffer) {
        backbuffer.clear(0xff444444);
        drawFloor(backbuffer);
        drawMap3d(backbuffer);
        backbuffer.draw();
    }
    
    const canvas = document.getElementById("canvas") as (HTMLCanvasElement | null);
    if (canvas === null) {
        throw new Error("cannot find canvas with id 'canvas'");
    }

    console.log("Welcome to my raycasting GAME!");
    
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    canvas.style.backgroundColor = "#444444";

    const backbuffer = new Backbuffer(canvas, canvas.width*downSampleFactor, canvas.height);
    
    type Keyboard = {
        keyW: boolean,
        keyS: boolean,
        keyRight: boolean,
        keyLeft: boolean,
    };

    const keyboard: Keyboard = {
        keyW: false,
        keyS: false,
        keyRight: false,
        keyLeft: false,
    };
    
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
    
    const loop = () => {

        // NOTE: Get keyboard input
        if(keyboard.keyW === true) {
            playerPos = playerPos.add(playerDir.scale(playerSpeed));
        }
        if (keyboard.keyS === true) {
            playerPos = playerPos.sub(playerDir.scale(playerSpeed));
        }
        if (keyboard.keyLeft === true) {
            playerDir = playerDir.rotate(-10);
        }
        if(keyboard.keyRight === true) {
            playerDir = playerDir.rotate(10);
        }

        // NOTE: Update and Render the game
        draw(backbuffer);

        setTimeout(() => requestAnimationFrame(loop), 33);
    };

    loop();
    
})();
