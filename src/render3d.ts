
import { Vector2 } from "./vector2.js"
import { Backbuffer } from "./backbuffer.js"
import { GameState } from "./game.js"
import { AssetManager, AssetHandle, Texture } from "./assets.js"

export type Light = {
    pos: Vector2;
    strength: number;
    color: number;
}

export type Sprite = {
    pos: Vector2;
    textures: AssetHandle[];
    dim: number;
    height: number;
    
    index: number;
    speed: number;
    currentTime: number;
};

export function createSprite(pos: Vector2, texture: AssetHandle, dim: number, height: number): Sprite {
    const result = {
        pos,
        textures: [texture],
        dim,
        height,
        index: 0,
        speed: 0,
        currentTime: 0,
    };
    return result;
}

export function createCoin(pos: Vector2): Sprite {
    const result = {
        pos,
        textures: [
            AssetManager.getInstance().get("./assets/Coin1.png"),
            AssetManager.getInstance().get("./assets/Coin2.png"),
            AssetManager.getInstance().get("./assets/Coin3.png"),
            AssetManager.getInstance().get("./assets/Coin4.png"),
            AssetManager.getInstance().get("./assets/Coin5.png"),
            AssetManager.getInstance().get("./assets/Coin6.png"),
        ],
        dim: 0.3,
        height: 0,
        index: 0,
        speed: 0.7,
        currentTime: 0,
    };    
    return result;
}

type Hit = {
    result: boolean,
    t: number,
    texture: AssetHandle,
    isVertical: boolean,
    normal: Vector2,
};

export class Render3d {
 
    calculateNearIntersection(gs: GameState, pos: Vector2, dir: Vector2): Hit {

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
        } else if (dx > 0) {
            edgeX = Math.ceil(pos.x);
            if (pos.x === edgeX) edgeX += 1;
            stepX = 1;
        } else {
            edgeX = pos.x;
        }

        let edgeY: number;
        if (dy < 0) {
            edgeY = Math.floor(pos.y);
            stepY = -1;
        } else if (dy > 0) {
            edgeY = Math.ceil(pos.y);
            if (pos.y === edgeY) edgeY += 1;
            stepY = 1;
        } else {
            edgeY = pos.y;
        }

        for (; ;) {
            let tx: number = Infinity;
            if (dx !== 0) {
                tx = (edgeX - pos.x) / dx;

            }
            let ty: number = Infinity;
            if (dy !== 0) {
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

            if (mapY < 0 || mapY >= gs.map.getHeight() || mapX < 0 || mapX >= gs.map.getWidth()) {
                return { result: false, t: 0, texture: gs.map.getTexture(0), isVertical: false, normal: new Vector2(0, 0) };
            }

            const mapIndex = gs.map.tiles[mapY][mapX];
            if (mapIndex !== undefined && mapIndex !== 0) {
                let normal: Vector2;
                if(!isVertical) {
                    normal = (dx > 0) ? new Vector2(-1, 0) : new Vector2(1, 0);
                } else {
                    normal = (dy > 0) ? new Vector2(0, -1) : new Vector2(0, 1);
                }
                return { result: true, t, texture: gs.map.getTexture(mapIndex - 1), isVertical, normal };
            }
        }
    }

    halfPlaneDir(gs: GameState): Vector2 {
        const halfFovRad: number = (gs.cameraFOV / 2) * Math.PI / 180;
        const planeHalfLength: number = gs.cameraNear * Math.tan(halfFovRad);
        const planeDir = gs.playerDir.perp().norm().scale(planeHalfLength);
        return planeDir;
    }

    easeOutExpo(x: number): number {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    }

