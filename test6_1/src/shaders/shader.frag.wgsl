struct ShapeData {
    color: vec4f,
    scale: vec2f,
    offset: vec2f,
};

@group(0) @binding(0) var<uniform> shapeData: ShapeData;

@fragment
fn fs() -> @location(0) vec4f {
    return shapeData.color;
}
