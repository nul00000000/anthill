#version 300 es

precision lowp float;

in vec3 pNormal;
in vec2 uvCoords;
in vec3 fragPos;
in vec4 fragPosLightSpace;
in mat3 TBN;

out vec4 fragColor;

uniform vec3 lightDir;
uniform sampler2D shadowMap;
uniform sampler2D tex;
uniform sampler2D normalMap;

float calculateShadow(vec3 nNormal) {
    vec2 texelSize = (1.0 / vec2(textureSize(shadowMap, 0)));
    vec2 halfTexelSize = texelSize * 0.5;

    vec3 projCoords = (fragPosLightSpace.xyz) / fragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;
    vec2 texCoords = round(projCoords.xy / texelSize) * texelSize;
    float cd0 = texture(shadowMap, projCoords.xy + vec2(-1.0, -1.0) * halfTexelSize).r;
    float cd1 = texture(shadowMap, projCoords.xy + vec2(1.0, -1.0) * halfTexelSize).r;
    float cd2 = texture(shadowMap, projCoords.xy + vec2(-1.0, 1.0) * halfTexelSize).r;
    float cd3 = texture(shadowMap, projCoords.xy + vec2(1.0, 1.0) * halfTexelSize).r;
    float bias = max(0.06 * (1.0 - dot(nNormal, -lightDir)), 0.005);
    // float bias = 0.0;
    float shadow0 = projCoords.z - bias > cd0 ? 1.0 : 0.0;
    float shadow1 = projCoords.z - bias > cd1 ? 1.0 : 0.0;
    float shadow2 = projCoords.z - bias > cd2 ? 1.0 : 0.0;
    float shadow3 = projCoords.z - bias > cd3 ? 1.0 : 0.0;

    float xLin = (texCoords.x - (projCoords.x - halfTexelSize.x)) / texelSize.x;
    float yLin = (texCoords.y - (projCoords.y - halfTexelSize.y)) / texelSize.y;

    float xAvg0 = shadow1 + (shadow0 - shadow1) * xLin;
    float xAvg1 = shadow3 + (shadow2 - shadow3) * xLin;

    float shadow = xAvg1 + (xAvg0 - xAvg1) * yLin;

    // float xAvg0 = shadow0 + (shadow1 - shadow0) * xLin;
    // float xAvg1 = shadow2 + (shadow3 - shadow2) * xLin;

    // float shadow = xAvg0 + (xAvg1 - xAvg0) * yLin;

    return shadow;
}

// vec3 calculateNormal() {
    
// }

void main(void) {

    // float illumination = 0.1 + max(0.0, -dot(lightDir, pNormal)) * 0.9;
    // vec3 cNormal = 

    vec3 nNormal = normalize(pNormal);

    vec3 normal = texture(normalMap, uvCoords).rgb;
    normal = normal * 2.0 - 1.0;
    normal = normalize(TBN * normal);

    float illumination = 0.1 + max(0.0, -dot(lightDir, normal)) * 0.9 * (1.0 - calculateShadow(nNormal));

    float quantized = floor(illumination * 10.0) / 9.0;

    vec3 color = texture(tex, vec2(nNormal.y,  -fragPos.y * 0.5 + 0.5)).rgb;

    // if(uvCoords.x < 0.03 || uvCoords.x > 0.97 || uvCoords.y < 0.03 || uvCoords.y > 0.97) {
    //     fragColor = vec4(vec3(0), 1.0);
    // } else {
        fragColor = vec4(illumination * color, 1.0);
    // }
    // fragColor = vec4(texture(normalMap, uvCoords).rgb, 1.0);
    // fragColor = vec4(vec3(0, 1, 0), 1.0);
}