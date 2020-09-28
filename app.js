var express = require('express');
var app = express();
var http = require('http').createServer(app);

app.use(express.static(__dirname + '/dist'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/dist/index.html');
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});