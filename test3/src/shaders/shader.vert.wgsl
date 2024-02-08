@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4f {
    let pos1 = array<vec2f, 3>(
      vec2f( 0.0,  0.5),
      vec2f(-0.5, -0.5),
      vec2f( 0.5, -0.5),
    );

    return vec4f(pos1[vertexIndex], 0.0, 1.0);
}
