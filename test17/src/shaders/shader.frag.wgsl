@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

@fragment
fn fs(@location(0) texcoord: vec2f) -> @location(0) vec4f {
  return textureSample(myTexture, mySampler, texcoord);
}
