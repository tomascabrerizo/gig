import { Backbuffer } from "./backbuffer.js"

export class Display {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number = 0;
    height: number = 0;

    constructor() {
        const canvasResult = document.getElementById("canvas") as (HTMLCanvasElement | null);
        if (canvasResult === null) {
            throw new Error("cannot find canvas with id 'canvas'");
        }
        this.canvas = canvasResult;

        const contextResult  = this.canvas.getContext("2d", { willReadFrequently: true }) as (CanvasRenderingContext2D | null);
        if (contextResult === null) {
            throw new Error("2d context is not supported");
        }
        this.ctx = contextResult;
        
        this.resize();
        window.addEventListener("resize", (() => {
            this.resize();
        }).bind(this));        
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;    
        this.width = rect.width;
        this.height = rect.height;
    }

    draw(backbuffer: Backbuffer) {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(backbuffer.canvas, 0, 0, backbuffer.width, backbuffer.height, 0, 0, this.width, this.height);
    }

}
