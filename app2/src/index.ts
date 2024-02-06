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

    // конфигурируем контекст, передавая ему устройство и формат
    context.configure({
        device: device,
        format: presentationFormat
    });


    // создание шейдерного модуля
    const module = device.createShaderModule({
        label: 'our hardcoded red triangle shaders',
        code: shader
    });

    // создаём вычислительный конвеер
    const pipeline = device.createComputePipeline({
        label: 'doubling compute pipeline',
        layout: 'auto',
        compute: {
            module,
            // использовать функцию computeSomething из шейдерного модуля
            entryPoint: 'computeSomething',
        },
    });

    // некоторые данные
    const input = new Float32Array([1, 3, 5]);

    // создайте буфер на графическом процессоре для хранения наших вычислительных входных и выходных данных
    const workBuffer = device.createBuffer({
        label: 'work buffer',
        // размер буфера в байтах
        size: input.byteLength,
        // флаги которые устанавливают возможности: хранения данных в буфере,
        // копирование данных в буфер, копирование данных из буфера
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    // Копируем наши входные данные в этот буфер
    device.queue.writeBuffer(workBuffer, 0, input);

    // создаем буфер на графическом процессоре, чтобы получить копию результатов
    const resultBuffer = device.createBuffer({
        label: 'result buffer',
        size: input.byteLength,
        // флаг MAP_READ означает, что мы хотим иметь возможность отображать этот буфер для чтения данных.
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // Настройте группу привязки, чтобы указать шейдеру, какой буфер использовать для вычисления
    const bindGroup = device.createBindGroup({
        label: 'bindGroup for work buffer',
        // pipeline.getBindGroupLayout(0) соответствует @group(0) в шейдере
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            // binding: 0 соответствует @group(0) @binding(0) в шейдере
            {binding: 0, resource: {buffer: workBuffer}},
        ],
    });


    // Кодируем команды для выполнения вычислений
    const encoder = device.createCommandEncoder({
        label: 'doubling encoder',
    });
    const pass = encoder.beginComputePass({
        label: 'doubling compute pass',
    });
    // установка конвеера
    pass.setPipeline(pipeline);
    // установка группы привязки
    // pass.setBindGroup(0, bindGroup) соответствует @group(0) в шейдере
    pass.setBindGroup(0, bindGroup);
    // сообщаем WebGPU запустить вычислительный шейдер столько раз, сколько элементов содержится в наших данных
    pass.dispatchWorkgroups(input.length);
    pass.end();

    // Кодируем команду для копирования результатов из workBuffer в resultBuffer(отображаемый буфер)
    encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

    // Завершаем кодирование и отправляем команды
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // Читаем результаты
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(resultBuffer.getMappedRange().slice(0));
    resultBuffer.unmap();

    console.log('input', input);  // [1, 3, 5]
    console.log('result', result);  // [2, 6, 10]
}

Initialize()