    calculateLights(gs: GameState, worldPos:Vector2, normal?:Vector2): number {


        // Try premultiplied alpha        
        let r = Math.floor(((gs.ambient >> 16) & 0xff) * gs.ambientAmount);
        let g = Math.floor(((gs.ambient >> 8) & 0xff) * gs.ambientAmount);
        let b = Math.floor(((gs.ambient >> 0) & 0xff) * gs.ambientAmount);
        
        
        gs.lights.forEach(light => {
            const distance: number =  worldPos.sub(light.pos).length();
            
            let dotStrength = 1;
            if(normal !== undefined) {
                dotStrength = Math.max(Math.min(light.pos.sub(worldPos).dot(normal), 1), 0);
            }

            const lightAmount = Math.min((light.strength / (distance * distance)) * dotStrength, 1);
            
            r += Math.floor(((light.color >> 16) & 0xff) * lightAmount);
            g += Math.floor(((light.color >> 8) & 0xff) * lightAmount);
            b += Math.floor(((light.color >> 0) & 0xff) * lightAmount);
            
        });

        r = Math.max(Math.min(r, 255), 0);
        g = Math.max(Math.min(g, 255), 0);
        b = Math.max(Math.min(b, 255), 0);
        
        const finalColor = (0xff << 24) | (r << 16) | (g << 8) | (b);
        return finalColor;
        
    }
    
    drawFloor(gs: GameState, backbuffer: Backbuffer) {
        const yStart: number = Math.floor(backbuffer.height / 2 + 1);
        const cameraPosY: number = Math.floor(backbuffer.height / 2);

        const p1: Vector2 = gs.playerDir.sub(this.halfPlaneDir(gs));
        const p2: Vector2 = gs.playerDir.add(this.halfPlaneDir(gs));

        const floorTextureHandle: AssetHandle = AssetManager.getInstance().get("./assets/floor.jpg");
        const floorTexture: Texture = AssetManager.getInstance().getTexture(floorTextureHandle);

        const ceilTextureHandle: AssetHandle = AssetManager.getInstance().get("./assets/floor.jpg");
        const ceilTexture: Texture = AssetManager.getInstance().getTexture(ceilTextureHandle);

        for (let y = yStart; y < backbuffer.height; ++y) {
            const posY = cameraPosY - y;
            const distance = Math.abs(cameraPosY / posY);

            for (let x = 0; x < backbuffer.width; ++x) {
                const t = x / (backbuffer.width - 1);
                const floor = gs.playerPos.add(Vector2.lerp(p1, p2, t).scale(distance));

                const tx: number = Math.floor((floor.x - Math.floor(floor.x)) * floorTexture.width);
                const ty: number = Math.floor((floor.y - Math.floor(floor.y)) * floorTexture.height);

                const lightColor = this.calculateLights(gs, floor);

                {
                    const srcColor: number = floorTexture.pixels[ty * floorTexture.width + tx];

                    const sr = ((srcColor >> 16) & 0xff);
                    const sg = ((srcColor >> 8) & 0xff);
                    const sb = ((srcColor >> 0) & 0xff);

                    const lr = ((lightColor >> 16) & 0xff) / 256;
                    const lg = ((lightColor >> 8) & 0xff) / 256;
                    const lb = ((lightColor >> 0) & 0xff) / 256;
                    
                    let r = Math.floor(sr * lr);
                    let g = Math.floor(sg * lg);
                    let b = Math.floor(sb * lb);
                    
                    let color = (0xff << 24) | (r << 16) | (g << 8) | (b);
                   
                    backbuffer.buffer[y * backbuffer.width + x] = color;
                }

                {
                    const srcColor: number = ceilTexture.pixels[ty * ceilTexture.width + tx];                    

                    const sr = ((srcColor >> 16) & 0xff);
                    const sg = ((srcColor >> 8) & 0xff);
                    const sb = ((srcColor >> 0) & 0xff);

                    const lr = ((lightColor >> 16) & 0xff) / 256;
                    const lg = ((lightColor >> 8) & 0xff) / 256;
                    const lb = ((lightColor >> 0) & 0xff) / 256;
                    
                    let r = Math.floor(sr * lr);
                    let g = Math.floor(sg * lg);
                    let b = Math.floor(sb * lb);
                    
                    let color = (0xff << 24) | (r << 16) | (g << 8) | (b);

                    const ceilingY: number = (backbuffer.height - y - 1);
                    backbuffer.buffer[ceilingY * backbuffer.width + x] = color;
                }
            }
        }
    }

