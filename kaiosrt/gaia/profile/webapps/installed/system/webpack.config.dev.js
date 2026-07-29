var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  resolve: {
    root: [path.join(__dirname, 'src')],
    modulesDirectories: ['node_modules', 'src', 'scss'],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      'base-component': path.resolve('./node_modules/base-component'),
      'base-module': path.resolve('./node_modules/base-module'),
      'soft-key-store': path.resolve('./node_modules/soft-key-store'),
      'settings-manager': path.resolve('./node_modules/settings-manager'),
      'service': path.resolve('./node_modules/service'),
      'hawk-requester': path.resolve('./node_modules/hawk-requester')
    }
  },
  entry: {
    app: './src/app.js',
    vendors: ['react']
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: 'dist/'
  },
  devtool: '#source-map',
  module: {
    loaders: [
      {
        test: /.jsx?$/,
        loader: 'babel-loader'
      },
      {
        test: /\.(scss|css)$/,
        loader: ExtractTextPlugin.extract('style', 'css!sass', { publicPath: './' })
      },
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!less-loader'
      },
      {
        test: /\.(ttf|eot|png|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        loader: 'file-loader?name=[name]-[hash:6].[ext]'
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin("style.css"),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendors',
      filename: 'vendors.js',
      chunks: ['app', 'vendors']
    })
  ]
};
