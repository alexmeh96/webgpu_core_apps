import shader_vert from "./shaders/shader.vert.wgsl";
import shader_frag from "./shaders/shader.frag.wgsl";

// Случайное число между [min и max)
// С 1 аргументом это будет от [0 до min)
// Без аргументов будет от [0 до 1)
function rand(min?: number, max?: number) {
    if (min === undefined) {
        min = 0;
        max = 1;
    } else if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
}


const Initialize = async () => {

    const canvas = <HTMLCanvasElement>document.getElementById("root-canvas");
    const adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
    const device = <GPUDevice>await adapter?.requestDevice();
    const context = <GPUCanvasContext>canvas.getContext("webgpu");
    const textureFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat()

    context.configure({
        device: device,
        format: textureFormat
    });

    const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: shader_vert
            }),
            entryPoint: "vs",
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

    const countRect = 5;
    const reactInfos: any[] = [];

    const shapeUnitSize =
        4 * 4 + // цвет — 4 32-битных числа с плавающей запятой (по 4 байта каждое)
        2 * 4 + // смещение равно 2 32-битным числам с плавающей запятой (по 4 байта каждое)
        2 * 4;  // дополнение
    const scaleUnitSize = 2 * 4;  // масштаб — 2 32-битных числа с плавающей запятой (по 4 байта каждое)

    const shapeBufferSize = shapeUnitSize * countRect;
    const scaleBufferSize = scaleUnitSize * countRect;
    const posBufferSize = 2 * 4 * 3;  // позиция вершин - 2 32-битных числа с плавающей запятой
                                      // (по 4 байта каждое) для трёх вершин

    const shapeBuffer = device.createBuffer({
        size: shapeBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const scaleBuffer = device.createBuffer({
        size: scaleBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const vertexBuffer = device.createBuffer({
        size: posBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: shapeBuffer }},
            { binding: 1, resource: { buffer: scaleBuffer }},
            { binding: 2, resource: { buffer: vertexBuffer }},
        ],
    });

    const shapeValues = new Float32Array(shapeBufferSize / 4);
    const scaleValues = new Float32Array(scaleBufferSize / 4);
    const posValues = new Float32Array(posBufferSize / 4);

    // устанавливаем позиции вершин
    posValues.set([0.0,  0.5], 0);
    posValues.set([-0.5, -0.5], 2);
    posValues.set([0.5, -0.5], 4);

    for (let i = 0; i < countRect; i++) {
        const shapeOffset = i * (shapeUnitSize / 4);

        shapeValues.set([rand(), rand(), rand(), 1], shapeOffset);
        shapeValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], shapeOffset + 4);

        reactInfos.push({
            scale: rand(0.2, 0.7),
        })
    }

    device.queue.writeBuffer(shapeBuffer, 0, shapeValues);
    device.queue.writeBuffer(vertexBuffer, 0, posValues);


    function render() {
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    clearValue: [0.3, 0.3, 0.3, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: textureView,
                }
            ],
        };

        const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        renderPassEncoder.setPipeline(renderPipeline);

        const aspect = canvas.width / canvas.height;

        reactInfos.forEach(({scale}, ndx) => {
            const offset = ndx * (scaleUnitSize / 4);
            scaleValues.set([scale / aspect, scale], offset);
        });
        device.queue.writeBuffer(scaleBuffer, 0, scaleValues);

        renderPassEncoder.setBindGroup(0, bindGroup);
        renderPassEncoder.draw(3, countRect);
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
