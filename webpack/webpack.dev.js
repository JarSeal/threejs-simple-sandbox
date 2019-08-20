const webpack = require('webpack');

const commonPaths = require('./paths');

module.exports = {
  mode: 'development',
  output: {
    filename: '[name].js',
    path: commonPaths.outputPath,
    publicPath: 'http://localhost:4000/',
    chunkFilename: '[name].js',
  },
//   module: {
//     rules: [
//       {
//         test: /\.(css|scss)$/,
//         use: [
//           'style-loader',
//           {
//             loader: 'css-loader',
//             options: {
//               sourceMap: true,
//               modules: true,
//               camelCase: true,
//               localIdentName: '[local]___[hash:base64:5]',
//             },
//           },
//           'sass-loader',
//         ],
//       },
//     ],
//   },
  devServer: {
    contentBase: commonPaths.outputPath,
    compress: true,
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  watch: true,
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000
  },
};