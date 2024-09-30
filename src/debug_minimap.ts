import { DrawCommand, Render2d } from "./render2d.js";
import { Vector2 } from "./vector2.js";

export class DebugMinimap {
    private r2d: Render2d;
    private commands: DrawCommand[] = [];
    private static instance: DebugMinimap | null = null;
    
    private constructor() {
        this.r2d = new Render2d(new Vector2(0, 0), 20);
    }

    static getInstance(): DebugMinimap {
        if(this.instance === null) {
            this.instance = new DebugMinimap();
        }
        return this.instance;
    }

    getCommands(): DrawCommand[] {
        return this.commands;
    }

    clearCommands() {
        this.commands.length = 0;
    }

    drawImage(pos: Vector2, size: Vector2,texture: HTMLImageElement) {
        this.r2d.drawImage(this.commands, pos, size, texture);
    }

    drawRect(pos: Vector2, size: Vector2, color: string) {
        this.r2d.drawRect(this.commands, pos, size, color);
    }


    drawCircle(pos: Vector2, rad: number, color: string) {
        this.r2d.drawCircle(this.commands ,pos, rad, color);
    }

    drawLine(p1: Vector2, p2: Vector2, width: number, color: string) {
        this.r2d.drawLine(this.commands, p1, p2, width, color);
    }
    
}
