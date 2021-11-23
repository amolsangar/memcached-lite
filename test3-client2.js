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

let i = 100
getReqIntrvl = setInterval(() => {
    let line
    if(i==200) {
        if(process.send)  // Available when its invoked from parent process
          process.send({"done": 2})
        
        clearInterval(getReqIntrvl)
    }
    else {
        let getCommand = "get sameKeyTest"
        client.write(`${getCommand}`) 
        i++
    }
},10)