function createFVertices() {
    const vertexData = new Float32Array([
        // левый столбец
        0, 0,
        30, 0,
        0, 150,
        30, 150,

        // верхняя ступенька
        30, 0,
        100, 0,
        30, 30,
        100, 30,

        // средняя ступенька
        30, 60,
        70, 60,
        30, 90,
        70, 90,
    ]);

    const indexData = new Uint32Array([
        0,  1,  2,    2,  1,  3,  // левый столбец
        4,  5,  6,    6,  5,  7,  // лучший пробег
        8,  9, 10,   10,  9, 11,  // средний пробег
    ]);

    return {
        vertexData,
        indexData,
        numVertices: indexData.length,
    };
}

export default createFVertices
