import { mat4, vec3 } from "gl-matrix";
import { Model } from "./graphics/model";
import { Shader, BaseShader, WaterShader, MainShader } from "./graphics/shader";
import { Shadows } from "./graphics/shadows";
import { Floor } from "./world/terrain";
import { Water } from "./world/water";
import { Tree } from "./world/tree";
import { initAssets } from "./graphics/assets";

let gl: WebGL2RenderingContext;
let canvas: HTMLCanvasElement;

let shader: Shader;
let shadows: Shadows;

let waterShader: WaterShader;

let mainShader: MainShader;

let cube: Model;
let plane: Model;
let testAngle = 0;

let cameraPos: vec3 = [0, 1.5, 0];
let cameraYaw: number = 0;
let cameraPitch: number = 0;

let keys: {[id: string] : boolean} = {};

let floor: Floor;
let water: Water;

let trees: Tree[] = [];

function init() {
	shader.use();

	shadows = new Shadows(gl, (shader) => {renderFloor(shader); renderMain(shader);}, () => {
		setLightTowardsCenter([1, 5, 4]);
		// setLightTowardsCenter([1, 5, 4]);
		water = new Water(0.1, 100, 100, shadows.shadowsShader, waterShader, gl);
		water.updateLandOutline(gl, (shader: BaseShader) => {
			shader.loadTransform(mat4.create());
			floor.drawFullyDetailed(shader);
		});
	});

	initAssets(gl);

	floor = new Floor(0.1, 100, 100, gl, (floor: Floor) => {
		for(let i = 0; i < 20; i++) {
			let x = Math.random() * 10 - 5;
			let z = Math.random() * 10 - 5;
			if(floor.getHeight(x / 10 + 0.5, -z / 10 + 0.5, 6) < 0.1) {
				i--;
				continue;
			}
			trees.push(new Tree(x, z, 0.6, 1, floor, gl));
		}
	});

	cube = new Model(gl, [
		-0.5, -0.5, -0.5, 
		-0.5, 0.5, -0.5, 
		0.5, 0.5, -0.5, 
		0.5, -0.5, -0.5,
		-0.5, -0.5, 0.5, 
		-0.5, 0.5, 0.5, 
		0.5, 0.5, 0.5, 
		0.5, -0.5, 0.5], 
		[
			1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0,
			0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1,
			0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1,
			1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0,
			0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0,
			1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0
		],
		[
			0, 1, 3, 1, 2, 3,
			4, 7, 5, 5, 7, 6,
			0, 4, 1, 4, 5, 1,
			3, 2, 6, 6, 7, 3,
			1, 6, 2, 1, 5, 6,
			0, 3, 7, 0, 7, 4
		], true);
	plane = new Model(gl, [
		-0.5, -0.5, 0.0, 
		-0.5, 0.5, 0.0, 
		0.5, 0.5, 0.0, 
		0.5, -0.5, 0.0],
		[
			0, 0,
			0, 1,
			1, 1,
			1, 0
		],
		[
			0, 3, 1, 1, 3, 2
		], false);

	let fov = 45 * Math.PI / 180; //this has been vertical fov the whole time
	let aspect = (gl.canvas as HTMLCanvasElement).clientWidth / (gl.canvas as HTMLCanvasElement).clientHeight;
	let zNear = 0.01;
	let zFar = 20.0;
	let projection = mat4.create();

	mat4.perspective(projection, fov, aspect, zNear, zFar);
	shader.loadProjection(projection);

	waterShader.use();
	waterShader.loadProjection(projection);

	mainShader.use();
	mainShader.loadProjection(projection);

	console.log("Game initialized");
	window.requestAnimationFrame(loop);
}

function update(delta: number) {
	let speed = 0.1;
	testAngle += 0.01;
	if(keys["KeyD"]) {
		vec3.add(cameraPos, cameraPos, [Math.cos(-cameraYaw) * delta * speed, 0, Math.sin(-cameraYaw) * delta * speed]);
	}
	if(keys["KeyS"]) {
		vec3.add(cameraPos, cameraPos, [-Math.sin(-cameraYaw) * delta * speed, 0, Math.cos(-cameraYaw) * delta * speed]);
	}
	if(keys["KeyA"]) {
		vec3.add(cameraPos, cameraPos, [-Math.cos(-cameraYaw) * delta * speed, 0, -Math.sin(-cameraYaw) * delta * speed]);
	}
	if(keys["KeyW"]) {
		vec3.add(cameraPos, cameraPos, [Math.sin(-cameraYaw) * delta * speed, 0, -Math.cos(-cameraYaw) * delta * speed]);
	}
	cameraPos[1] = floor.getHeight(cameraPos[0] / 10 + 0.5, -cameraPos[2] / 10 + 0.5, 6) + 0.1;
}

