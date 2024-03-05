struct VertexInput {
    @location(0) position: vec3f,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) world_pos: vec3f,
};

struct ViewParams {
    view_proj: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> view_params: ViewParams;

@vertex
fn vertex_main(vert: VertexInput) -> VertexOutput {

//    let pos = mat4x4<f32>(
//          vec4f( 0.0,  0.0, 0.2, 0.0),
//          vec4f( 0.0,  0.0, 0.0, 0.0),
//          vec4f( 0.0,  1.0, 0.0, 0.0),
//          vec4f( 0.0,  0.0, 0.0, 0.0),
//        );


    var out: VertexOutput;
//    out.position = view_params.view_proj * vec4f(vert.position, 1.0);
//    out.position = pos * vec4f(vert.position, 1.0);
//    out.position = vec4f(vert.position, 0.08);
    out.position = vec4f(vert.position.x, vert.position.y, vert.position.z, 1.0);
//    out.world_pos = vert.position.xyz;
    out.world_pos = vec3f(vert.position.x, vert.position.y, vert.position.z);
    return out;
};

@fragment
fn fragment_main(in: VertexOutput) -> @location(0) vec4f {
    // Compute the normal by taking the cross product of the
    // dx & dy vectors computed through fragment derivatives
    let dx = dpdx(in.world_pos);
    let dy = dpdy(in.world_pos);
    let n = normalize(cross(dx, dy));
    return vec4f((n + 1.0) * 0.5, 1.0);
}
