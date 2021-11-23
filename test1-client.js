const net = require('net');
const readline = require('readline');

const client = new net.Socket();

let keyno = -1
client.connect(9889, process.argv[2], () => {
  console.log('Connected to server! ');
  if(keyno != -1)
    process.send({"done": keyno})   // Sending done message to parent
});

client.setEncoding('utf8');

client.on('data', (data) => {
  console.log(data.toString('utf-8'));
});

client.on('end',() => {
    console.log('Disconnected from server! ');
    client.destroy();
    process.exit();
})

// child.js
process.on("message", function (message) {
    if(message.keyno) {
        console.log("Client " + message.keyno + " ");
        keyno = message.keyno
    }
    else if(message.command == "quit") {
        console.log("Connection closed by foreign host.\r\n")
        client.destroy();
        process.exit();
    }
});

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {

});

rl.on('end', () => {
    client.destroy();
})

process.on( 'SIGINT', function() {
    console.log( "Gracefully shutting down from SIGINT (Crtl+C)" )
    client.destroy();
    process.exit();
})