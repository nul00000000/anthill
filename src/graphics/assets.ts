export let treeTexture: WebGLTexture;
export let flatNormalTexture: WebGLTexture;

export function initAssets(gl: WebGL2RenderingContext) {
    treeTexture = loadTexture("assests/tree.png", gl);
    flatNormalTexture = loadNormalTexture("assests/flatnormal.png", gl);
}

function loadTexture(path: string, gl: WebGL2RenderingContext) {
    let tex = new Image();
    let glTex = gl.createTexture();
    tex.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, glTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    tex.src = path;
    return glTex;
}

function loadNormalTexture(path: string, gl: WebGL2RenderingContext) {
    let tex = new Image();
    let glTex = gl.createTexture();
    tex.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, glTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    tex.src = path;
    return glTex;
}