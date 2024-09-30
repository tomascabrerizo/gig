import { Texture } from "./backbuffer.js"

export type Keyboard = {
    keyW: boolean,
    keyS: boolean,
    keyA: boolean,
    keyD: boolean,
    keyRight: boolean,
    keyLeft: boolean,
};

let keyboard: Keyboard = { keyW: false, keyS: false, keyA: false, keyD: false,  keyRight: false, keyLeft: false};

window.addEventListener("keydown", (event) => {
    if (event.key === "w") {
        keyboard.keyW = true;
    }
    if (event.key === "s") {
        keyboard.keyS = true;
    }
    if (event.key === "a") {
        keyboard.keyA = true;
    }
    if (event.key === "d") {
        keyboard.keyD = true;
    }
    if (event.key === "ArrowLeft") {
        keyboard.keyLeft = true;
    }
    if (event.key == "ArrowRight") {
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

export function getInput(): Keyboard {
    return keyboard;
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
