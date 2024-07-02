#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uvs;

out vec2 uvCoords;
out vec3 pNormal;

out vec3 fragPos;
out vec4 fragPosLightSpace;

uniform mat4 transform;
uniform mat4 camera;
uniform mat4 projection;
uniform mat4 lightSpace;
// uniform bool guiMode;

void main(void) {
	fragPos = vec3(transform * vec4(position, 1.0));
	// if(guiMode) {
	// 	gl_Position = camera * transform * vec4(position * vec3(1, 1.7777, 0), 1.0);
	// } else {
		gl_Position = projection * camera * vec4(fragPos, 1.0);
	// }
    uvCoords = uvs;
	pNormal = vec3(transform * vec4(normal, 0.0));
	fragPosLightSpace = lightSpace * vec4(fragPos, 1.0);
}