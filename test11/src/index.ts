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



    const shapeBuffer = device.createBuffer({
        size: shapeBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const scaleBuffer = device.createBuffer({
        size: scaleBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: shapeBuffer }},
            { binding: 1, resource: { buffer: scaleBuffer }},
        ],
    });

    const shapeValues = new Float32Array(shapeBufferSize / 4);
    const scaleValues = new Float32Array(scaleBufferSize / 4);

    for (let i = 0; i < countRect; i++) {
        const shapeOffset = i * (shapeUnitSize / 4);

        shapeValues.set([rand(), rand(), rand(), 1], shapeOffset);
        shapeValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], shapeOffset + 4);

        reactInfos.push({
            scale: rand(0.2, 0.7),
        })
    }

    device.queue.writeBuffer(shapeBuffer, 0, shapeValues);

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

        // Устанавливаем uniform значения на стороне JavaScript Float32Array
        const aspect = canvas.width / canvas.height;

        // устанавливаем масштабы для каждого объекта
        reactInfos.forEach(({scale}, ndx) => {
            const offset = ndx * (scaleUnitSize / 4);
            scaleValues.set([scale / aspect, scale], offset); // устанавливаем масштаб
        });
        // загружаем все шкалы одновременно
        device.queue.writeBuffer(scaleBuffer, 0, scaleValues);

        renderPassEncoder.setBindGroup(0, bindGroup);
        renderPassEncoder.draw(3, countRect);  // вызываем наш вершинный шейдер 3 раза для каждого экземпляра
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
