import { input } from "./browser.js"
import { Backbuffer } from "./backbuffer.js"
import { DrawCommand, DrawCommandCircle, DrawCommandLine, DrawCommandRect, DrawCommandTexture } from "./render2d.js";

type DisplayDrawable = Backbuffer | DrawCommand[];

export class Display {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number = 0;
    height: number = 0;

    isPointerLockerd: boolean = false;
    
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
        window.addEventListener("resize", () => {
            this.resize();
        });

        window.addEventListener("keydown", async (event: KeyboardEvent) =>{
            if(event.key === "p") {
                if(event.repeat) return;

                if(!this.isPointerLockerd) {
                    await this.canvas.requestPointerLock();                
                } else {
                    document.exitPointerLock();
                }

                this.isPointerLockerd = !this.isPointerLockerd;                
            }
        });

        this.canvas.addEventListener("mousemove", (event: MouseEvent) => {

            input.mouse.x = event.clientX;
            input.mouse.y = event.clientY;
            
            input.mouse.relX = (event.movementX / this.canvas.width);
            input.mouse.relY = (event.movementY / this.canvas.height);
        });        
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;    
        this.width = rect.width;
        this.height = rect.height;
    }

    draw(drawable: DisplayDrawable) {

        if(drawable instanceof Backbuffer) {
            const backbuffer: Backbuffer = drawable;
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(backbuffer.canvas, 0, 0, backbuffer.width, backbuffer.height, 0, 0, this.width, this.height);
        } else {
            const commands: DrawCommand[] = drawable;
            commands.forEach(command => {
                switch (command.type) {
                    case "DrawCommandTexture": {
                        const rect: DrawCommandTexture = command as DrawCommandTexture;
                        this.ctx.drawImage(rect.texture, rect.pos.x, rect.pos.y, rect.size.x, rect.size.y);
                    } break;
                    case "DrawCommandRect": {
                        const rect: DrawCommandRect = command as DrawCommandRect;
                        this.ctx.fillStyle = rect.color;
                        this.ctx.fillRect(rect.pos.x, rect.pos.y, rect.size.x, rect.size.y)
                    } break;
                    case "DrawCommandLine": {
                        const line: DrawCommandLine = command as DrawCommandLine;
                        this.ctx.strokeStyle = line.color;
                        this.ctx.lineWidth = line.width;
                        this.ctx.beginPath();
                        this.ctx.moveTo(line.p1.x, line.p1.y);
                        this.ctx.lineTo(line.p2.x, line.p2.y);
                        this.ctx.stroke();
                    } break;
                    case "DrawCommandCircle": {
                        const circle: DrawCommandCircle = command as DrawCommandCircle;
                        this.ctx.fillStyle = circle.color;
                        this.ctx.beginPath();
                        this.ctx.arc(circle.pos.x, circle.pos.y, circle.rad, 0, 2 * Math.PI);
                        this.ctx.fill();
                    } break;
                };

            });
        }
    }
 
}
