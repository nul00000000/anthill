#version 300 es

in vec3 position;
in vec3 normal;
in vec2 uvs;

uniform mat4 lightSpaceMatrix;
uniform mat4 transform;

void main()
{
    gl_Position = lightSpaceMatrix * transform * vec4(position, 1.0);
}