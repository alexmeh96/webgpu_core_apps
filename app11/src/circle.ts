function createCircleVertices({
                                  radius = 1,
                                  numSubdivisions = 24,
                                  innerRadius = 0,
                                  startAngle = 0,
                                  endAngle = Math.PI * 2,
                              } = {}): any {
    // 2 треугольника на подразделение, 3 вершины на три, по 2 значения (xy) каждое.
    const numVertices = numSubdivisions * 3 * 2;
    const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

    let offset = 0;
    const addVertex = (x: any, y: any) => {
        vertexData[offset++] = x;
        vertexData[offset++] = y;
    };

    // 2 треугольника на подразделение
    //
    // 0--1 4
    // | / /|
    // |/ / |
    // 2 3--5
    for (let i = 0; i < numSubdivisions; ++i) {
        const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
        const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

        const c1 = Math.cos(angle1);
        const s1 = Math.sin(angle1);
        const c2 = Math.cos(angle2);
        const s2 = Math.sin(angle2);

        // первый треугольник
        addVertex(c1 * radius, s1 * radius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c1 * innerRadius, s1 * innerRadius);

        // второй треугольник
        addVertex(c1 * innerRadius, s1 * innerRadius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c2 * innerRadius, s2 * innerRadius);
    }

    return {
        vertexData,
        numVertices,
    };
}

export default createCircleVertices;
