import { mat4, vec3 } from "gl-matrix";

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	
	gl.shaderSource(shader, source);
	
	gl.compileShader(shader);
	
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	  alert(
		`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
	  );
	  gl.deleteShader(shader);
	  return null;
	}
  
	return shader;
}

export abstract class BaseShader {
	shaderProgram: WebGLProgram;
	gl: WebGL2RenderingContext;

	attribs: number[];
	uniforms: WebGLUniformLocation[];

	constructor(gl: WebGL2RenderingContext, name: string, attribNames: string[], uniformNames: string[], setupCallback: () => void) {
		this.gl = gl;

		let completed = 0;

		let vertReq = new XMLHttpRequest();
		vertReq.open("GET", "/shaders/" + name + ".vert");
		vertReq.responseType = "text";

		let fragReq = new XMLHttpRequest();
		fragReq.open("GET", "/shaders/" + name + ".frag");
		fragReq.responseType = "text";

		let vertexShaderString: string;
		let fragmentShaderString: string;

		vertReq.onload = () => {
			if(vertReq.status == 200 && vertReq.readyState == 4) {
				vertexShaderString = vertReq.responseText;
				completed++;
				if(completed == 2) {
					this.setupShaders(gl, vertexShaderString, fragmentShaderString, attribNames, uniformNames, setupCallback);
				}
			}
		};

		fragReq.onload = () => {
			if(fragReq.status == 200 && fragReq.readyState == 4) {
				fragmentShaderString = fragReq.responseText;
				completed++;
				if(completed == 2) {
					this.setupShaders(gl, vertexShaderString, fragmentShaderString, attribNames, uniformNames, setupCallback);
				}
			}
		};

		vertReq.send();
		fragReq.send();
	}

	setupShaders(gl: WebGLRenderingContext, vertexShaderString: string, 
			fragmentShaderString: string, attribNames: string[], uniformNames: string[],
			setupCallback: () => void): void {
		// console.log(vertexShaderString);
		let vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderString);
		let fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderString);

		let shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		for(let i = 0; i < attribNames.length; i++) {
			gl.bindAttribLocation(shaderProgram, i, attribNames[i]);	
		}
		gl.linkProgram(shaderProgram);

		if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("no shader program for you sorry :(");
			shaderProgram = null;
		}

		this.shaderProgram = shaderProgram;

		this.attribs = [];
		for(let i = 0; i < attribNames.length; i++) {
			this.attribs[i] = gl.getAttribLocation(shaderProgram, attribNames[i]);
		}

		this.uniforms = [];
		for(let i = 0; i < uniformNames.length; i++) {
			this.uniforms[i] = gl.getUniformLocation(shaderProgram, uniformNames[i]);
		}

		this.use();

		setupCallback();
	}

	use() {
		this.gl.useProgram(this.shaderProgram);
	}

	abstract loadTransform(transform: mat4): void;

	loadTexture(texture: WebGLTexture, slot: number) {
		switch(slot) {
			case 0:
				this.gl.activeTexture(this.gl.TEXTURE0);
				break;
			case 1:
				this.gl.activeTexture(this.gl.TEXTURE1);
				break;
			case 2:
				this.gl.activeTexture(this.gl.TEXTURE2);
				break;
			default:
				console.log("Invalid texture slot");
				return;
		}
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
	}

	drawElements(vaoId: WebGLVertexArrayObject, numVertices: GLint) {
		this.gl.bindVertexArray(vaoId);
		this.gl.drawElements(this.gl.TRIANGLES, numVertices, this.gl.UNSIGNED_INT, 0);
	}
}

export class Shader extends BaseShader {
	constructor(gl: WebGL2RenderingContext, setupCallback: () => void) {
		super(gl, "shader", ["position", "normal"], ["transform", "camera", "projection", "lightSpace", "lightDir", 
				"shadowMap", "tex"], () => {
			gl.uniform1i(this.uniforms[5], 0);
			gl.uniform1i(this.uniforms[6], 1);
			console.log("Main shader initialized");
			setupCallback();
		});
	}

	loadTransform(transform: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[0], false, transform);
	}

	loadCamera(transform: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[1], false, transform);
	}

	loadProjection(transform: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[2], false, transform);
	}

	loadLightSpace(lightSpace: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[3], false, lightSpace);
	}

	loadLightDirection(lightDir: vec3) {
		this.gl.uniform3fv(this.uniforms[4], vec3.normalize(lightDir, lightDir));
	}
}

export class ShadowsShader extends BaseShader {
	constructor(gl: WebGL2RenderingContext, setupCallback: () => void) {
		super(gl, "shadows", ["position", "normal", "uvs"], ["lightSpaceMatrix", "transform"], setupCallback);
		console.log("Shadow shader initialized");
	}

	loadLightSpaceMatrix(lightSpace: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[0], false, lightSpace);
	}

	loadTransform(transform: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[1], false, transform);
	}
}

export class WaterShader extends BaseShader {
	constructor(gl: WebGL2RenderingContext, setupCallback: () => void) {
		super(gl, "water", ["position", "normal"], ["transform", "camera", "projection", 
				"lightSpace", "lightDir", "time", "lightSpaceLand",
				"shadowMap", "tex", "waterMap"], () => {
			gl.uniform1i(this.uniforms[7], 0);
			gl.uniform1i(this.uniforms[8], 1);
			gl.uniform1i(this.uniforms[9], 2);
			console.log("Water shader initialized");
			setupCallback();
		});
	}

	loadTransform(transform: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[0], false, transform);
	}

	loadCamera(transform: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[1], false, transform);
	}

	loadProjection(transform: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[2], false, transform);
	}

	loadLightSpace(lightSpace: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[3], false, lightSpace);
	}

	loadLightDirection(lightDir: vec3) {
		this.gl.uniform3fv(this.uniforms[4], vec3.normalize(lightDir, lightDir));
	}

	loadTime(time: number) {
		this.gl.uniform1f(this.uniforms[5], time);
	}

	loadLightSpaceLand(lightSpace: mat4) {
		this.gl.uniformMatrix4fv(this.uniforms[6], false, lightSpace);
	}
}