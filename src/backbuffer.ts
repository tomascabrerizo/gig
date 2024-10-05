import { Texture } from "./assets.js"

export class Backbuffer {
    imageData: ImageData;
    buffer: Uint32Array;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    
    width: number;
    height: number;

    zBuffer: Array<number>;
    
    constructor(width: number, height: number) {

        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        const ctxResult = this.canvas.getContext("2d", { willReadFrequently: true }) as (CanvasRenderingContext2D | null);
        if (ctxResult === null) {
            throw new Error("2d context is not supported");
        }
        this.ctx = ctxResult;
      
        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.buffer = new Uint32Array(this.imageData.data.buffer);
        this.width = width;
        this.height = height;

        this.zBuffer = new Array<number>(width);
        this.zBuffer.fill(0);
    }

    draw() {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.putImageData(this.imageData, 0, 0);
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
                vertical?: boolean, lightColor?: number) {

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

                // TODO: add a flag to render textures using real alpha bending
                const a = ((srcColor >> 24) & 0xff);
                if(a < Math.floor(0xff/2)) continue;
                
                // if (vertical === true) {
                //     const scale = 0.4;
                //     const r = ((srcColor >> 16) & 0xff) * scale;
                //     const g = ((srcColor >> 8) & 0xff) * scale;
                //     const b = ((srcColor >> 0) & 0xff) * scale;
                //     srcColor = (0xff << 24) | (r << 16) | (g << 8) | (b);
                // }

                if (lightColor !== undefined) {
                    const lr = ((lightColor >> 16) & 0xff) / 256;
                    const lg = ((lightColor >> 8) & 0xff) / 256;
                    const lb = ((lightColor >> 0) & 0xff) / 256;

                    const sr = ((srcColor >> 16) & 0xff);
                    const sg = ((srcColor >> 8) & 0xff);
                    const sb = ((srcColor >> 0) & 0xff);
                    
                    const r = Math.floor(sr * lr);
                    const g = Math.floor(sg * lg);
                    const b = Math.floor(sb * lb);

                    srcColor = (0xff << 24) | (r << 16) | (g << 8) | (b);
                }                
                
                this.buffer[desOffsetY * this.width + desOffsetX] = srcColor;
            }
        }
    }
};
