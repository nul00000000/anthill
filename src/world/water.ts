import { mat4 } from "gl-matrix";
import { Model } from "../graphics/model";
import { BaseShader, ShadowsShader, WaterShader } from "../graphics/shader";

export class Water {

    landOutlineWidth = 1024 * 4;
    landOutlineHeight = 1024 * 4;
    waterMapFBO: WebGLFramebuffer;
    waterMap: WebGLTexture;

    chunks: Model[][];
    detailChunks: Model[][];

    texture: WebGLTexture;

    width: number;
    length: number;

    landOutliner: ShadowsShader;
    lightSpace: mat4;

    constructor(tileSize: number, numTilesX: number, numTilesZ: number, landOutliner: ShadowsShader, 
            waterShader: WaterShader, gl: WebGL2RenderingContext) {
        this.width = tileSize * numTilesX;
        this.length = tileSize * numTilesZ;

        this.landOutliner = landOutliner;

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
        texImage.src = "assests/water.png";

        this.waterMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.waterMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, this.landOutlineWidth, this.landOutlineHeight, 
            0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.waterMapFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.waterMapFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.waterMap, 0);

        this.chunks = [];
        this.detailChunks = [];
        for(let i = 0; i < 10; i++) {
            this.chunks[i] = [];
            this.detailChunks[i] = [];
            for(let j = 0; j < 10; j++) {
                this.chunks[i][j] = this.createChunk(i, j, -this.width / 2, -this.length / 2, tileSize, numTilesX, numTilesZ, 6, gl);
                this.detailChunks[i][j] = this.createChunk(i, j, -this.width / 2, -this.length / 2, tileSize * 0.1, 
                        numTilesX * 10, numTilesZ * 10, 6, gl);
            }
        }

        this.lightSpace = mat4.ortho(mat4.create(), -5, 5, -5, 5, 0.1, 20);
        let lookDown = mat4.create();
        mat4.translate(lookDown, lookDown, [0, 10, 0]);
        mat4.rotateX(lookDown, lookDown, -Math.PI / 2);
        mat4.invert(lookDown, lookDown);
        mat4.mul(this.lightSpace, this.lightSpace, lookDown);
        waterShader.use();
        waterShader.loadLightSpaceLand(this.lightSpace);
        
    }

    updateLandOutline(gl: WebGL2RenderingContext, renderScene: (shader: BaseShader) => void) {
        this.landOutliner.use();
        this.landOutliner.loadLightSpaceMatrix(this.lightSpace);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.waterMapFBO);

        gl.viewport(0, 0, this.landOutlineHeight, this.landOutlineWidth);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // gl.cullFace(gl.FRONT);
        renderScene(this.landOutliner);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // gl.cullFace(gl.BACK);
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
                vertices.push(i * tileSize + offsetX, 0, -j * tileSize - offsetY);
                normals.push(0, 1, 0);
                uvs.push(i / numTilesX, j / numTilesZ);
            }
        }

        let indices: number[] = [];

        for(let i = 0; i < numTilesX / 10; i++) {
            for(let j = 0; j < numTilesZ / 10; j++) {
                indices.push(i * (numTilesX / 10 + 1) + j, (i + 1) * (numTilesX / 10 + 1) + j, (i + 1) * (numTilesX / 10 + 1) + j + 1);
                indices.push(i * (numTilesX / 10 + 1) + j, (i + 1) * (numTilesX / 10 + 1) + j + 1, i * (numTilesX / 10 + 1) + j + 1);
            }
        }
        return new Model(gl, vertices, uvs, indices, false, normals);
    }

    draw(shader: WaterShader, camX: number, camZ: number) {
        shader.loadTexture(this.waterMap, 2);
        shader.loadTexture(this.texture, 1);
        for(let i = 0; i < 10; i++) {
            for(let j = 0; j < 10; j++) {
                if(camX / this.width + 0.5 > (i - 1) / 10.0 && camX / this.width + 0.5 < (i + 2) / 10.0 &&
                        -camZ / this.length + 0.5 > (j - 1) / 10.0 && -camZ / this.length + 0.5 < (j + 2) / 10.0) {
                    this.detailChunks[i][j].draw(shader);
                } else {
                    this.chunks[i][j].draw(shader);
                }
            }
        }
    }
}