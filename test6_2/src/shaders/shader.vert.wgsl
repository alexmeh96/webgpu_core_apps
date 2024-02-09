struct ShapeData {
    color: vec4f,
    scale: vec2f,
    offset: vec2f,
};

@group(0) @binding(0) var<storage, read> shapeData: ShapeData;

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4f {
    let pos = array<vec2f, 3>(
      vec2f( 0.0,  0.5),  // top center
      vec2f(-0.5, -0.5),  // bottom left
      vec2f( 0.5, -0.5)   // bottom right
    );

    return vec4f(pos[vertexIndex] * shapeData.scale + shapeData.offset, 0.0, 1.0);
}
