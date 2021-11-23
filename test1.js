var fork = require('child_process').fork;
const readline = require('readline');
var path = require("path");
const {performance} = require('perf_hooks');

var startTime = performance.now()

let child = {}
let is_done = []
for(let i=0;i<801;i++) {
    child[i] = fork(path.resolve(__dirname + '/test1-client.js'), [process.argv[2]]);
    child[i].send({ "keyno": i });
    console.log(`Launched child process: PID: ${child[i].pid}`);

    child[i].on('message', message => {  
        is_done.push(message)
        console.log(is_done.length);
        if(is_done.length > 790) {
            console.log('done');
            var endTime = performance.now()
            console.log(`Test 1 Execution Time: ${endTime - startTime} milliseconds`);
            process.exit()
        }
    });
}

