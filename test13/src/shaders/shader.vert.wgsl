struct ShapeData {
    color: vec4f,
    offset: vec2f,
};

struct Vertex {
  @location(0) position: vec2f,
};

@group(0) @binding(0) var<storage, read> shapeDataArray: array<ShapeData>;
@group(0) @binding(1) var<storage, read> scaleArray: array<vec2f>;


struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex
fn vs(vert: Vertex, @builtin(instance_index) instanceIndex: u32) -> VSOutput {

    let shapeData = shapeDataArray[instanceIndex];
    let scale = scaleArray[instanceIndex];

    var vsOut: VSOutput;
    vsOut.position = vec4f(vert.position * scale + shapeData.offset, 0.0, 1.0);
    vsOut.color = shapeData.color;
    return vsOut;
}
