const path = require('path')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const { WebpackPluginServe: Serve } = require('webpack-plugin-serve')
const Dotenv = require('dotenv-webpack')

const OUTPUT_PATH = path.resolve(__dirname, 'dist')

module.exports = (env) => {
    return {
        mode: 'development',
        entry: [
            './src/main.tsx',
            'webpack-plugin-serve/client',
        ],
        devtool: 'inline-source-map',
        output: {
            path: OUTPUT_PATH,
            filename: 'bundle.[hash].js',
            publicPath: '/',
        },
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules|sdk/,
                    loader: 'awesome-typescript-loader',
                },
                {
                    test: /\.jsx?$/,
                    exclude: /node_modules|sdk/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                        },
                    },
                },
                {
                    test: /\.css$/,
                    use: [
                        'style-loader',
                        { loader: 'css-loader' },
                    ],
                },
                {
                    test: /\.scss$/,
                    use: [
                        'style-loader', // creates style nodes from JS strings
                        'css-loader', // translates CSS into CommonJS
                        'sass-loader', // compiles Sass to CSS
                    ],
                },
                {
                    test: /\.(svg|png|jpe?g|eot|woff2?)$/,
                    loader: 'file-loader',
                    options: {
                        outputPath: 'assets/',
                    },
                },
            ],
        },
        plugins: [
            new HtmlWebPackPlugin({
                template: 'src/index.html',
                filename: 'index.html',
                favicon: 'src/assets/images/logo.png',
            }),
            new Dotenv({ path: path.join(__dirname, `.env.${typeof env === 'string' ? env : 'staging'}`) }),
            new Serve({
                open: true,
                host: 'localhost',
                port: 9090,
                static: OUTPUT_PATH,
                historyFallback: true,
            }),
        ],
        watch: typeof env !== 'string',
    }
}
