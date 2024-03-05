import shader_vert from "./shaders/shader.vert.wgsl";
import shader_frag from "./shaders/shader.frag.wgsl";
import createFVertices from "./data";

const Initialize = async () => {

    const canvas = <HTMLCanvasElement>document.getElementById("root-canvas");
    const adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
    const device = <GPUDevice>await adapter?.requestDevice();
    const context = <GPUCanvasContext>canvas.getContext("webgpu");
    const textureFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat()

    context.configure({
        device: device,
        format: textureFormat,
        alphaMode: 'premultiplied',
    });

    const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: shader_vert
            }),
            entryPoint: "vs",
            buffers: [
                {
                    arrayStride: (2) * 4, // (2) числа с плавающей запятой, по 4 байта каждое
                    attributes: [
                        {shaderLocation: 0, offset: 0, format: 'float32x2'},  // позиция
                    ],
                },
            ],
        },
        fragment: {
            module: device.createShaderModule({
                code: shader_frag
            }),
            entryPoint: "fs",
            targets: [{format: textureFormat}]
        },
        primitive: {
            topology: 'triangle-list',
        },
    });


    // цвет, разрешение, смещение, вращение, масштаб
    const uniformBufferSize = (4 + 2 + 2 + 2 + 2) * 4;
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformValues = new Float32Array(uniformBufferSize / 4);


    // смещения различных унифицированных значений в индексах float32
    const colorOffset = 0;
    const resolutionOffset = 4;
    const translationOffset = 6;
    const rotationOffset = 8;
    const scaleOffset = 10;

    const colorValue = uniformValues.subarray(colorOffset, colorOffset + 4);
    const resolutionValue = uniformValues.subarray(resolutionOffset, resolutionOffset + 2);
    const translationValue = uniformValues.subarray(translationOffset, translationOffset + 2);
    const rotationValue = uniformValues.subarray(rotationOffset, rotationOffset + 2);
    const scaleValue = uniformValues.subarray(scaleOffset, scaleOffset + 2);

    // Цвет не изменится, поэтому давайте установим его один раз во время инициализации
    colorValue.set([Math.random(), Math.random(), Math.random(), 1]);
    translationValue.set([300, 200]);

    const degToRad = (d: number) => d * Math.PI / 180;

    rotationValue.set([
        Math.cos(degToRad(90)),
        Math.sin(degToRad(90)),
    ]);

    scaleValue.set([2, 1.5]);

    const { vertexData, indexData, numVertices } = createFVertices();
    const vertexBuffer = device.createBuffer({
        label: 'vertex buffer vertices',
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
    const indexBuffer = device.createBuffer({
        label: 'index buffer',
        size: indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indexData);

    const bindGroup = device.createBindGroup({
        label: 'bind group for object',
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer }},
        ],
    });


    function render() {
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: textureView,
                }
            ],
        };
        const commandEncoder = device.createCommandEncoder();
        const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        renderPassEncoder.setPipeline(renderPipeline);
        renderPassEncoder.setVertexBuffer(0, vertexBuffer);
        renderPassEncoder.setIndexBuffer(indexBuffer, 'uint32');

        // Устанавливаем унифицированные значения на стороне JavaScript Float32Array
        resolutionValue.set([canvas.width, canvas.height]);

        // загружаем юниформ-значения в юниформ-буфер
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

        renderPassEncoder.setBindGroup(0, bindGroup);
        renderPassEncoder.drawIndexed(numVertices);
        renderPassEncoder.end();

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
    }

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const canvas = <HTMLCanvasElement>entry.target;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));

            // re-render
            render();
        }
    });
    observer.observe(canvas);
}

Initialize()
