const express = require('express');
const server = express();

server.all('/', (req, res)=>{
   res.setHeader('Content-Type', 'text/html');
   res.write('<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet"><style> body {font-family: "Roboto";font-size: 15px;} </style>AntiPhisher is online.');
   res.end();
})

function keepAlive(){
   server.listen(3000, ()=>{console.log("Server is online!")});
}

module.exports = keepAlive;
