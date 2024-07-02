#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uvs;

out vec2 uvCoords;
out vec3 pNormal;

out vec3 fragPos;
out vec4 fragPosLightSpace;
out vec4 fragPosLightSpaceLand;

uniform mat4 transform;
uniform mat4 camera;
uniform mat4 projection;
uniform mat4 lightSpace;
uniform mat4 lightSpaceLand;
uniform float time;

// uniform sampler2D waterMap;
// uniform bool guiMode;

void main(void) {
    vec3 posMod = vec3(0.0, sin(time * 0.5 + position.x + position.y) * 0.03, 0.0);
    // vec3 posMod = vec3(0.0);
	fragPos = vec3(transform * vec4(position + posMod, 1.0));
	// if(guiMode) {
	// 	gl_Position = camera * transform * vec4(position * vec3(1, 1.7777, 0), 1.0);
	// } else {
		gl_Position = projection * camera * vec4(fragPos, 1.0);
        // gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
	// }
    uvCoords = uvs;
	pNormal = vec3(transform * vec4(normal, 0.0));
	fragPosLightSpace = lightSpace * vec4(fragPos, 1.0);
    fragPosLightSpaceLand = lightSpaceLand * vec4(fragPos, 1.0);
}