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

    const kTextureWidth = 5;
    const kTextureHeight = 7;
    const _ = [255,   0,   0, 255];  // красный
    const y = [255, 255,   0, 255];  // желтый
    const b = [  0,   0, 255, 255];  // синий
    const data: any[] = [
        _, _, _, _, _,
        _, y, _, _, _,
        _, y, _, _, _,
        _, y, y, _, _,
        _, y, _, _, _,
        _, y, y, y, _,
        b, _, _, _, _,
    ];
    const values = [].concat(...data);

    const textureData = new Uint8Array(values)

    const texture = device.createTexture({
        size: [kTextureWidth, kTextureHeight],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    device.queue.writeTexture(
        { texture },
        textureData,
        { bytesPerRow: kTextureWidth * 4 },
        { width: kTextureWidth, height: kTextureHeight },
    );

    const sampler = device.createSampler({
        addressModeU: 'repeat',
        addressModeV: 'clamp-to-edge',
        magFilter: 'linear',
    });

    const bindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: texture.createView() },
        ],
    });

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
        renderPassEncoder.setBindGroup(0, bindGroup);
        renderPassEncoder.draw(6);
        renderPassEncoder.end();

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
    }
    render();
}

Initialize()
