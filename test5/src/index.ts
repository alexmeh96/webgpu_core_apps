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
        renderPassEncoder.draw(3, 2);
        renderPassEncoder.end();

        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
    }
    render();
}

Initialize()
