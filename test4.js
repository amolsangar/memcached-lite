var fork = require('child_process').fork;
const readline = require('readline');
var path = require("path");
const {performance} = require('perf_hooks');

var startTime = performance.now()

let child1 = fork(path.resolve(__dirname + '/test4-client.js'), [process.argv[2]]);
console.log(`Launched child process: PID: ${child1.pid}`);

let child2 = fork(path.resolve(__dirname + '/test4-client.js'), [process.argv[2]]);
console.log(`Launched child process: PID: ${child2.pid}`);

let is_done = []
child1.on('message', message => {  
    is_done.push(message)

    if(is_done.length == 2) {
        console.log('Done');
        var endTime = performance.now()
        console.log(`Test 4 Execution Time: ${endTime - startTime} milliseconds`);
        process.exit()
    }
});

child2.on('message', message => {  
    is_done.push(message)

    if(is_done.length == 2) {
        console.log('Done');
        var endTime = performance.now()
        console.log(`Test 4 Execution Time: ${endTime - startTime} milliseconds`);
        process.exit()
    }
});
