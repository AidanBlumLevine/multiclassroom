const path = require('path');

module.exports = {
    entry: './public/index.js',
    module: {
        rules: [{
            test: /\.tsx?$/,
        },],
    },
    resolve: {
        extensions: [ '.js'],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    }
};