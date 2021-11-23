var fork = require('child_process').fork;
const readline = require('readline');
var path = require("path");
const {performance} = require('perf_hooks');

var startTime = performance.now()

let child = {}
let is_done = []
for(let i=100;i<300;i++) {
    child[i] = fork(path.resolve(__dirname + '/test2-client.js'), [process.argv[2]]);
    child[i].send({ "keyno": i });
    console.log(`Launched child process: PID: ${child[i].pid}`);

    sleep(200)
    child[i].on('message', message => {  
        is_done.push(message)

        if(is_done.length >= 200) {
            console.log('done');
            var endTime = performance.now()
            console.log(`Test 2 Execution Time: ${endTime - startTime} milliseconds`);
            process.exit()
        }
    });
}

// Blocking Sleep Function
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}