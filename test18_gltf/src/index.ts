import shader from "./shaders/shader.wgsl";
import avocadoGlb from "../../assert/Avocado.glb";

const GLTFRenderMode = {
    POINTS: 0,
    LINE: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    // Note: fans are not supported in WebGPU, use should be
    // an error or converted into a list/strip
    TRIANGLE_FAN: 6,
};

const GLTFComponentType = {
    BYTE: 5120,
    UNSIGNED_BYTE: 5121,
    SHORT: 5122,
    UNSIGNED_SHORT: 5123,
    INT: 5124,
    UNSIGNED_INT: 5125,
    FLOAT: 5126,
    DOUBLE: 5130,
};

const GLTFType = {
    SCALAR: 0,
    VEC2: 1,
    VEC3: 2,
    VEC4: 3,
    MAT2: 4,
    MAT3: 5,
    MAT4: 6

};

function alignTo(val: number, align: number) {
    return Math.floor((val + align - 1) / align) * align;
}

function parseGltfType(type: string) {
    switch (type) {
        case "SCALAR":
            return GLTFType.SCALAR;
        case "VEC2":
            return GLTFType.VEC2;
        case "VEC3":
            return GLTFType.VEC3;
        case "VEC4":
            return GLTFType.VEC4;
        case "MAT2":
            return GLTFType.MAT2;
        case "MAT3":
            return GLTFType.MAT3;
        case "MAT4":
            return GLTFType.MAT4;
        default:
            throw Error(`Unhandled glTF Type ${type}`);
    }
}

function gltfTypeSize(componentType: number, type: number) {
    let componentSize = 0;
    switch (componentType) {
        case GLTFComponentType.BYTE:
            componentSize = 1;
            break;
        case GLTFComponentType.UNSIGNED_BYTE:
            componentSize = 1;
            break;
        case GLTFComponentType.SHORT:
            componentSize = 2;
            break;
        case GLTFComponentType.UNSIGNED_SHORT:
            componentSize = 2;
            break;
        case GLTFComponentType.INT:
            componentSize = 4;
            break;
        case GLTFComponentType.UNSIGNED_INT:
            componentSize = 4;
            break;
        case GLTFComponentType.FLOAT:
            componentSize = 4;
            break;
        case GLTFComponentType.DOUBLE:
            componentSize = 8;
            break;
        default:
            throw Error("Unrecognized GLTF Component Type?");
    }
    return gltfTypeNumComponents(type) * componentSize;
}

function gltfTypeNumComponents(type: number) {
    switch (type) {
        case GLTFType.SCALAR:
            return 1;
        case GLTFType.VEC2:
            return 2;
        case GLTFType.VEC3:
            return 3;
        case GLTFType.VEC4:
        case GLTFType.MAT2:
            return 4;
        case GLTFType.MAT3:
            return 9;
        case GLTFType.MAT4:
            return 16;
        default:
            throw Error(`Invalid glTF Type ${type}`);
    }
}

// Note: only returns non-normalized type names,
// so byte/ubyte = sint8/uint8, not snorm8/unorm8, same for ushort
function gltfVertexType(componentType: number, type: number) {
    let typeStr: string;
    switch (componentType) {
        case GLTFComponentType.BYTE:
            typeStr = "sint8";
            break;
        case GLTFComponentType.UNSIGNED_BYTE:
            typeStr = "uint8";
            break;
        case GLTFComponentType.SHORT:
            typeStr = "sint16";
            break;
        case GLTFComponentType.UNSIGNED_SHORT:
            typeStr = "uint16";
            break;
        case GLTFComponentType.INT:
            typeStr = "int32";
            break;
        case GLTFComponentType.UNSIGNED_INT:
            typeStr = "uint32";
            break;
        case GLTFComponentType.FLOAT:
            typeStr = "float32";
            break;
        default:
            throw Error(`Unrecognized or unsupported glTF type ${componentType}`);
    }

    switch (gltfTypeNumComponents(type)) {
        case 1:
            return typeStr;
        case 2:
            return typeStr + "x2";
        case 3:
            return typeStr + "x3";
        case 4:
            return typeStr + "x4";
        default:
            throw Error(`Invalid number of components for gltfType: ${type}`);
    }
}



// in glb.js, outside uploadGLB
export class GLTFBuffer {
    public buffer: Uint8Array;

    constructor(buffer: ArrayBuffer, offset: number, size: number) {
        this.buffer = new Uint8Array(buffer, offset, size);
    }
}

// in glb.js, outside uploadGLB
export class GLTFBufferView {

    public needsUpload: boolean;

    private length: any;
    public byteStride: number;
    private view: any;
    public gpuBuffer: GPUBuffer | null;
    private usage: GPUBufferUsageFlags;