    drawSprite(gs: GameState, sprite: Sprite, backbuffer: Backbuffer) {

        // Draw sprites
        const halfCameraPlane = this.halfPlaneDir(gs);
        const p0 = gs.playerDir.sub(halfCameraPlane);
        const p1 = gs.playerDir.add(halfCameraPlane);
        const cameraPlane = p1.sub(p0);
        const cameraPlaneNorm = cameraPlane.norm();
        const cameraPlaneLen = cameraPlane.length();

        const near = gs.playerDir.norm().scale(gs.cameraNear);
        const nearLen = near.length();
        
        const spriteTexture = AssetManager.getInstance().getTexture(sprite.textures[sprite.index]);

        const spritePos: Vector2 = sprite.pos;

        const a = spritePos.sub(gs.playerPos);
        const aLen = a.length();

        const denom = a.dot(near);
        if (denom > 0) {

            const cLen: number = (aLen * nearLen * nearLen) / denom;
            const c = a.norm().scale(cLen);

            const t: number = c.sub(p0).dot(cameraPlaneNorm) / cameraPlaneLen;
            const z = a.dot(gs.playerDir.norm());

            const spriteDim = Math.floor(backbuffer.height * sprite.dim / z);
            const worldHeight = backbuffer.height / z;

            const height = sprite.height * 2 - 1;
            const y = Math.floor(backbuffer.height / 2 - spriteDim / 2) - Math.floor((worldHeight / 2 - spriteDim / 2) * height);

            const screenX = Math.floor(t * backbuffer.width);
            const startX = screenX - Math.floor(spriteDim / 2);
            const endX = screenX + Math.floor(spriteDim / 2);

            for (let index = startX; index <= endX; ++index) {

                if (index < 0 || index >= backbuffer.width) continue;
                if (z >= backbuffer.zBuffer[index]) continue;

                const samplePosX = (index - startX) / (endX - startX + 1);

                const srcX = Math.floor((samplePosX * spriteTexture.width));
                const srcY = 0;
                const srcW = 1;
                const srcH = spriteTexture.height;

                const lightColor = this.calculateLights(gs, spritePos);

                backbuffer.drawTexture(spriteTexture, srcX, srcY, srcW, srcH, index, y, 1, spriteDim, false, lightColor);
            }

        }

    }
    
    drawSprites(gs: GameState, backbuffer: Backbuffer) {

        gs.sprites.sort((a, b) => {
            const distanceToA = gs.playerPos.sub(a.pos).length();
            const distanceToB = gs.playerPos.sub(b.pos).length();
            return distanceToB - distanceToA;
        });

        gs.sprites.forEach((sprite) => {
            this.drawSprite(gs, sprite, backbuffer);
        });

    }

    drawWalls(gs: GameState, backbuffer: Backbuffer) {
        
        const rayAmount = backbuffer.width;

        for (let index = 0; index < rayAmount; ++index) {
            const rayFactor: number = ((index / (rayAmount - 1)) * 2 - 1);
            const rayDir: Vector2 = gs.playerDir.add(this.halfPlaneDir(gs).scale(rayFactor)).norm();
            const hit = this.calculateNearIntersection(gs, gs.playerPos, rayDir);

            if (hit.result === true) {

                const texture = AssetManager.getInstance().getTexture(hit.texture);
                
                const hitDir: Vector2 = rayDir.scale(hit.t);
                const hitPos: Vector2 = gs.playerPos.add(hitDir);
                const z = hitDir.dot(gs.playerDir.norm());

                const lightColor = this.calculateLights(gs, hitPos, hit.normal);
                
                backbuffer.zBuffer[index] = z;

                const height = Math.floor(backbuffer.height / z);
                const y = Math.floor((backbuffer.height / 2) - (height / 2));

                let samplePosX = 0;

                if (hit.isVertical) {
                    samplePosX = hitPos.x - Math.floor(hitPos.x);
                } else {
                    samplePosX = hitPos.y - Math.floor(hitPos.y);
                }

                const srcX = Math.floor(samplePosX * texture.width);
                const srcY = 0;
                const srcW = 1;
                const srcH = texture.height;
                backbuffer.drawTexture(texture, srcX, srcY, srcW, srcH, index, y, 1, height, hit.isVertical, lightColor);
            }
        }
    }
}
