var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  resolve: {
    root: [path.join(__dirname, 'src')],
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      'base-component': path.resolve('./node_modules/base-component')
    }
  },
  entry: {
    app: './src/app.js',
    vendors: ['react']
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
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
        loader: ExtractTextPlugin.extract(
          'style', 'css!sass', { publicPath: './' }
        )
      },
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!less-loader'
      },
      {
        test: /\.(ttf|eot|png|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        loader: 'file-loader'
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin("style.css"),
    new webpack.optimize.CommonsChunkPlugin('vendors', 'vendors.js')
  ]
};
