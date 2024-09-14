(() => {

    class Vector2 {
        x: number;
        y: number;

        constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
        }

        add(other: Vector2): Vector2 {
            return new Vector2(this.x + other.x, this.y + other.y);
        }

        sub(other: Vector2): Vector2 {
            return new Vector2(this.x - other.x, this.y - other.y);
        }

        scale(value: number): Vector2 {
            return new Vector2(this.x * value, this.y * value);
        }

        length(): number {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        norm(): Vector2 {
            const length = this.length();
            if (length === 0) return new Vector2(0, 0);
            const invLength = 1.0 / length;
            return new Vector2(this.x * invLength, this.y * invLength);
        }

        perp(): Vector2 {
            return new Vector2(-this.y, this.x);
        }

        rotate(angle: number) : Vector2 {
            const rad = angle * Math.PI / 180;
            return new Vector2(
                this.x*Math.cos(rad)-this.y*Math.sin(rad),
                this.x*Math.sin(rad)+this.y*Math.cos(rad),
            );
        }

        dot(other: Vector2): number {
            return this.x*other.x + this.y*other.y;
        }
        
    };

    const GRID_COLS: number = 10;
    const GRID_ROWS: number = 8;
    const MAP: number[] = [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        2, 0, 0, 0, 0, 0, 0, 0, 0, 2,
        2, 0, 0, 3, 3, 3, 4, 0, 0, 2,
        2, 0, 0, 3, 0, 0, 4, 0, 0, 2,
        2, 0, 0, 0, 0, 0, 4, 0, 0, 2,
        2, 0, 0, 0, 0, 0, 4, 0, 0, 2,
        2, 0, 0, 0, 0, 0, 0, 0, 0, 2,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ];
    const MAP_COLORS: string[] = [
        "#000000",
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ff00ff",
        "#00ffff",
    ];
    
    const SCREEN_WIDTH: number = 800;
    const SCREEN_HEIGHT: number = 600;
    const SCREEN_TILE_SIZE_X: number = SCREEN_WIDTH / GRID_COLS;
    const SCREEN_TILE_SIZE_Y: number = SCREEN_HEIGHT / GRID_ROWS;
    const SCREEN_PLAYER_SIZE: number = 10;
    const RAY_SIZE = 6;
    const RAY_AMOUNT = SCREEN_WIDTH / RAY_SIZE;
    
    let playerPos: Vector2 = new Vector2(GRID_COLS / 2 - 0.5, GRID_ROWS / 2 + 0.5);
    let playerDir: Vector2 = new Vector2(1, 0);
    let playerFOV: number = 90;
    const playerSpeed: number = 0.1;
    
    function worldToScreen(worldPos: Vector2): Vector2 {
        return new Vector2(
            worldPos.x * SCREEN_TILE_SIZE_X,
            worldPos.y * SCREEN_TILE_SIZE_Y
        );
    }

    type Hit = {
        result: boolean,
        t: number,
        color: string,
    };

    function calculateNearIntersection(pos: Vector2, dir: Vector2): Hit {

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
        } else {
            edgeX = Math.ceil(pos.x);
            stepX = 1;
        }

        let edgeY: number;
        if (dy < 0) {
            edgeY = Math.floor(pos.y);
            stepY = -1;
        } else {
            edgeY = Math.ceil(pos.y);
            stepY = 1;
        }

        let maxSteps = 10;
        while (maxSteps > 0) {
            maxSteps = maxSteps - 1;

            const tx: number = (edgeX - pos.x) / dx;
            const ty: number = (edgeY - pos.y) / dy;

            let tIntersect = 0;
            if (tx < ty) {
                edgeX += stepX;
                mapX += stepX;
                tIntersect = tx;
            } else {
                edgeY += stepY;
                mapY += stepY;
                tIntersect = ty;
            }

            if (MAP[mapY * GRID_COLS + mapX] !== 0) {
                return {
                    result: true,
                    t: tIntersect,
                    color: MAP_COLORS[MAP[mapY * GRID_COLS + mapX]],
                };
            }
        }

        return { result: false, t: 0, color: "#000000" };
    }

    function drawLine(ctx: CanvasRenderingContext2D, p1: Vector2, p2: Vector2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    function drawCircle(ctx: CanvasRenderingContext2D, center: Vector2, radius: number) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);
        ctx.fill();
    }

    function drawMap(ctx: CanvasRenderingContext2D) {
        const scale: number = 0.2;
        const scaleTileX = SCREEN_TILE_SIZE_X*scale;
        const scaleTileY = SCREEN_TILE_SIZE_Y*scale;
        for (let y = 0; y < GRID_ROWS; ++y) {
            for (let x = 0; x < GRID_COLS; ++x) {
                if (MAP[y * GRID_COLS + x] !== 0) {
                    ctx.fillStyle = "white";
                } else {
                    ctx.fillStyle = "#222222";
                }
                ctx.fillRect(x*scaleTileX, y*scaleTileY, scaleTileX, scaleTileY);
            }
        }
    }

    function drawMap3d(ctx: CanvasRenderingContext2D) {
        const playerRight: Vector2 = playerDir.perp();
        
        const halfFovRad: number = (playerFOV / 2) * Math.PI / 180;
        const halfFovLen: number = Math.tan(halfFovRad) * playerDir.length();
        const rayAmount = RAY_AMOUNT;
        for (let index = 0; index < rayAmount; ++index) {
            const t: number = (index / (rayAmount - 1)) * 2 - 1
            const rayDir: Vector2 = playerDir.add(playerDir.perp().scale(t * halfFovLen));
            const hit = calculateNearIntersection(playerPos, rayDir);
            if (hit.result === true) {

                const hitDir = rayDir.scale(hit.t);
                const hitPos = playerPos.add(hitDir);
                const hitProjPos = playerPos.add(playerRight.scale(hitDir.dot(playerRight)));
                const z = hitProjPos.sub(hitPos).length();
          
                const height = SCREEN_HEIGHT / z;
                const width = RAY_SIZE;
                const x = index * RAY_SIZE;
                const y = (SCREEN_HEIGHT / 2) - (height / 2);
                ctx.fillStyle = hit.color;
                ctx.fillRect(x, y, width, height);
            }
        }
    }
    
    function draw(ctx: CanvasRenderingContext2D) {
        ctx.reset();
        drawMap3d(ctx);
        drawMap(ctx);
    }

    const canvas = document.getElementById("canvas") as (HTMLCanvasElement | null);
    if (canvas === null) {
        throw new Error("cannot find canvas with id 'canvas'");
    }

    const ctx = canvas.getContext("2d") as (CanvasRenderingContext2D | null);
    if (ctx === null) {
        throw new Error("2d context is not supported");
    }

    console.log("Welcome to my raycasting GAME!");
    
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    canvas.style.backgroundColor = "#444444";

    canvas.addEventListener("mousemove", (event) => {
        // const mousePos = new Vector2(event.offsetX, event.offsetY);
        // playerDir = mousePos.sub(worldToScreen(playerPos)).norm();
        // draw(ctx);
    });

    window.addEventListener("keydown", (event) => {
        if(event.key === "w") {
            playerPos = playerPos.add(playerDir.scale(playerSpeed));
        }
        if(event.key === "s") {
            playerPos = playerPos.sub(playerDir.scale(playerSpeed));
        }
        if(event.key === "ArrowLeft") {
            playerDir = playerDir.rotate(-10);
        }
        if(event.key == "ArrowRight") {
            playerDir = playerDir.rotate(10);
        }
        draw(ctx);
    });

    draw(ctx);

})();
