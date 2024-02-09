import shader_vert from "./shaders/shader.vert.wgsl";
import shader_frag from "./shaders/shader.frag.wgsl";

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

// ------------------------ создание и привязка к шейдеру uniform-буффера --------------------------------------------------------

    // определяем размер буффера
    const uniformBufferSize =
        4 * 4 + // цвет — 4 32-битных числа с плавающей запятой (по 4 байта каждое)
        2 * 4 + // масштаб — 2 32-битных числа с плавающей запятой (по 4 байта каждое)
        2 * 4;  // смещение равно 2 32-битным числам с плавающей запятой (по 4 байта каждое)

    // создание буффера для uniform значений
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        // включаем флаг, который сигнализирует, что этот буфер будет использоваться
        // для uniform-переменных
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // создаем массив типов для хранения значений униформ в JavaScript
    const uniformValues = new Float32Array(uniformBufferSize / 4);

    // смещения различных унифицированных значений в индексах float32
    const kColorOffset = 0;
    const kScaleOffset = 4;
    const kOffsetOffset = 6;

    uniformValues.set([0, 1, 0, 1], kColorOffset);        // устанавливаем цвет
    uniformValues.set([-0.5, -0.25], kOffsetOffset);      // устанавливаем смещение
    uniformValues.set([0.9, 0.5], kScaleOffset);          // устанавливаем масштаб

    // привязываем наш буффер к шейдеру через @binding(?)
    const bindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer }},
        ],
    });

// --------------------------------------------------------------------------------------------------------

    // копируем значения из JavaScript в графический процессор
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

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
        // устанавливаем группу привязки перед рисованием
        renderPassEncoder.setBindGroup(0, bindGroup);
        renderPassEncoder.draw(3);
        renderPassEncoder.end();

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
    }
    render();
}

Initialize()
