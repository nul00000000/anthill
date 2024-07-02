import {mat4, vec3, vec4} from "gl-matrix";
import { BaseShader, ShadowsShader } from "./shader";

export class Shadows {
    width = 1024;
    height = 1024;
    depthMapFBO: WebGLFramebuffer;
    depthMap: WebGLTexture;

    lightSpaceMat: mat4;

    shadowsShader: ShadowsShader;

    ready: boolean = false;

    renderSceneCallback: (shader: BaseShader) => void;

    constructor(gl: WebGL2RenderingContext, renderSceneCallback: (shader: BaseShader) => void, setupCallback: () => void) {

        this.shadowsShader = new ShadowsShader(gl, () => {
            this.ready = true;
            setupCallback();
        });

        this.renderSceneCallback = renderSceneCallback;

        this.depthMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depthMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.depthMapFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthMapFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthMap, 0);
        // gl.drawBuffers([gl.NONE]);
        // gl.readBuffer(gl.NONE);
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    setLightSpaceMatrix(lightPos: vec3, target: vec3): mat4 {
        let ortho = mat4.ortho(mat4.create(), -10.0, 10.0, -10.0, 10.0, 0.1, 40);
        let cam = mat4.lookAt(mat4.create(), lightPos, target, [0, 1, 0]);

        this.lightSpaceMat = mat4.mul(mat4.create(), ortho, cam);
        return this.lightSpaceMat;
    }

    render(gl: WebGL2RenderingContext) {
        //pass 1 to depth map
        if(this.ready) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthMapFBO);
            this.shadowsShader.use();
            this.shadowsShader.loadLightSpaceMatrix(this.lightSpaceMat);

            gl.viewport(0, 0, this.width, this.height);
            gl.clear(gl.DEPTH_BUFFER_BIT);

            // gl.cullFace(gl.FRONT);
            this.renderSceneCallback(this.shadowsShader);
            // gl.cullFace(gl.BACK);
        }
    }
}