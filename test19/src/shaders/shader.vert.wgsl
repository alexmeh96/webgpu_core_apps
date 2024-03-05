struct Uniforms {
  color: vec4f,
  resolution: vec2f,
  translation: vec2f,
  rotation: vec2f,
  scale: vec2f,
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

  // Масштабируем позицию
  let scaledPosition = vert.position * uni.scale;

  // Поворот позиции
  let rotatedPosition = vec2f(
    scaledPosition.x * uni.rotation.x - scaledPosition.y * uni.rotation.y,
    scaledPosition.x * uni.rotation.y + scaledPosition.y * uni.rotation.x
  );

  // Добавляем смещение
  let position = rotatedPosition + uni.translation;

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
