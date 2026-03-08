import { mat3, mat4, vec3 } from "gl-matrix";
import { Model } from "../graphics/model";
import { BaseShader, Shader } from "../graphics/shader";
import { Floor } from "./terrain";
import { treeTexture, flatNormalTexture } from "../graphics/assets";
import { worldRand } from "../util/random";

function addIcosehedron(vertices: number[], uvs: number[], indices: number[], x: number, y: number, z: number, r: number, along: vec3 = [0, 1, 0]) {
    //regular icosehedron time
    //did you know the vertices are the corners of three orthogonal 1xphi rectangles (but here we normalize it)

    let c = 1.618 / Math.sqrt(1.618 * 1.618 + 1 * 1) * r;
    let a = 1 / Math.sqrt(1.618 * 1.618 + 1 * 1) * r;

    let indicesBase = vertices.length / 3;

	let verts: vec3[] = [];

    //xz rectangle
    verts.push([ a,  0,  c]);
    verts.push([-a,  0,  c]);
    verts.push([-a,  0, -c]);
    verts.push([ a,  0, -c]);
    uvs.push(0.9, 0.9);
    uvs.push(0.9, 1);
    uvs.push(1, 1);
    uvs.push(1, 0.9);

    //yz rectangle
    verts.push([ 0,   c,  a]);
    verts.push([ 0,   c, -a]);
    verts.push([ 0,  -c, -a]);
    verts.push([ 0,  -c,  a]);
    uvs.push(0.9, 0.9);
    uvs.push(0.9, 1);
    uvs.push(1, 1);
    uvs.push(1, 0.9);

    //xy rectangle
    verts.push([ c,   a,  0]);
    verts.push([ c,  -a,  0]);
    verts.push([-c,  -a,  0]);
    verts.push([-c,   a,  0]);
    uvs.push(0.9, 0.9);
    uvs.push(0.9, 1);
    uvs.push(1, 1);
    uvs.push(1, 0.9);

	let tangent: vec3 = [-along[1], along[0], 0];
	vec3.normalize(tangent, tangent);
	let bitangent: vec3 = [0, 0, 0];
	vec3.cross(bitangent, tangent, along);

	let TBN: mat3 = [tangent[0], tangent[1], tangent[2], along[0], along[1], along[2],
		bitangent[0], bitangent[1], bitangent[2]];

	for(let i = 0; i < verts.length; i++) {
		vec3.transformMat3(verts[i], verts[i], TBN);
		vertices.push(verts[i][0] + x, verts[i][1] + y, verts[i][2] + z);
	}

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

function addBranch(vertices: number[], uvs: number[], indices: number[], 
				   x: number, y: number, z: number, r: number, 
				   along: vec3, length: number, lastAlong: vec3): vec3 {

	let lastTangent: vec3 = [-lastAlong[1], lastAlong[0], 0];
	vec3.normalize(lastTangent, lastTangent);
	let lastBitangent: vec3 = [0, 0, 0];
	vec3.cross(lastBitangent, lastAlong, lastTangent);

	let tangent: vec3 = [-along[1], along[0], 0];
	vec3.normalize(tangent, tangent);
	let bitangent: vec3 = [0, 0, 0];
	vec3.cross(bitangent, along, tangent);

	let TBN: mat3 = [tangent[0], tangent[1], tangent[2], along[0], along[1], along[2],
		bitangent[0], bitangent[1], bitangent[2]];

	let lastTBN: mat3 = [lastTangent[0], lastTangent[1], lastTangent[2], lastAlong[0], lastAlong[1], lastAlong[2],
		lastBitangent[0], lastBitangent[1], lastBitangent[2]];

	let tip: vec3 = [0, length, 0];

	vec3.transformMat3(tip, tip, TBN);

	let trunkRad = r;

	let indicesBase = vertices.length / 3;

	for(let i = 0; i < 6; i++) {

		let angle = i * Math.PI / 3;
		let angleLeft = (i - 1) * Math.PI / 3;

		let bottomRight: vec3 = [Math.cos(angle) * trunkRad / 0.8, 0, Math.sin(angle) * trunkRad / 0.8];
		let topRight: vec3 = [Math.cos(angle) * trunkRad, length, Math.sin(angle) * trunkRad];
		let topLeft: vec3 = [Math.cos(angleLeft) * trunkRad, length, Math.sin(angleLeft) * trunkRad];
		let bottomLeft: vec3 = [Math.cos(angleLeft) * trunkRad / 0.8, 0, Math.sin(angleLeft) * trunkRad / 0.8];

		vec3.transformMat3(bottomRight, bottomRight, lastTBN);
		vec3.transformMat3(topRight, topRight, TBN);
		vec3.transformMat3(topLeft, topLeft, TBN);
		vec3.transformMat3(bottomLeft, bottomLeft, lastTBN);

		vertices.push(bottomRight[0] + x, bottomRight[1] + y, bottomRight[2] + z);
		vertices.push(topRight[0] + x, topRight[1] + y, topRight[2] + z);
		vertices.push(topLeft[0] + x, topLeft[1] + y, topLeft[2] + z);
		vertices.push(bottomLeft[0] + x, bottomLeft[1] + y, bottomLeft[2] + z);

		uvs.push(0, 0);
		uvs.push(0, 0.1);
		uvs.push(0.1, 0.1);
		uvs.push(0.1, 0);
	}

	let bestOff = -1;
	let bestTotal = 1000000;

	for(let i = 0; i < 6; i++) {
		let total = 0;
		for(let j = 0; j < 6; j++) {
			let top = ((j) % 6) * 4 + indicesBase + 1;
			let bottom = ((i + j) % 6) * 4 + indicesBase;
			let topVert = vertices.slice(top * 3, top * 3 + 3);
			let botVert = vertices.slice(bottom * 3, bottom * 3 + 3);
			total += vec3.squaredDistance([topVert[0], topVert[1], topVert[2]], [botVert[0], botVert[1], botVert[2]]);
		}
		if(total < bestTotal) {
			bestOff = i;
			bestTotal = total;
		}
	}

	for(let i = 0; i < 6; i++) {
		let realIndex = (i + bestOff) % 6;
		indices.push(indicesBase + realIndex * 4 + 0, indicesBase + i * 4 + 1, indicesBase + i * 4 + 2);
		indices.push(indicesBase + realIndex * 4 + 0, indicesBase + i * 4 + 2, indicesBase + realIndex * 4 + 3);
	}

	//add branch cap
	indicesBase = vertices.length / 3;
	for(let i = 0; i < 6; i++) {
		let angle = i * Math.PI / 3;
		let topRight: vec3 = [Math.cos(angle) * trunkRad, length, Math.sin(angle) * trunkRad];
		vec3.transformMat3(topRight, topRight, TBN);
		vertices.push(topRight[0] + x, topRight[1] + y, topRight[2] + z);
		uvs.push(1.0, 1.0);
	}

	indices.push(indicesBase + 0, indicesBase + 4, indicesBase + 5);
	indices.push(indicesBase + 0, indicesBase + 3, indicesBase + 4);
	indices.push(indicesBase + 0, indicesBase + 1, indicesBase + 3);
	indices.push(indicesBase + 1, indicesBase + 2, indicesBase + 3);

	tip[0] += x;
	tip[1] += y;
	tip[2] += z;
	
	return tip;
}

//input should be normalized
function randomTangent(norm: vec3): vec3 {
	let tan: vec3 = [0, 0, 0];
	vec3.cross(tan, norm, [-norm[2], norm[0], norm[1]]);
	let bit: vec3 = [0, 0, 0];
	vec3.cross(bit, norm, tan);
	let angle = worldRand() * 3.14159 * 2;
	vec3.scale(tan, tan, Math.cos(angle));
	vec3.scale(bit, bit, Math.sin(angle));
	let ret: vec3 = [0, 0, 0];
	vec3.add(ret, tan, bit);
	return ret;
}

function treeBranches(x: number, y: number, z: number, vertices: number[], uvs: number[], indices: number[], 
					  radius: number, along: vec3, lastAlong: vec3, length: number, levels: number) {
	if(levels <= 1) {
		let tip = addBranch(vertices, uvs, indices, x, y, z, radius, along, length, lastAlong);
		addIcosehedron(vertices, uvs, indices, tip[0], tip[1], tip[2], radius * 7, along);
	} else {
		let next = addBranch(vertices, uvs, indices, x, y, z, radius, along, length, lastAlong);
		let along1: vec3 = [0, 0, 0];
		let along2: vec3 = [0, 0, 0];
		vec3.copy(along1, along);
		vec3.copy(along2, along);
		let t = 0.6;
		let offsetDir: vec3 = randomTangent(along);
		vec3.scale(offsetDir, offsetDir, t);
		vec3.add(along1, along, offsetDir);
		vec3.normalize(along1, along1);
		if(levels > 7) {
			vec3.scale(offsetDir, offsetDir, 0.5);
			vec3.sub(along2, along, offsetDir);
			vec3.normalize(along2, along2);
			treeBranches(next[0], next[1], next[2], vertices, uvs, indices, radius * 0.64, along1, along, length * 0.72, levels - 2);
		} else {
			vec3.sub(along2, along, offsetDir);
			vec3.normalize(along2, along2);
			treeBranches(next[0], next[1], next[2], vertices, uvs, indices, radius * 0.8, along1, along, length * 0.8, levels - 1);
		}
		treeBranches(next[0], next[1], next[2], vertices, uvs, indices, radius * 0.8, along2, along, length * 0.8, levels - 1);
	}
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
			//addBranch(vertices, uvs, indices, 0, 0.15, 0, 0.03, this.terrain.getNormal(x, z, 6), segHeight);
			let groundNorm = this.terrain.getNormal(x / 10 + 0.5, -z / 10 + 0.5, 6);
			treeBranches(0, 0, 0, vertices, uvs, indices, 0.03, groundNorm, groundNorm, 0.15, 10);
			console.log("Tree with " + (vertices.length / 3) + " vertices and " + (indices.length) + " triangles");
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
