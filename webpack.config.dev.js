module.exports = require('./webpack.config')({
  isProduction: false,
  devtool: 'cheap-eval-source-map',
  port: require('./package.json').config.port
});
