export type Texture = {
    image: HTMLImageElement,
    pixels: Uint32Array,
    width: number,
    height: number,
}

async function loadImage(url: string): Promise<HTMLImageElement> {
    const image: HTMLImageElement = new Image();
    image.src = url;
    return new Promise((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = reject;
    });
}

async function loadTexture(url: string): Promise<Texture> {

    const image: HTMLImageElement = await loadImage(url);
    
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("2d canvas is not supported");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);

    const textureData: ImageData = ctx.getImageData(0, 0, image.width, image.height);
    const textureBuffer: ArrayBuffer = new ArrayBuffer(image.width * image.height * 4);
    const textureBuffer32: Uint32Array = new Uint32Array(textureBuffer);
    textureBuffer32.set(new Uint32Array(textureData.data.buffer));

    const texture: Texture = {
        image,
        pixels: textureBuffer32,
        width: image.width,
        height: image.height
    };

    return texture;
}

export type AssetHandle = number;

export class AssetManager {
    private handles: Map<string, AssetHandle>;
    private assets: Texture[];

    private static instance: AssetManager | null = null;
    private static defaultTexture: Texture;

    private constructor() {
        this.handles  = new Map();
        this.assets  = [];
    }

    static async init() {
        this.instance = new AssetManager();
        this.defaultTexture = await loadTexture("./assets/debug.png");
        this.instance.assets.push(this.defaultTexture);
    }
    
    static getInstance(): AssetManager {
        if (this.instance === null) {
            this.instance = new AssetManager();
        }
        return this.instance;
    }

    async loadUrl(handle: AssetHandle, url: string) {
        this.assets[handle] = await loadTexture(url);
    }
    
    get(url: string): AssetHandle {

        if(!this.handles.has(url)) {
            const handle = this.assets.length;
            this.assets.push(AssetManager.defaultTexture);
            this.handles.set(url, handle);
            this.loadUrl(handle, url);
        };
        
        const handle: AssetHandle|undefined = this.handles.get(url);
        if(handle === undefined) {
            throw new Error("Cannot find already loaded asset");
        }
        return handle;
    }    

    getTexture(handle: AssetHandle): Texture {
        if(handle < 0 || handle >= this.assets.length) {
            throw new Error("Invalid asset handle");
        }
        return this.assets[handle];
    }
    
};