function renderFloor(shader: BaseShader) {
	let translation = mat4.create();

	mat4.translate(translation, translation, [0, 1, 1]);
	mat4.rotateY(translation, translation, testAngle);
	mat4.scale(translation, translation, [0.1, 0.1, 0.1]);

	shader.loadTransform(translation);
	
	cube.draw(shader);

	shader.loadTransform(mat4.create());

	floor.draw(shader, cameraPos[0], cameraPos[2]);

	// setLightTowardsCenter([Math.cos(testAngle) * 5, 5, Math.sin(testAngle) * 5]);
}

function renderMain(shader: BaseShader) {

	for(let i = 0; i < trees.length; i++) {
		trees[i].draw(shader);
	}

	// setLightTowardsCenter([Math.cos(testAngle) * 5, 5, Math.sin(testAngle) * 5]);
}

function draw(gl: WebGL2RenderingContext) {
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	shadows.render(gl);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	shader.use();
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.depthFunc(gl.LEQUAL);

	// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, shadows.depthMap);

	let camera = mat4.create();
	mat4.translate(camera, camera, cameraPos);
	mat4.rotateY(camera, camera, cameraYaw);
	mat4.rotateX(camera, camera, cameraPitch);
	mat4.invert(camera, camera);
	shader.loadCamera(camera);

	// let camera = mat4.ortho(mat4.create(), -5, 5, -5, 5, 0.1, 20);
    // let lookDown = mat4.create();
    // mat4.translate(lookDown, lookDown, [0, 10, 0]);
    // mat4.rotateX(lookDown, lookDown, -Math.PI / 2);
    // mat4.invert(lookDown, lookDown);
    // mat4.mul(camera, camera, lookDown);

	// shader.loadProjection(mat4.create());
	// shader.loadCamera(camera);

	renderFloor(shader);

	mainShader.use();
	mainShader.loadCamera(camera);

	renderMain(mainShader);

	if(water) {
		waterShader.use();
		// waterShader.loadProjection(mat4.create());
		waterShader.loadCamera(camera);
		waterShader.loadTime(testAngle);
		waterShader.loadTransform(mat4.create());
		water.draw(waterShader, camera[0], camera[2]);
	}
}

let lastTimestamp: number;

function setLightTowardsCenter(lightPos: vec3) {
	shader.use();
	let lsm = shadows.setLightSpaceMatrix(lightPos, [0, 0, 0]);
	shader.loadLightSpace(lsm);
	shader.loadLightDirection([-lightPos[0], -lightPos[1], -lightPos[2]]);
	waterShader.use();
	waterShader.loadLightSpace(lsm);
	waterShader.loadLightDirection([-lightPos[0], -lightPos[1], -lightPos[2]]);

	mainShader.use();
	mainShader.loadLightSpace(lsm);
	mainShader.loadLightDirection([-lightPos[0], -lightPos[1], -lightPos[2]]);
}

function loop(timestamp: number) {
	let delta = timestamp - lastTimestamp;
	update(delta * 0.001);
	draw(gl);
	window.requestAnimationFrame(loop);
	lastTimestamp = timestamp;
}

function main() {
	canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;
	gl = canvas.getContext("webgl2");

	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);
	console.log(canvas.width + " " + canvas.height + " : " + canvas.clientWidth + " " + canvas.clientHeight);

	if (gl === null) {
		alert(
		"Unable to initialize WebGL2. Your browser or machine may not support it.",
		);
		return;
	}

	shader = new Shader(gl, () => {
		mainShader = new MainShader(gl, () => {
			waterShader = new WaterShader(gl, init);
		});
	});
}

main();

document.addEventListener("keydown", (e: KeyboardEvent) => {
	keys[e.code] = true;
});

document.addEventListener("keyup", (e: KeyboardEvent) => {
	keys[e.code] = false;
});

document.addEventListener("click", async () => {
	canvas.requestPointerLock();
});

document.addEventListener("mousemove", (e: MouseEvent) => {
	if(document.pointerLockElement) {
		cameraYaw -= e.movementX * 0.003;
		cameraPitch -= e.movementY * 0.003;
		if(cameraPitch < -Math.PI / 2) {
			cameraPitch = -Math.PI / 2;
		} else if(cameraPitch > Math.PI / 2) {
			cameraPitch = Math.PI / 2;
		}
	}
});