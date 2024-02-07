import shader from "./shaders/shaders.wgsl";

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

    // создание буффера для uniform значений
    const uniformBuffer = device.createBuffer({
        label: 'uniforms for triangle',
        size: uniformBufferSize,
        // включаем флаг, который сигнализирует, что этот буфер будет использоваться
        // для uniform-переменных
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // создаем массив типов для хранения значений униформ в JavaScript
    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // смещения различных унифицированных значений в индексах float32
    const kColorOffset = 0;
    const kScaleOffset = 4;
    const kOffsetOffset = 6;

    uniformValues.set([0, 1, 0, 1], kColorOffset);        // устанавливаем цвет
    uniformValues.set([-0.5, -0.25], kOffsetOffset);      // устанавливаем смещение

    // привязываем наш буффер к шейдеру через @binding(?)
    const bindGroup = device.createBindGroup({
        label: 'triangle bind group',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer }},
        ],
    });

    function render() {
        // Устанавливаем унифицированные значения на стороне JavaScript Float32Array
        const aspect = canvas.width / canvas.height;
        uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // set the scale

        // копируем значения из JavaScript в графический процессор
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

        const renderPassDescriptor = <GPURenderPassDescriptor> {
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
        // устанавливаем группу привязки перед рисованием
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();

        const commandBuffer = encoder.finish();
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
