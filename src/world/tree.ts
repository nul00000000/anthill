import { mat3, mat4, vec3 } from "gl-matrix";
import { Model } from "../graphics/model";
import { BaseShader, Shader } from "../graphics/shader";
import { Floor } from "./terrain";
import { treeTexture, flatNormalTexture } from "../graphics/assets";

function addIcosehedron(vertices: number[], uvs: number[], indices: number[], x: number, y: number, z: number, r: number) {
    //regular icosehedron time
    //did you know the vertices are the corners of three orthogonal 1xphi rectangles (but here we normalize it)

    let c = 1.618 / Math.sqrt(1.618 * 1.618 + 1 * 1) * r;
    let a = 1 / Math.sqrt(1.618 * 1.618 + 1 * 1) * r;

    let indicesBase = vertices.length / 3;

    //xz rectangle
    vertices.push( a + x,  0 + y,  c + z);
    vertices.push(-a + x,  0 + y,  c + z);
    vertices.push(-a + x,  0 + y, -c + z);
    vertices.push( a + x,  0 + y, -c + z);
    uvs.push(0.9, 0.9);
    uvs.push(0.9, 1);
    uvs.push(1, 1);
    uvs.push(1, 0.9);

    //yz rectangle
    vertices.push( 0 + x,   c + y,  a + z);
    vertices.push( 0 + x,   c + y, -a + z);
    vertices.push( 0 + x,  -c + y, -a + z);
    vertices.push( 0 + x,  -c + y,  a + z);
    uvs.push(0.9, 0.9);
    uvs.push(0.9, 1);
    uvs.push(1, 1);
    uvs.push(1, 0.9);

    //xy rectangle
    vertices.push( c + x,   a + y,  0 + z);
    vertices.push( c + x,  -a + y,  0 + z);
    vertices.push(-c + x,  -a + y,  0 + z);
    vertices.push(-c + x,   a + y,  0 + z);
    uvs.push(0.9, 0.9);
    uvs.push(0.9, 1);
    uvs.push(1, 1);
    uvs.push(1, 0.9);

    //xz edge triangles
    indices.push(indicesBase + 1, indicesBase + 0, indicesBase + 4);
    indices.push(indicesBase + 0, indicesBase + 1, indicesBase + 7);

    indices.push(indicesBase + 3, indicesBase + 2, indicesBase + 5);
    indices.push(indicesBase + 2, indicesBase + 3, indicesBase + 6);

    //yz edge triangles
    indices.push(indicesBase + 5, indicesBase + 4, indicesBase + 8);
    indices.push(indicesBase + 4, indicesBase + 5, indicesBase + 11);

    indices.push(indicesBase + 7, indicesBase + 6, indicesBase + 9);
    indices.push(indicesBase + 6, indicesBase + 7, indicesBase + 10);

    //xy edge triangles
    indices.push(indicesBase + 9, indicesBase + 8, indicesBase + 0);
    indices.push(indicesBase + 8, indicesBase + 9, indicesBase + 3);

    indices.push(indicesBase + 11, indicesBase + 10, indicesBase + 1);
    indices.push(indicesBase + 10, indicesBase + 11, indicesBase + 2);

    //corner triangles (the other eight)
    indices.push(indicesBase + 4, indicesBase + 0, indicesBase + 8); //+x+y+z
    indices.push(indicesBase + 3, indicesBase + 5, indicesBase + 8); //+x+y-z
    indices.push(indicesBase + 0, indicesBase + 7, indicesBase + 9); //+x-y+z
    indices.push(indicesBase + 1, indicesBase + 4, indicesBase + 11); //-x+y+z
    
    indices.push(indicesBase + 7, indicesBase + 1, indicesBase + 10); //-x-y+z
    indices.push(indicesBase + 5, indicesBase + 2, indicesBase + 11); //-x+y-z
    indices.push(indicesBase + 6, indicesBase + 3, indicesBase + 9); //+x-y-z

    indices.push(indicesBase + 2, indicesBase + 6, indicesBase + 10); //-x-y-z
}

export class Tree {

    x: number;
    z: number;

    height: number;

    mesh: Model;

    terrain: Floor;

    constructor(x: number, z: number, segHeight: number, numSegs: number, terrain: Floor, gl: WebGL2RenderingContext) {
        this.x = x;
        this.z = z;
        this.height = segHeight * numSegs;

        this.terrain = terrain;

        let vertices: number[] = [];
        let uvs: number[] = [];
        let indices: number[] = [];
        for(let j = 0; j < numSegs; j++) {
            let groundNorm = terrain.getNormal(x / 10 + 0.5, -z / 10 + 0.5, 6);
            groundNorm = vec3.lerp(groundNorm, groundNorm, [0, 1, 0], 0.5);
            let tangent: vec3 = [-groundNorm[1], groundNorm[0], 0];
            vec3.normalize(tangent, tangent);
            let bitangent: vec3 = [0, 0, 0];
            vec3.cross(bitangent, groundNorm, tangent);

            let TBN: mat3 = [tangent[0], tangent[1], tangent[2], 
                            groundNorm[0], groundNorm[1], groundNorm[2],
                            bitangent[0], bitangent[1], bitangent[2]];

            let tip: vec3 = [0, segHeight * (j + 1), 0];

            vec3.transformMat3(tip, tip, TBN);

            for(let i = 0; i < 6; i++) {

                let angle = i * Math.PI / 3;
                let angleLeft = (i - 1) * Math.PI / 3;
                let indicesBase = vertices.length / 3;

                let bottomRight: vec3 = [Math.cos(angle) * 0.06, j * segHeight, Math.sin(angle) * 0.06];
                let topRight: vec3 = [Math.cos(angle) * 0.06, (j + 1) * segHeight, Math.sin(angle) * 0.06];
                let topLeft: vec3 = [Math.cos(angleLeft) * 0.06, (j + 1) * segHeight, Math.sin(angleLeft) * 0.06];
                let bottomLeft: vec3 = [Math.cos(angleLeft) * 0.06, j * segHeight, Math.sin(angleLeft) * 0.06];

                vec3.transformMat3(bottomRight, bottomRight, TBN);
                vec3.transformMat3(topRight, topRight, TBN);
                vec3.transformMat3(topLeft, topLeft, TBN);
                vec3.transformMat3(bottomLeft, bottomLeft, TBN);

                vertices.push(bottomRight[0], bottomRight[1], bottomRight[2]);
                vertices.push(topRight[0], topRight[1], topRight[2]);
                vertices.push(topLeft[0], topLeft[1], topLeft[2]);
                vertices.push(bottomLeft[0], bottomLeft[1], bottomLeft[2]);

                uvs.push(0, 0);
                uvs.push(0, 0.1);
                uvs.push(0.1, 0.1);
                uvs.push(0.1, 0);

                indices.push(indicesBase + 0, indicesBase + 1, indicesBase + 2);
                indices.push(indicesBase + 0, indicesBase + 2, indicesBase + 3);
            }
            addIcosehedron(vertices, uvs, indices, tip[0], tip[1], tip[2], 0.16);
        }

        this.mesh = new Model(gl, vertices, uvs, indices, true);
    }

    draw(shader: BaseShader) {
        shader.loadTexture(treeTexture, 1);
        shader.loadTexture(flatNormalTexture, 3);
        let trans: mat4 = mat4.create();
        mat4.translate(trans, trans, [this.x, this.terrain.getHeight(this.x / 10 + 0.5, -this.z / 10 + 0.5, 6) - 0.01, this.z]);
        shader.loadTransform(trans);
        this.mesh.draw(shader);
    }

}