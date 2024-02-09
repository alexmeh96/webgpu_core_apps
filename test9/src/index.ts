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


    const shapeBufferSize =
        2 * 4 + // масштаб — 2 32-битных числа с плавающей запятой (по 4 байта каждое)
        2 * 4;  // смещение равно 2 32-битным числам с плавающей запятой (по 4 байта каждое)
    const colorBufferSize = 4 * 4;  // цвет — 4 32-битных числа с плавающей запятой (по 4 байта каждое)

    const countRect = 5;
    const reactInfos: any[] = [];

    for (let i = 0; i < countRect; i++) {
        const shapeBuffer = device.createBuffer({
            size: shapeBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const shapeValues = new Float32Array(shapeBufferSize / 4);
        shapeValues.set([0.9, 0.5], 0);
        shapeValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], 2);

        device.queue.writeBuffer(shapeBuffer, 0, shapeValues);


        const colorBuffer = device.createBuffer({
            size: colorBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const colorValues = new Float32Array(colorBufferSize / 4);
        colorValues.set([rand(), rand(), rand(), 1], 0);

        device.queue.writeBuffer(colorBuffer, 0, colorValues);

        const bindGroup = device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: shapeBuffer }},
                { binding: 1, resource: { buffer: colorBuffer }},
            ],
        });

        reactInfos.push({
            bindGroup
        })
    }

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

        for (const {bindGroup} of reactInfos) {
            renderPassEncoder.setBindGroup(0, bindGroup);
            renderPassEncoder.draw(3);
        }

        renderPassEncoder.end();

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
    }
    render();
}

Initialize()
