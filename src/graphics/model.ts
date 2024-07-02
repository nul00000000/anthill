import { vec3 } from "gl-matrix";
import { BaseShader } from "./shader";

export class Model {
	vaoId: WebGLVertexArrayObject;
	numVertices: number;
	
	positionVboId: WebGLBuffer;
	normalVboId: WebGLBuffer;
	uvsVboId: WebGLBuffer;
	indicesVboId: WebGLBuffer;

	constructor(gl: WebGL2RenderingContext, positions: GLfloat[], uvs: GLfloat[], indices: GLint[], shadeFlat = false, normals: GLfloat[] = []) {
		this.positionVboId = gl.createBuffer();
		this.normalVboId = gl.createBuffer();
		this.uvsVboId = gl.createBuffer();
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

	draw(shader: BaseShader) {
		shader.drawElements(this.vaoId, this.numVertices);
	}
}