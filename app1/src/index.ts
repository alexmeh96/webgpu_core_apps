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

    // создание конвеера рендеринга
    const pipeline = device.createRenderPipeline({
        label: 'our hardcoded red triangle pipeline',
        // 'auto' - получение макета данных из шейдера
        layout: 'auto',
        vertex: {
            module,
            // использовать функцию vs из шейдерного модуля
            entryPoint: "vs"
        },
        fragment: {
            module,
            // использовать функцию fs из шейдерного модуля
            entryPoint: "fs",
            // Цель означает текстуру, которую мы будем рендерить.
            // элемент 0 массива targets соответсвует возвращаемому значению @location(0)
            // из фрагментного шейдера
            targets: [
                {
                    // формат текстуры, который мы будем рендерить
                    format: presentationFormat
                }
            ]
        },
    });

    // объект, описывающий текстуры которые мы хотим рисовать и как их использовать
    const renderPassDescriptor = <GPURenderPassDescriptor>{
        label: 'our basic canvas renderPass',
        // элемент 0 массива colorAttachments соответствует значению @location(0),
        // которое мы указали для возвращаемого значения фрагментного шейдера.
        colorAttachments: [
            {
                // Получаем текущую текстуру из контекста холста и
                // устанавливаем его в качестве текстуры для рендеринга
                view: context.getCurrentTexture().createView(),
                // будет заполнено при рендеринге
                clearValue: [0.3, 0.3, 0.3, 1],
                // 'clear' указывает на очистку текстуры до значения очистки перед рисованием
                // 'load' загрузку существующего содержимого текстуры в графический процессор,
                // чтобы мы могли рисовать поверх того, что уже есть
                loadOp: 'clear',
                // 'store' сохранение результата того, что мы рисуем
                // 'discard' отбросить то, что мы рисуем
                storeOp: 'store',
            },
        ],
    };


    function render() {
        // // Получаем текущую текстуру из контекста холста и
        // // устанавливаем его в качестве текстуры для рендеринга.
        // renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

        // создаем кодировщик команд, чтобы начать кодировать команды
        const encoder = device.createCommandEncoder({label: 'our encoder'});

        // Создаем кодировщик прохода рендеринга для кодирования конкретных команд рендеринга.
        // Передаем ему renderPassDescriptor, чтобы сообщить, какую текстуру мы хотим визуализировать
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        // вызываем наш вершинный шейдер 3 раза
        // По умолчанию каждые 3 раза, когда выполняется наш вершинный шейдер,
        // будет нарисован треугольник путем соединения 3 значений, только что возвращенных из вершинного шейдера.
        pass.draw(3);
        // завершаем этап рендеринга
        pass.end();

        // завершаем кодирование, которое дает нам буфер команд
        const commandBuffer = encoder.finish();
        // отправляем буфер команд на выполнение
        device.queue.submit([commandBuffer]);
    }

    render();
}

Initialize()
