import { AssetHandle, AssetManager, Texture } from "./assets.js"

export class Map {
    tiles: Array<Array<number>> = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 0, 0, 0, 0, 3, 3, 3, 3, 1],
        [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 0, 0, 0, 2, 2, 0, 2, 2, 1],
        [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
    
    textures: AssetHandle[] = [
        AssetManager.getInstance().get("./assets/box1.jpg"),
        AssetManager.getInstance().get("./assets/box2.jpg"),
        AssetManager.getInstance().get("./assets/box3.jpg"),
        AssetManager.getInstance().get("./assets/box4.jpg"),
    ];
    
    getWidth() { return this.tiles[0].length; }
    getHeight() { return this.tiles.length; }    

    getTexture(index: number): AssetHandle {
        return this.textures[index];
    }
}
