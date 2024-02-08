@fragment
fn fs(@builtin(position) pixelPosition: vec4f) -> @location(0) vec4f {
    let grid = vec2u(pixelPosition.xy) / 8;

    if ((grid.x + grid.y) % 2 == 1) {
        return vec4f(1, 0, 0, 1);
    }

    return vec4f(0, 1, 1, 1);
}
