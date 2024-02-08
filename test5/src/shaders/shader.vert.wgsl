struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    let pos1 = array<vec2f, 3>(
      vec2f( 0.0,  0.5),
      vec2f(-0.5, -0.5),
      vec2f( 0.5, -0.5),
    );
    let pos2 = array<vec2f, 3>(
      vec2f( 1.0, -1.0),
      vec2f( 0.3, -0.8),
      vec2f( -0.6, 0.2),
    );

    var vsOutput: VertexOutput;

    if (instanceIndex == 0) {
        vsOutput.position = vec4f(pos1[vertexIndex], 0.0, 1.0);
        vsOutput.color = vec4f(1.0, 0.0, 0.0, 1.0);
    } else {
        vsOutput.position = vec4f(pos2[vertexIndex], 0.0, 1.0);
        vsOutput.color = vec4f(0.0, 1.0, 0.0, 1.0);
    }

    return vsOutput;
}
