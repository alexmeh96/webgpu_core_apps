struct Uniforms {
  color: vec4f,
  resolution: vec2f,
  mtrx: mat3x3f,
};

struct Vertex {
  @location(0) position: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;

  // Умножаем на матрицу
  let position = (uni.mtrx * vec3f(vert.position, 1)).xy;

  // преобразуем позицию из пикселей в значение от 0,0 до 1,0
  let zeroToOne = position / uni.resolution;

  // конвертируем из 0 <-> 1 в 0 <-> 2
  let zeroToTwo = zeroToOne * 2.0;

  // скрыто от 0 <-> 2 до -1 <-> +1 (пространство отсечения)
  let flippedClipSpace = zeroToTwo - 1.0;

  // переворачиваем Y
  let clipSpace = flippedClipSpace * vec2f(1, -1);

  vsOut.position = vec4f(clipSpace, 0.0, 1.0);
  return vsOut;
}
