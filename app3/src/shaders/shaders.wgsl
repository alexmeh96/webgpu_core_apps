struct OurVertexShaderOutput {
    // Для вершинного шейдера это выходные данные, необходимые графическому
    // процессору для рисования треугольников/линий/точек.
    // Для фрагментного шейдера это входные данные, координата пикселя, для которого
    // фрагментный шейдер в данный момент запрашивает вычисление цвета.
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,  // межэтапная пременная
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> OurVertexShaderOutput {
    let pos = array<vec2f, 3>(
      vec2f( 0.0,  0.5),  // top center
      vec2f(-0.5, -0.5),  // bottom left
      vec2f( 0.5, -0.5)   // bottom right
    );
    var color = array<vec4f, 3>(
      vec4f(1, 0, 0, 1), // red
      vec4f(0, 1, 0, 1), // green
      vec4f(0, 0, 1, 1), // blue
    );

    var vsOutput: OurVertexShaderOutput;
    vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    vsOutput.color = color[vertexIndex];
    return vsOutput;
}

// межэтапные переменные соединяются по индексу местоположения находящийся в @location(index).
// Поэтому неважно передаются эти переменные через структуру(распологаются в ней) или сразу

// передача межэтапной переменной color, находящуюся в структуре
//@fragment
//fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
//    return fsInput.color;
//}

// передача межэтапной переменной color сразу
@fragment
fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
    return color;
}
