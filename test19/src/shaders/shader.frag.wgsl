struct Uniforms {
  color: vec4f,
  resolution: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;


@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return uni.color;
}
