import { Model } from "../graphics/model";
import { BaseShader, Shader } from "../graphics/shader";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";
import { vec3 } from "gl-matrix";
import alea from "alea";
import { flatNormalTexture } from "../graphics/assets";

export class Floor {

    chunks: Model[][];
    midChunks: Model[][];
    detailChunks: Model[][];

    numTilesX: number;
    numTilesZ: number;

    texture: WebGLTexture;

    noise: NoiseFunction2D;

    width: number;
    length: number;

    constructor(tileSize: number, numTilesX: number, numTilesZ: number, gl: WebGL2RenderingContext, onDone: (floor: Floor) => any) {
        this.width = tileSize * numTilesX;
        this.length = tileSize * numTilesZ;

        this.numTilesX = numTilesX;
        this.numTilesZ = numTilesZ;

        let random = alea(2134);
        this.noise = createNoise2D(random);

        this.texture = gl.createTexture();

        let texImage = new Image();
        texImage.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texImage);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        texImage.src = "assests/terrain.png";

        this.chunks = [];
        this.midChunks = [];
        this.detailChunks = [];
        for(let i = 0; i < 10; i++) {
            this.chunks[i] = [];
            this.midChunks[i] = [];
            this.detailChunks[i] = [];
            for(let j = 0; j < 10; j++) {
                this.chunks[i][j] = this.createChunk(i, j, -this.width / 2, -this.length / 2, tileSize / 2.0, numTilesX * 2, numTilesZ * 2, 6, gl);
                this.midChunks[i][j] = this.createChunk(i, j, -this.width / 2, -this.length / 2, tileSize / 5.0, 
                    numTilesX * 5, numTilesZ * 5, 6, gl);
                this.detailChunks[i][j] = this.createChunk(i, j, -this.width / 2, -this.length / 2, tileSize / 10.0, 
                        numTilesX * 10, numTilesZ * 10, 6, gl);
            }
        }

        onDone(this);
        
    }

    createChunk(xIndex: number, zIndex: number, offsetX: number, offsetY: number, tileSize: number, 
            numTilesX: number, numTilesZ: number, octaves: number, gl: WebGL2RenderingContext): Model {
        let vertices: number[] = [];
        let uvs: number[] = [];
        let normals: number[] = [];

        let startX = xIndex * numTilesX / 10;
        let endX = (xIndex + 1) * numTilesX / 10;
        let startZ = zIndex * numTilesZ / 10;
        let endZ = (zIndex + 1) * numTilesZ / 10;

        for(let i = startX; i < endX + 1; i++) {
            for(let j = startZ; j < endZ + 1; j++) {
                let height = this.getHeight(i / numTilesX, j / numTilesZ, octaves);
                let normal = this.getNormal(i / numTilesX, j / numTilesZ, octaves);
                vertices.push(i * tileSize + offsetX, height, -j * tileSize - offsetY);
                normals.push(normal[0], normal[1], normal[2]);
                uvs.push(i / numTilesX * 300, j / numTilesZ * 300);
            }
        }

        let indices: number[] = [];

        for(let i = 0; i < numTilesX / 10; i++) {
            for(let j = 0; j < numTilesZ / 10; j++) {
                indices.push(i * (numTilesX / 10 + 1) + j, (i + 1) * (numTilesX / 10 + 1) + j, (i + 1) * (numTilesX / 10 + 1) + j + 1);
                indices.push(i * (numTilesX / 10 + 1) + j, (i + 1) * (numTilesX / 10 + 1) + j + 1, i * (numTilesX / 10 + 1) + j + 1);
            }
        }
        // return new Model(gl, vertices, uvs, indices, false);
        return new Model(gl, vertices, uvs, indices, false, normals);
    }

    getHeight(x: number, z: number, octaves: number): number {
        let a = 0;
        for(let i = 0; i < octaves; i++) {
            let p = Math.pow(2, i);
            a += this.noise(x * p + i * 200, z * p - i * 200) / p;
        }

        return a;
    }

    getNormal(x: number, z: number, octaves: number): vec3 {
        let dydx = (this.getHeight(x + 0.0001, z, octaves) - this.getHeight(x - 0.0001, z, octaves)) / 0.002; //this is because 10 chunks
        let dydz = -(this.getHeight(x, z + 0.0001, octaves) - this.getHeight(x, z - 0.0001, octaves)) / 0.002;
        let cross: vec3 = [-dydx, 1, -dydz]; //v2 x v1
        return vec3.normalize(cross, cross);
    }

    draw(shader: BaseShader, camX: number, camZ: number) {
        shader.loadTexture(this.texture, 1);
        shader.loadTexture(flatNormalTexture, 3);
        for(let i = 0; i < 10; i++) {
            for(let j = 0; j < 10; j++) {
                if(camX / this.width + 0.5 > (i - 1) / 10.0 && camX / this.width + 0.5 < (i + 2) / 10.0 &&
                        -camZ / this.length + 0.5 > (j - 1) / 10.0 && -camZ / this.length + 0.5 < (j + 2) / 10.0) {
                    this.detailChunks[i][j].draw(shader);
                } else if(camX / this.width + 0.5 > (i - 3) / 10.0 && camX / this.width + 0.5 < (i + 4) / 10.0 &&
                -camZ / this.length + 0.5 > (j - 3) / 10.0 && -camZ / this.length + 0.5 < (j + 4) / 10.0) {
                    this.midChunks[i][j].draw(shader);
                } else {
                    this.chunks[i][j].draw(shader);
                }
            }
        }
    }

    drawFullyDetailed(shader: BaseShader) {
        shader.loadTexture(this.texture, 1);
        shader.loadTexture(flatNormalTexture, 3);
        for(let i = 0; i < 10; i++) {
            for(let j = 0; j < 10; j++) {
                this.detailChunks[i][j].draw(shader);
            }
        }
    }
}