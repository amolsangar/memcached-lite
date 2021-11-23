const net = require('net');
const readline = require('readline');

const client = new net.Socket();

client.connect(9889, process.argv[2], () => {
  console.log('Connected to server! ');
  recursiveAsyncReadLine();
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

const rl = readline.createInterface({ 
    input: process.stdin,
    output: process.stdout

});
var input = []  
var recursiveAsyncReadLine = function () {
    rl.question('', function (line) {    
        if(line == "quit") {
            console.log("Connection closed by foreign host.")
            client.destroy();
            process.exit();
        }

        if(line.startsWith('set') || input.length == 1) {
            input.push(line)        
            if(input.length == 2) {
                let str = input[0] + '\r\n' + input[1] + '\r\n'
                client.write(`${str}`);
                input = []
            }
        }
        else {
            client.write(`${line}`);
        }
        recursiveAsyncReadLine(); //Calling this function again to ask new question
    });
};

rl.on('end', () => {
  client.destroy();
})

process.on( 'SIGINT', function() {
    console.log( "Gracefully shutting down from SIGINT (Crtl+C)" )
    client.destroy();
    process.exit();
})