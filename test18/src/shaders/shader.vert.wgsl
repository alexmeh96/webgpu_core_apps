struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texcoord: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    let pos = array<vec2f, 6>(
        // 1-й треугольник
        vec2f( 0.0,  0.0),  // центр
        vec2f( 1.0,  0.0),  // справа, в центре
        vec2f( 0.0,  1.0),  // центр, верх

        // 2-й треугольник
        vec2f( 0.0,  1.0),  // центр, верх
        vec2f( 1.0,  0.0),  // справа, в центре
        vec2f( 1.0,  1.0),  // справа, вверху
      );

    var vsOutput: VertexOutput;
    let xy = pos[vertexIndex];
    vsOutput.position = vec4f(xy, 0.0, 1.0);
//    vsOutput.texcoord = vec2f(1.0 - xy.x, xy.y);
    vsOutput.texcoord = xy;
    return vsOutput;
}
