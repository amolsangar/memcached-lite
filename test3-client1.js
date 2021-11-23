const net = require('net');
const readline = require('readline');

const client = new net.Socket();

client.connect(9889, process.argv[2], () => {
  console.log('Connected to server! ');
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

let j = 100
setReqIntrvl = setInterval(() => {    
    let line
    if(j==200) {
        if(process.send)  // Available when its invoked from parent process
          process.send({"done": 1})
        
        clearInterval(setReqIntrvl)
    }
    else {
        let command = "set sameKeyTest" + " 0 0 8\r\n" + "value" + j + '\r\n';
        client.write(`${command}`);
        j++
    }
},10)

