import { mat2, vec2, vec3 } from "gl-matrix";
import { BaseShader } from "./shader";

export class Model {
	vaoId: WebGLVertexArrayObject;
	numVertices: number;
	
	positionVboId: WebGLBuffer;
	normalVboId: WebGLBuffer;
	uvsVboId: WebGLBuffer;
	tangentsVboId: WebGLBuffer;
	bitangentsVboId: WebGLBuffer;
	indicesVboId: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext, positions: GLfloat[], uvs: GLfloat[], indices: GLint[], shadeFlat = false, normals: GLfloat[] = []) {
		this.positionVboId = gl.createBuffer();
		this.normalVboId = gl.createBuffer();
		this.uvsVboId = gl.createBuffer();
		this.tangentsVboId = gl.createBuffer();
		this.bitangentsVboId = gl.createBuffer();
		this.vaoId = gl.createVertexArray();

		gl.bindVertexArray(this.vaoId);

		let p = positions;
		let i = indices;

		if(shadeFlat) {
			let d = this.duplicateVertices(positions, indices);
			p = d.vertices;
			i = d.indices;
		}

		this.numVertices = i.length;

		let n = normals;
		if(n.length != p.length) {
			n = this.calculateNormals(p, i);
		}

		let t: GLfloat[], b: GLfloat[];
		[t, b] = this.calculateTangentBiTangent(p, uvs, i);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVboId);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalVboId);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(n), gl.STATIC_DRAW);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(1);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.uvsVboId);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(2);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentsVboId);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(t), gl.STATIC_DRAW);
		gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(3);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.bitangentsVboId);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b), gl.STATIC_DRAW);
		gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(4);

		this.indicesVboId = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesVboId);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(i), gl.STATIC_DRAW);
	}

	duplicateVertices(positions: GLfloat[], indices: GLint[]): {vertices: GLfloat[], indices: GLint[]} {
		let newVerts: GLfloat[] = [];
		let newInds: GLint[] = [];

		for(let i = 0; i < indices.length; i++) {
			newVerts.push(positions[indices[i] * 3]);
			newVerts.push(positions[indices[i] * 3 + 1]);
			newVerts.push(positions[indices[i] * 3 + 2]);
			newInds.push(i);
		}

		return {vertices: newVerts, indices: newInds};
	}

	calculateNormals(positions: GLfloat[], indices: GLint[]): GLfloat[] {
		let normals: GLfloat[] = [];

		for(let i = 0; i < positions.length; i++) {
			normals[i] = 0;
		}

		for(let i = 0; i < indices.length / 3; i++) {
			let v1Index = indices[i * 3];
			let v2Index = indices[i * 3 + 1];
			let v3Index = indices[i * 3 + 2];
			let v1 = vec3.fromValues(positions[v1Index * 3], positions[v1Index * 3 + 1], positions[v1Index * 3 + 2]);
			let v2 = vec3.fromValues(positions[v2Index * 3], positions[v2Index * 3 + 1], positions[v2Index * 3 + 2]);
			let v3 = vec3.fromValues(positions[v3Index * 3], positions[v3Index * 3 + 1], positions[v3Index * 3 + 2]);
			let cross = vec3.cross(vec3.create(), vec3.sub(v3, v3, v2), vec3.sub(v1, v1, v2));
			vec3.normalize(cross, cross);
			normals[v1Index * 3] += cross[0];
			normals[v1Index * 3 + 1] += cross[1];
			normals[v1Index * 3 + 2] += cross[2];
			normals[v2Index * 3] += cross[0];
			normals[v2Index * 3 + 1] += cross[1];
			normals[v2Index * 3 + 2] += cross[2];
			normals[v3Index * 3] += cross[0];
			normals[v3Index * 3 + 1] += cross[1];
			normals[v3Index * 3 + 2] += cross[2];
		}

		for(let i = 0; i < normals.length / 3; i++) {
			let len = Math.sqrt(normals[i * 3] * normals[i * 3] + 
			normals[i * 3 + 1] * normals[i * 3 + 1] +
			normals[i * 3 + 2] * normals[i * 3 + 2]);
			normals[i * 3] /= len;
			normals[i * 3 + 1] /= len;
			normals[i * 3 + 2] /= len;
		}

		return normals;
	}

	// out[0] is tangents out[1] is bitangents
	calculateTangentBiTangent(positions: GLfloat[], uvs: GLfloat[], indices: GLint[]): GLfloat[][] {
		let tangents: GLfloat[] = [];
		let bitangents: GLfloat[] = [];

		for(let i = 0; i < positions.length; i++) {
			tangents[i] = 0;
			bitangents[i] = 0;
		}

		for(let i = 0; i < indices.length / 3; i++) {
			let v1Index = indices[i * 3];
			let v2Index = indices[i * 3 + 1];
			let v3Index = indices[i * 3 + 2];
			let v1: vec3 = [positions[v1Index * 3], positions[v1Index * 3 + 1], positions[v1Index * 3 + 2]];
			let v2: vec3 = [positions[v2Index * 3], positions[v2Index * 3 + 1], positions[v2Index * 3 + 2]];
			let v3: vec3 = [positions[v3Index * 3], positions[v3Index * 3 + 1], positions[v3Index * 3 + 2]];
			let uv1: vec2 = [uvs[v1Index * 2], uvs[v1Index * 2 + 1]];
			let uv2: vec2 = [uvs[v2Index * 2], uvs[v2Index * 2 + 1]];
			let uv3: vec2 = [uvs[v3Index * 2], uvs[v3Index * 2 + 1]];
			let edge1 = vec3.sub(vec3.create(), v1, v2);
			let edge2 = vec3.sub(vec3.create(), v3, v2);
			let duv1 = vec2.sub(vec2.create(), uv1, uv2);
			let duv2 = vec2.sub(vec2.create(), uv3, uv2);

			let f = 1.0 / (duv1[0] * duv2[1] - duv1[1] * duv2[0]);

			let tan: vec3 = [
				f * (duv2[1] * edge1[0] - duv1[1] * edge2[0]),
				f * (duv2[1] * edge1[1] - duv1[1] * edge2[1]),
				f * (duv2[1] * edge1[2] - duv1[1] * edge2[2])
			];

			let bitan: vec3 = [
				f * (duv2[0] * edge1[0] - duv1[0] * edge2[0]),
				f * (duv2[0] * edge1[1] - duv1[0] * edge2[1]),
				f * (duv2[0] * edge1[2] - duv1[0] * edge2[2])
			];

			vec3.normalize(tan, tan);
			vec3.normalize(bitan, bitan);

			tangents[v1Index * 3] += tan[0];
			tangents[v1Index * 3 + 1] += tan[1];
			tangents[v1Index * 3 + 2] += tan[2];
			tangents[v2Index * 3] += tan[0];
			tangents[v2Index * 3 + 1] += tan[1];
			tangents[v2Index * 3 + 2] += tan[2];
			tangents[v3Index * 3] += tan[0];
			tangents[v3Index * 3 + 1] += tan[1];
			tangents[v3Index * 3 + 2] += tan[2];

			bitangents[v1Index * 3] += bitan[0];
			bitangents[v1Index * 3 + 1] += bitan[1];
			bitangents[v1Index * 3 + 2] += bitan[2];
			bitangents[v2Index * 3] += bitan[0];
			bitangents[v2Index * 3 + 1] += bitan[1];
			bitangents[v2Index * 3 + 2] += bitan[2];
			bitangents[v3Index * 3] += bitan[0];
			bitangents[v3Index * 3 + 1] += bitan[1];
			bitangents[v3Index * 3 + 2] += bitan[2];
		}

		for(let i = 0; i < tangents.length / 3; i++) {
			let len = Math.sqrt(tangents[i * 3] * tangents[i * 3] + 
				tangents[i * 3 + 1] * tangents[i * 3 + 1] +
				tangents[i * 3 + 2] * tangents[i * 3 + 2]);
			let bilen = Math.sqrt(bitangents[i * 3] * bitangents[i * 3] + 
				bitangents[i * 3 + 1] * bitangents[i * 3 + 1] +
				bitangents[i * 3 + 2] * bitangents[i * 3 + 2]);
			tangents[i * 3] /= len;
			tangents[i * 3 + 1] /= len;
			tangents[i * 3 + 2] /= len;
			bitangents[i * 3] /= bilen;
			bitangents[i * 3 + 1] /= bilen;
			bitangents[i * 3 + 2] /= bilen;
		}

		return [tangents, bitangents];
	}

	draw(shader: BaseShader) {
		shader.drawElements(this.vaoId, this.numVertices);
	}
}