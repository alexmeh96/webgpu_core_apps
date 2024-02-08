struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    let pos = array<vec2f, 3>(
      vec2f( 0.0,  0.5),
      vec2f(-0.5, -0.5),
      vec2f( 0.5, -0.5),
    );

    var color = array<vec4f, 3>(
      vec4f(1, 0, 0, 1), // red
      vec4f(0, 1, 0, 1), // green
      vec4f(0, 0, 1, 1), // blue
    );

    var vsOutput: VertexOutput;
    vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    vsOutput.color = color[vertexIndex];
    return vsOutput;
}