    constructor(buffer: GLTFBuffer, view: any) {
        this.length = view["byteLength"];
        this.byteStride = 0;
        if (view["byteStride"] !== undefined) {
            this.byteStride = view["byteStride"];
        }

        // Create the buffer view. Note that subarray creates a new typed
        // view over the same array buffer, we do not make a copy here.
        let viewOffset = 0;
        if (view["byteOffset"] !== undefined) {
            viewOffset = view["byteOffset"];
        }
        this.view = buffer.buffer.subarray(viewOffset, viewOffset + this.length);

        this.needsUpload = false;
        this.gpuBuffer = null;
        this.usage = 0;
    }

    // When this buffer is referenced as vertex data or index data we
    // add the corresponding usage flag here so that the GPU buffer can
    // be created properly.
    addUsage(usage: GPUBufferUsageFlags) {
        this.usage = this.usage | usage;
    }

    // Upload the buffer view to a GPU buffer
    upload(device: GPUDevice) {
        // Note: must align to 4 byte size when mapped at creation is true
        const buf = device.createBuffer({
            size: alignTo(this.view.byteLength, 4),
            usage: this.usage,
            mappedAtCreation: true
        });
        new (this.view.constructor)(buf.getMappedRange()).set(this.view);
        buf.unmap();
        this.gpuBuffer = buf;
        this.needsUpload = false;
    }
}

// in glb.js, outside uploadGLB
export class GLTFAccessor {
    public count: number;
    private componentType: any;
    private gltfType: any;
    public view: GLTFBufferView;
    public byteOffset: number;

    constructor(view: GLTFBufferView, accessor: any) {
        this.count = accessor["count"];
        this.componentType = accessor["componentType"];
        this.gltfType = parseGltfType(accessor["type"]);
        this.view = view;
        this.byteOffset = 0;
        if (accessor["byteOffset"] !== undefined) {
            this.byteOffset = accessor["byteOffset"];
        }
    }

    get byteStride() {
        const elementSize = gltfTypeSize(this.componentType, this.gltfType);
        return Math.max(elementSize, this.view.byteStride);
    }

    get byteLength() {
        return this.count * this.byteStride;
    }

    // Get the vertex attribute type for accessors that are
    // used as vertex attributes
    get vertexType(): any {
        return gltfVertexType(this.componentType, this.gltfType);
    }
}

// in glb.js, outside uploadGLB
export class GLTFPrimitive {
    private positions: GLTFAccessor;
    private indices: GLTFAccessor;
    private topology: number;
    private renderPipeline: GPURenderPipeline | null;

    constructor(positions: GLTFAccessor, indices: GLTFAccessor, topology: number) {
        this.positions = positions;
        this.indices = indices;
        this.topology = topology;
        // Set usage for the positions data and flag it as needing upload
        this.positions.view.needsUpload = true;
        this.positions.view.addUsage(GPUBufferUsage.VERTEX);
        this.renderPipeline = null

        if (this.indices) {
            // Set usage for the indices data and flag it as needing upload
            this.indices.view.needsUpload = true;
            this.indices.view.addUsage(GPUBufferUsage.INDEX);
        }
    }

