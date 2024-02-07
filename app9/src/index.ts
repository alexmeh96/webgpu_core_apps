import shader from "./shaders/shaders.wgsl";

function rand(min?: any, max?: any) {
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

    const kNumObjects = 100;
    const objectInfos: any[] = [];

    // создаем 2 буфера хранения
    const staticUnitSize =
        4 * 4 + // цвет — 4 32-битных числа с плавающей запятой (по 4 байта каждое)
        2 * 4 + // смещение равно 2 32-битным числам с плавающей запятой (по 4 байта каждое)
        2 * 4;  // дополнение
    const changingUnitSize =
        2 * 4;  // масштаб — 2 32-битных числа с плавающей запятой (по 4 байта каждое)
    const staticStorageBufferSize = staticUnitSize * kNumObjects;
    const changingStorageBufferSize = changingUnitSize * kNumObjects;

    const staticStorageBuffer = device.createBuffer({
        label: 'static storage for objects',
        size: staticStorageBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const changingStorageBuffer = device.createBuffer({
        label: 'changing storage for objects',
        size: changingStorageBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // смещения различных унифицированных значений в индексах float32
    const kColorOffset = 0;
    const kOffsetOffset = 4;

    const kScaleOffset = 0;

    {
        const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);
        for (let i = 0; i < kNumObjects; ++i) {
            const staticOffset = i * (staticUnitSize / 4);

            // Они устанавливаются только один раз, поэтому установите их сейчас
            staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // устанавливаем цвет
            staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // устанавливаем смещение

            objectInfos.push({
                scale: rand(0.2, 0.5),
            });
        }
        device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
    }

    // типизированный массив, который мы можем использовать для обновления изменяющегосяStorageBuffer
    const storageValues = new Float32Array(changingStorageBufferSize / 4);

    const bindGroup = device.createBindGroup({
        label: 'bind group for objects',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: staticStorageBuffer }},
            { binding: 1, resource: { buffer: changingStorageBuffer }},
        ],
    });

    function render() {
        const renderPassDescriptor = <GPURenderPassDescriptor>{
            label: 'our basic canvas renderPass',
            colorAttachments: [
                {
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

        // Устанавливаем uniform значения на стороне JavaScript Float32Array
        const aspect = canvas.width / canvas.height;

        // устанавливаем масштабы для каждого объекта
        objectInfos.forEach(({scale}, ndx) => {
            const offset = ndx * (changingUnitSize / 4);
            storageValues.set([scale / aspect, scale], offset + kScaleOffset); // устанавливаем масштаб
        });
        // загружаем все шкалы одновременно
        device.queue.writeBuffer(changingStorageBuffer, 0, storageValues);

        pass.setBindGroup(0, bindGroup);
        pass.draw(3, kNumObjects);  // вызываем наш вершинный шейдер 3 раза для каждого экземпляра


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
