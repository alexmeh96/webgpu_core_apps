import shader from "./shaders/shaders.wgsl";

// Случайное число между [min и max)
// С 1 аргументом это будет от [0 до min)
// Без аргументов будет от [0 до 1)
function rand(min?: any, max?: any) {
    if (min === undefined) {
        min = 0;
        max = 1;
    } else if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
};


const Initialize = async () => {

    const canvas = <HTMLCanvasElement>document.getElementById("root-canvas");
    // получение адаптера, который представляет собой конкретный графический процессор
    const adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
    const device = <GPUDevice>await adapter?.requestDevice();

    // получение контекста webgpu от канваса
    const context = <GPUCanvasContext>canvas.getContext("webgpu");
    // получение формата канваса("rgba8unorm" или "bgra8unorm"), который использует система
    const presentationFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat()

    context.configure({
        device: device,
        format: presentationFormat
    });

    const module = device.createShaderModule({
        code: shader
    });

    const pipeline = device.createRenderPipeline({
        label: 'triangle with uniforms',
        layout: 'auto',
        vertex: {
            module,
            entryPoint: "vs"
        },
        fragment: {
            module,
            entryPoint: "fs",
            targets: [{format: presentationFormat}]
        },
    });

    // определяем размер буффера
    const uniformBufferSize =
        4 * 4 + // цвет — 4 32-битных числа с плавающей запятой (по 4 байта каждое)
        2 * 4 + // масштаб — 2 32-битных числа с плавающей запятой (по 4 байта каждое)
        2 * 4;  // смещение равно 2 32-битным числам с плавающей запятой (по 4 байта каждое)

    // смещения различных унифицированных значений в индексах float32
    const kColorOffset = 0;
    const kScaleOffset = 4;
    const kOffsetOffset = 6;

    const kNumObjects = 100;
    const objectInfos: any = [];

    for (let i = 0; i < kNumObjects; ++i) {
        const uniformBuffer = device.createBuffer({
            label: `uniforms for obj: ${i}`,
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // создаем массив типов для хранения значений униформ в JavaScript
        const uniformValues = new Float32Array(uniformBufferSize / 4);
        uniformValues.set([rand(), rand(), rand(), 1], kColorOffset);        // устанавливаем цвет
        uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], kOffsetOffset);      // устанавливаем смещение

        const bindGroup = device.createBindGroup({
            label: `bind group for obj: ${i}`,
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {binding: 0, resource: {buffer: uniformBuffer}},
            ],
        });

        objectInfos.push({
            scale: rand(0.2, 0.5),
            uniformBuffer,
            uniformValues,
            bindGroup,
        });
    }

    function render() {
        // Устанавливаем унифицированные значения на стороне JavaScript Float32Array
        const aspect = canvas.width / canvas.height;

        const renderPassDescriptor = <GPURenderPassDescriptor>{
            label: 'our basic canvas renderPass',
            colorAttachments: [
                <GPURenderPassColorAttachment>{
                    clearValue: [0.3, 0.3, 0.3, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                    view: context.getCurrentTexture().createView(),
                },
            ],
        };

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);

        for (const {scale, bindGroup, uniformBuffer, uniformValues} of objectInfos) {
            uniformValues.set([scale / aspect, scale], kScaleOffset); // устанавливаем масштаб
            device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

            // устанавливаем группу привязки перед рисованием
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
        }

        pass.end();

        const commandBuffer = encoder.finish();
        // выполняем команды, которые рисуют 100 объектов, каждый со своим собственным универсальным буфером.
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
