'use strict';

const Path = require('path');
const Webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (options) => {

  let src = Path.resolve( __dirname, 'src' );

  let config = {};
  
  config.entry = {
    vendor: ['jquery', 'three'],
    main: ['./src/js/Main'],
  };

  config.output = {
    path: Path.join(__dirname, 'dist' ),
    filename: 'js/[name].js?[hash]-[name]',
  };

  config.devtool = options.devtool;

  config.plugins = [];
  // environement variables
  config.plugins.push( new Webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify(options.isProduction ? 'production' : 'development')
    }
  }));
  // html 
  config.plugins.push( new HtmlWebpackPlugin({
    filename: 'index.html',
    template: './src/index.html',
    chunks: [ 'vendor', 'main']
  }));
  // Copy Assets
  config.plugins.push( new CopyWebpackPlugin([
      { from: Path.join(__dirname, 'src/assets' ), to: Path.join(__dirname, 'dist/assets' ) },
  ], {
      ignore: [
          '*.txt',
          '.*'
      ],
      copyUnmodified: false
  }));

  // Modules
  config.module = {};
  config.module.loaders = [];
  config.module.rules = [];

  config.module.loaders.push({
    test: /\.js$/,
    include: [ src ],
    exclude: /(node_modules|bower_components)/,
    loader: 'babel',
    query: {
          presets: ['es2015']
        }
  });

  config.module.loaders.push({
    test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
    include: [ src ],
    loader: 'file-loader'
  });

  options.isProduction ? runProdConfig() : runDevConfig();

  function runDevConfig () {
    
    config.plugins.push(
      new Webpack.HotModuleReplacementPlugin()
    );

    config.module.rules.push(
    {
      test: /\.scss$/,
      use: [
        {
          loader: 'style-loader'
        },
        {
          loader: 'css-loader',
        },
        {
          loader: 'sass-loader',
          options: {
            outputStyle: 'expanded',
            sourceMap: true,
            sourceMapContents: true
          }
        }
      ]
    });

    config.devServer = {
      contentBase: './dist',
      historyApiFallback: true,
      port: options.port,
      compress: false,
      inline: true,
      hot: true,
      host: '0.0.0.0',
      stats: {
        assets: true,
        children: false,
        chunks: false,
        hash: false,
        modules: false,
        publicPath: false,
        timings: true,
        version: false,
        warnings: true,
        colors: {
          green: '\u001b[32m',
        }
      },
    };

  }

  function runProdConfig () {

    config.plugins.push(
      new Webpack.optimize.CommonsChunkPlugin('vendor')
    );

    config.plugins.push(
      new Webpack.optimize.OccurrenceOrderPlugin()
    );


    config.plugins.push(
        new Webpack.LoaderOptionsPlugin({ minimize: true, debug: false })
    );

    // config.plugins.push(
    //   new BundleAnalyzerPlugin()
    // );

    // config.plugins.push(
    //   new Webpack.optimize.UglifyJsPlugin({
    //     compress: {
    //       warnings: false,
    //       unused: true,
    //       dead_code: true,
    //       drop_console: true,
    //     },
    //     output: {
    //       comments: false,
    //     }
    //   })
    // );

    config.module.rules = [
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'sass-loader']
        })
      }
    ];

    config.plugins.push(new ExtractTextPlugin({
      filename: 'css/[name].css?[hash]-[name]',
      disable: false,
      allChunks: true
    }));
  }

  return config;

}