    buildRenderPipeline(device: GPUDevice,
                        shaderModule: GPUShaderModule,
                        colorFormat: GPUTextureFormat,
                        depthFormat: GPUTextureFormat,
                        uniformsBGLayout: GPUBindGroupLayout) {
        // Vertex attribute state and shader stage
        const vertexState: GPUVertexState = {
            // Shader stage info
            module: shaderModule,
            entryPoint: "vertex_main",
            // Vertex buffer info
            buffers: [{
                arrayStride: this.positions.byteStride,
                attributes: [
                    // Note: We do not pass the positions.byteOffset here, as its
                    // meaning can vary in different glB files, i.e., if it's
                    // being used for interleaved element offset or an absolute
                    // offset.
                    {
                        format: this.positions.vertexType,
                        offset: 0,
                        shaderLocation: 0
                    }
                ]
            }]
        };

        const fragmentState: GPUFragmentState = {
            // Shader info
            module: shaderModule,
            entryPoint: "fragment_main",
            // Output render target info
            targets: [{format: colorFormat}]
        };

        // Our loader only supports triangle lists and strips, so by default we set
        // the primitive topology to triangle list, and check if it's
        // instead a triangle strip
        const primitive: GPUPrimitiveState = {topology: "triangle-list"};
        if (this.topology == GLTFRenderMode.TRIANGLE_STRIP) {
            primitive.topology = "triangle-strip";
            primitive.stripIndexFormat = this.indices.vertexType;
        }

        const layout = device.createPipelineLayout({
            bindGroupLayouts: [uniformsBGLayout]
        });

        this.renderPipeline = device.createRenderPipeline({
            layout: layout,
            vertex: vertexState,
            fragment: fragmentState,
            primitive: primitive,
            depthStencil: {
                format: depthFormat,
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
    }

    render(renderPassEncoder: GPURenderPassEncoder, uniformsBG: GPUBindGroup | null) {
        if (!this.renderPipeline) {
            throw Error()
        }
        renderPassEncoder.setPipeline(this.renderPipeline);
        renderPassEncoder.setBindGroup(0, uniformsBG);

        // Apply the accessor's byteOffset here to handle both global and interleaved
        // offsets for the buffer. Setting the offset here allows handling both cases,
        // with the downside that we must repeatedly bind the same buffer at different
        // offsets if we're dealing with interleaved attributes.
        // Since we only handle positions at the moment, this isn't a problem.
        renderPassEncoder.setVertexBuffer(0,
            this.positions.view.gpuBuffer,
            this.positions.byteOffset,
            this.positions.byteLength);

        if (this.indices && this.indices.view.gpuBuffer) {
            renderPassEncoder.setIndexBuffer(this.indices.view.gpuBuffer, this.indices.vertexType, this.indices.byteOffset, this.indices.byteLength);
            renderPassEncoder.drawIndexed(this.indices.count);
        } else {
            renderPassEncoder.draw(this.positions.count);
        }
    }
}

// in glb.js, outside uploadGLB
export class GLTFMesh {
    private name: any;
    private primitives: GLTFPrimitive[];

    constructor(name: string, primitives: GLTFPrimitive[]) {
        this.name = name;
        this.primitives = primitives;
    }

    buildRenderPipeline(device: GPUDevice,
                        shaderModule: GPUShaderModule,
                        colorFormat: GPUTextureFormat,
                        depthFormat: GPUTextureFormat,
                        uniformsBGLayout: GPUBindGroupLayout) {
        // We take a pretty simple approach to start. Just loop through
        // all the primitives and build their respective render pipelines
        for (let i = 0; i < this.primitives.length; ++i) {
            this.primitives[i].buildRenderPipeline(device, shaderModule, colorFormat, depthFormat, uniformsBGLayout);
        }
    }

    render(renderPassEncoder: GPURenderPassEncoder, uniformsBG: GPUBindGroup | null) {
        for (let i = 0; i < this.primitives.length; ++i) {
            this.primitives[i].render(renderPassEncoder, uniformsBG);
        }
    }
}

export function uploadGLB(buffer: ArrayBuffer, device: GPUDevice): GLTFMesh {

    // Считывание glB-заголовка и JSON-заголовка фрагмента
    // glB header:
    // - magic: u32 (expect: 0x46546C67)
    // - version: u32 (expect: 2)
    // - length: u32 (size of the entire file, in bytes)
    // JSON chunk header
    // - chunkLength: u32 (size of the chunk, in bytes)
    // - chunkType: u32 (expect: 0x4E4F534A for the JSON chunk)
    const header = new Uint32Array(buffer, 0, 5);
    // проверка, содержит ли файл glb правильное магическое значение
    if (header[0] != 0x46546C67) {
        throw Error("Provided file is not a glB file")
    }
    if (header[1] != 2) {
        throw Error("Provided file is glTF 2.0 file");
    }
    // Убедитесь, что первый фрагмент - это JSON
    if (header[4] != 0x4E4F534A) {
        throw Error("Invalid glB: The first chunk of the glB file is not a JSON chunk!");
    }

    // Декодируйте фрагмент JSON файла glB в объект JSON
    const jsonChunk = JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(buffer, 20, header[3])));

    // Считываем заголовок двоичного фрагмента
    // - chunkLength: u32 (size of the chunk, in bytes)
    // - chunkType: u32 (expect: 0x46546C67 for the binary chunk)
    const binaryHeader = new Uint32Array(buffer, 20 + header[3], 2);
    if (binaryHeader[1] != 0x004E4942) {
        throw Error("Invalid glB: The second chunk of the glB file is not a binary chunk!");
    }

    const binaryChunk = new GLTFBuffer(buffer, 28 + header[3], binaryHeader[0]);

    // within uploadGLB
    // Создайте объекты GLTFBufferView для всех bufferViews в файле glTF
    const bufferViews: GLTFBufferView[] = [];
    for (let i = 0; i < jsonChunk['bufferViews'].length; ++i) {
        bufferViews.push(new GLTFBufferView(binaryChunk, jsonChunk['bufferViews'][i]));
    }


    for (let i = 0; i < bufferViews.length; ++i) {
        if (bufferViews[i].needsUpload) {
            bufferViews[i].upload(device);
        }
    }

    // within uploadGLB
    // Create GLTFAccessor objects for the accessors in the glTF file
    // We need to handle possible errors being thrown here if a model is using
    // accessors for types we don't support yet. For example, a model with animation
    // may have a MAT4 accessor, which we currently don't support.
    const accessors = [];
    for (let i = 0; i < jsonChunk['accessors'].length; ++i) {
        const accessorInfo = jsonChunk['accessors'][i];
        const viewID = accessorInfo["bufferView"];
        accessors.push(new GLTFAccessor(bufferViews[viewID], accessorInfo));
    }


    // within uploadGLB
    // Load the first mesh
    let mesh = jsonChunk['meshes'][0];
    const meshPrimitives: GLTFPrimitive[] = [];
    // Loop through the mesh's primitives and load them
    for (let i = 0; i < mesh['primitives'].length; ++i) {
        const prim = mesh['primitives'][i];
        let topology = prim["mode"];
        // Default is triangles if mode specified
        if (topology === undefined) {
            topology = GLTFRenderMode.TRIANGLES;
        }
        if (topology != GLTFRenderMode.TRIANGLES &&
            topology != GLTFRenderMode.TRIANGLE_STRIP) {
            throw Error(`Unsupported primitive mode ${prim["mode"]}`);
        }

        // Find the vertex indices accessor if provided
        let indices: GLTFAccessor | null = null;
        if (jsonChunk["accessors"][prim["indices"]] !== undefined) {
            indices = accessors[prim["indices"]];
        }

        // Loop through all the attributes to find the POSITION attribute.
        // While we only want the position attribute right now, we'll load
        // the others later as well.
        let positions: GLTFAccessor | null = null;
        for (const attr in prim["attributes"]) {
            const accessor = accessors[prim["attributes"][attr]];
            if (attr == "POSITION") {
                positions = accessor;
            }
        }

        if (!positions || !indices) {
            throw Error()
        }

        // Add the primitive to the mesh's list of primitives
        meshPrimitives.push(new GLTFPrimitive(positions, indices, topology));
    }
    // Create the GLTFMesh
    const finalMesh = new GLTFMesh(mesh["name"], meshPrimitives);

    // at the end of uploadGLB
    // Upload the buffers as mentioned above before returning the mesh
    // Upload the buffer views used by mesh
    for (let i = 0; i < bufferViews.length; ++i) {
        if (bufferViews[i].needsUpload) {
            bufferViews[i].upload(device);
        }
    }

    return finalMesh;
}


async function init() {

    const canvas = <HTMLCanvasElement>document.getElementById("root-canvas");
    const adapter = <GPUAdapter>await navigator.gpu?.requestAdapter();
    const device = <GPUDevice>await adapter?.requestDevice();
    const context = <GPUCanvasContext>canvas.getContext("webgpu");
    const textureFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat()

    // const glbMesh = await fetch(avocadoGlb)
    //     .then(res => res.arrayBuffer()).then(buf => uploadGLB(buf, device));


    // Setup render outputs
    const swapChainFormat = "bgra8unorm";
    context.configure(
        {device: device, format: swapChainFormat, usage: GPUTextureUsage.RENDER_ATTACHMENT});

    const depthFormat = "depth24plus-stencil8";
    const depthTexture = device.createTexture({
        size: {width: canvas.width, height: canvas.height, depthOrArrayLayers: 1},
        format: depthFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [{binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {type: "uniform"}}]
    });

    // Create a buffer to store the view parameters
    const viewParamsBuffer = device.createBuffer(
        {size: 16 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});

    const viewParamBG = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{binding: 0, resource: {buffer: viewParamsBuffer}}]
    });


    const shaderModule = device.createShaderModule({
        code: shader
    });

    const glbMesh = await fetch(avocadoGlb)
        .then(res => res.arrayBuffer()).then(buf => uploadGLB(buf, device));

    glbMesh.buildRenderPipeline(device, shaderModule, swapChainFormat, depthFormat, bindGroupLayout)

    console.log(glbMesh)


    const commandEncoder = device.createCommandEncoder();

    const renderPassDesc: GPURenderPassDescriptor = {
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: [0.3, 0.3, 0.3, 1],
            storeOp: "store"
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadOp: "clear",
            depthClearValue: 1.0,
            depthStoreOp: "store",
            stencilLoadOp: "clear",
            stencilClearValue: 0,
            stencilStoreOp: "store"
        }
    };

    const renderPass = commandEncoder.beginRenderPass(renderPassDesc);

    glbMesh.render(renderPass, viewParamBG);

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);

}



init()
