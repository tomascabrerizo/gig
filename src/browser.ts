import { Texture } from "./backbuffer.js"
import { mouseMovement } from "./display.js"

type Mouse = {
    x: number,
    y: number,
    relX: number,
    relY: number,
};

type Keyboard = {
    keyW: boolean,
    keyS: boolean,
    keyA: boolean,
    keyD: boolean,
    keyRight: boolean,
    keyLeft: boolean,
    keySpace: boolean,
};

export type Input = {
    mouse: Mouse,
    keyboard: Keyboard,
};

export const  input: Input = {
    keyboard: { keyW: false, keyS: false, keyA: false, keyD: false,  keyRight: false, keyLeft: false, keySpace: false},
    mouse: {x: 0, y: 0, relX: 0, relY: 0},
};

export const  lastInput: Input = {
    keyboard: { keyW: false, keyS: false, keyA: false, keyD: false,  keyRight: false, keyLeft: false, keySpace: false},
    mouse: {x: 0, y: 0, relX: 0, relY: 0},
};


window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "w") {
        input.keyboard.keyW = true;
    }
    if (event.key === "s") {
        input.keyboard.keyS = true;
    }
    if (event.key === "a") {
        input.keyboard.keyA = true;
    }
    if (event.key === "d") {
        input.keyboard.keyD = true;
    }
    if (event.key === "ArrowLeft") {
        input.keyboard.keyLeft = true;
    }
    if (event.key == "ArrowRight") {
        input.keyboard.keyRight = true;
    }
    if (event.key == " ") {
        input.keyboard.keySpace = true;
    }
});

window.addEventListener("keyup", (event) => {
    if (event.key === "w") {
        input.keyboard.keyW = false;
    }
    if (event.key === "s") {
        input.keyboard.keyS = false;
    }
    if (event.key === "a") {
        input.keyboard.keyA = false;
    }
    if (event.key === "d") {
        input.keyboard.keyD = false;
    }
    if (event.key === "ArrowLeft") {
        input.keyboard.keyLeft = false;
    }
    if (event.key == "ArrowRight") {
        input.keyboard.keyRight = false;
    }
    if (event.key == " ") {
        input.keyboard.keySpace = false;
    }
});

export function getInput(): Input {
    let movementX = 0;
    let movementY = 0;

    mouseMovement.forEach((move) => {
        movementX += move.x;
        movementY += move.y;
    })
    mouseMovement.length = 0;

    input.mouse.relX = movementX;
    input.mouse.relY = movementY;
    
    return input;
}

export function loadTextures(): Texture[] {
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
