const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
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
        options: {
          plugins: ['transform-class-properties']
        },
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
      {
        test: /\.s[ac]ss$/i,
        use: [
          // fallback to style-loader in development
          process.env.NODE_ENV !== 'production'
            ? 'style-loader'
            : MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
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
    new CopyWebpackPlugin({
      patterns: [
        {from:'src/images',to:'images'},
        {from:'src/sounds',to:'sounds'},
        {from:'src/js/vendor',to:'js'},
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'css/main.css'
    }),
  ],
};