const path = require("path");
module.exports = {
    context: __dirname,
    entry: "./src/index.ts",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "/dist/"
    },
    mode: "none",
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            },
            {
                test: /\.wgsl$/,
                use: {
                    loader: "ts-shader-loader"
                }
            },
            {
                test: /\.(png|jpg|jpeg|glb)$/i,
                type: "asset/resource",
            },
        ]
    },

    resolve: {
        extensions: [".ts"]
    }
}
