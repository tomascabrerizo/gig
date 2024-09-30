import { Vector2 } from "./vector2.js";

export type DrawCommandCircle = {
    type: string;
    pos: Vector2;
    rad: number;
    color: string;
}

export type DrawCommandLine = {
    type: string;
    p1: Vector2;
    p2: Vector2;
    width: number;
    color: string;
}

export type DrawCommandTexture = {
    type: string;
    pos: Vector2;
    size: Vector2;
    texture: HTMLImageElement;
}

export type DrawCommandRect = {
    type: string;
    pos: Vector2;
    size: Vector2;
    color: string;
}

export type DrawCommand = DrawCommandCircle | DrawCommandLine | DrawCommandTexture | DrawCommandRect;

export class Render2d {
    startPos: Vector2;
    tileDim: number;

    constructor(startPos: Vector2, tileDim: number) {
        this.startPos = startPos;
        this.tileDim = tileDim;
    }
    
    drawCircle(commands: DrawCommand[], pos: Vector2, rad: number, color: string) {
        
        let command: DrawCommandCircle = {
            type: "DrawCommandCircle",
            pos: this.startPos.add(pos.scale(this.tileDim)),
            rad: rad*this.tileDim,
            color
        };
        commands.push(command);
    }

    drawLine(commands: DrawCommand[], p1: Vector2, p2: Vector2, width: number, color: string) {
        let command: DrawCommandLine = {
            type: "DrawCommandLine",
            p1: this.startPos.add(p1.scale(this.tileDim)),
            p2: this.startPos.add(p2.scale(this.tileDim)),
            width: width*this.tileDim,
            color
        };
        commands.push(command);
    }

    drawImage(commands: DrawCommand[], pos: Vector2, size: Vector2, texture: HTMLImageElement) {
        let command: DrawCommandTexture = {
            type: "DrawCommandTexture",
            pos: this.startPos.add(pos.scale(this.tileDim)),
            size: size.scale(this.tileDim),
            texture
        };
        commands.push(command);
    }

    drawRect(commands: DrawCommand[], pos: Vector2, size: Vector2, color: string) {
        let command: DrawCommandRect = {
            type: "DrawCommandRect",
            pos: this.startPos.add(pos.scale(this.tileDim)),
            size: size.scale(this.tileDim),
            color
        };
        commands.push(command);
    }

    
};
