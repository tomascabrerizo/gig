export class Vector2 {
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

    rotate(angle: number): Vector2 {
        const rad = angle * Math.PI / 180;
        return new Vector2(
            this.x * Math.cos(rad) - this.y * Math.sin(rad),
            this.x * Math.sin(rad) + this.y * Math.cos(rad),
        );
    }

    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }

    static lerp(a: Vector2, b: Vector2, t: number) {
        return a.scale(1-t).add(b.scale(t));
    }
    
    static angleBetween(a: Vector2, b: Vector2) {
        return Math.acos(a.dot(b) / (a.length() * b.length()));
    }

};
