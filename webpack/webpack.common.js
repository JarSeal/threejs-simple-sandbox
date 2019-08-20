const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const commonPaths = require('./paths');

module.exports = {
  entry: commonPaths.entryPath,
  module: {
    rules: [
      {
        test: /\.(js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules)/,
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: commonPaths.imagesFolder,
            },
          },
        ],
      },
      {
        test: /\.(woff2|ttf|woff|eot)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: commonPaths.fontsFolder,
            },
          },
        ],
      },
    ],
  },
  serve: {
        content: commonPaths.entryPath,
        dev: {
            publicPath: commonPaths.outputPath,
        },
        open: true,
    },
  resolve: {
        modules: ['src/**/*.*', 'node_modules'],
        extensions: ['*', '.js', '.css', '.scss'],
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new HtmlWebpackPlugin({
        template: commonPaths.templatePath,
    }),
    new CopyWebpackPlugin([
        {from:'src/images',to:'images'}
    ]),
    new CopyWebpackPlugin([
        {from:'src/css',to:'css'}
    ]),
  ],
};