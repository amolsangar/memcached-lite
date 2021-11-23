const net = require('net');
const storage = require('node-persist');
const crypto = require('crypto');
var AsyncLock = require('async-lock');
const { values } = require('node-persist');

//-----------------------------------------
// Server Operations
//-----------------------------------------
const server = net.createServer((socket) => {
  console.log('Connection from', socket.remoteAddress, 'port', socket.remotePort);

  // Server receives data
  socket.on('data', (buffer) => {
    console.log('Request from', socket.remoteAddress, 'port', socket.remotePort);
    console.log("Command - " + buffer.toString('utf-8'));
    protocolHandler(buffer.toString('utf-8')).then((output) => {
        //let out = Buffer.from(output, 'utf-8').toString();
        socket.write(`${output}`);
    });

  });

  // Client connection terminates
  socket.on('end', () => {
    console.log('Closed', socket.remoteAddress, 'port', socket.remotePort);
  });
  
  socket.on('close',function(error){
    let bread = socket.bytesRead;
    let bwrite = socket.bytesWritten;
    console.log('Bytes read : ' + bread);
    console.log('Bytes written : ' + bwrite);
    console.log('Socket closed!');
    if(error){
      console.log('Socket was closed coz of transmission error');
    }
  }); 

  // Error Handling
  socket.on('error',(err) => {
    console.log("Unexpected error occured: " + err)
  });

  // Timeout - 10 mins
  socket.setTimeout(600000);
  socket.on('timeout', () => {
    console.log('Socket timed out !');
    socket.end('Timed out !')
    // can call socket.destroy() here too.
  });
});

// emits when any error occurs -> calls closed event immediately after this.
server.on('error',function(error){
    console.log('Error: ' + error);
});

// server.maxConnections = 20;
// Server Listening
server.listen(9889)
let islistening = server.listening;
if(islistening){
  console.log('Server is listening');
}else{
  console.log('Server is not listening');
}

//-----------------------------------------
// DB Operations
//-----------------------------------------

// Init
(async function() {
    try {
        let db_folder = './db/'

        await storage.init({
            dir: db_folder,
            stringify: JSON.stringify,
            parse: JSON.parse,
            encoding: 'utf8',
            logging: false,  // can also be custom logging function
            ttl: false, // ttl* [NEW], can be true for 24h default or a number in MILLISECONDS or a valid Javascript Date object
            expiredInterval: 2 * 60 * 1000, // every 2 minutes the process will clean-up the expired cache
            // in some cases, you (or some other service) might add non-valid storage files to your
            // storage dir, i.e. Google Drive, make this true if you'd like to ignore these files and not throw an error
            forgiveParseErrors: false
        });
    } catch(error) {
        console.error(error);
    }

})();

// Lock for Mutual Exclusion of shared file
var lock = new AsyncLock({timeout: 60000});

// Set Items in Backend
async function setItem(key,data) {
    try {
        return new Promise((resolve, reject) => {
            lock.acquire(key, function(done) {
                // Concurrency safe
                storage.setItem(key,data).then(() => {
                    done();
                })

                // For Testing long running jobs
                // setTimeout(function() {
                //     console.log("lock1 Done")
                //     done();
                // }, 1000)
            })
            .then((err, ret) => {
                // lock released
                resolve('STORED');
            })
            .catch(err => {
                // 1. Async-lock timed out error captured here
                console.log(err); 
                resolve('NOT-STORED') 
            })
        });
    }
    catch(error) {
        console.error(error);
    }
}

// Get items from Backend
async function getItem(key) {
    try {
        return new Promise((resolve, reject) => {
            let value
            let bytes
            let flags
            // let exptime
            // let noreply
                        
            lock.acquire(key, function(done) {

                storage.getItem(key).then((res) => {
                    if(res) {
                        bytes = res.bytes
                        value = JSON.parse(res.value)
                        flags = res.flags
                    }
                    
                    done();
                }).catch((error) => {
                    console.log(error);
                })

                // For Testing 
                // setTimeout(function() {
                //     console.log("lock2 Done")
                //     done();
                // }, 2000)
                
            }, function(err, ret) {
                // lock released
                if(bytes != undefined){
                    let res = "VALUE " + key + " "  + flags
                    + " " + bytes + "\r\n" + value  + "\r\n"
                    resolve(res)
                }
                else {
                    resolve()
                }

            }, {skipQueue: true});

        });
    } catch(error) {
        console.error(error);
    }
}

//-----------------------------------------
// Protocol
//-----------------------------------------

async function protocolHandler(input) {
    try {
        if(input.startsWith('get')) {
            let command = input.split('get')
            let keys = command[1].trim()
            
            let key_arr = keys.split(" ")
            let result = ""
            for(let i=0;i<key_arr.length;i++) {
                let len = key_arr[i].length
                if(len > 250) {
                    return "CLIENT_ERROR bad command line format\r\n"
                }
            }
            
            for(let i=0;i<key_arr.length;i++) {
                let temp = await getItem(key_arr[i])

                if(temp != undefined) {
                    result += temp
                }
            }

            return result + "END\r\n"
        }
        else if(input.startsWith('set')) {
            let command = input.split('\r\n')
            if(command.length != 3) {    // Three lines since there are two \r\n
                return "Invalid command" + "\r\n"
            }
            let metadata = command[0].trim()
            let value = command[1].trim()
            if(value.length > 1048576) {    // 1MB
                return "CLIENT_ERROR bad command line format\r\n"
            }
            let metadata_split = metadata.split(" ")
            if(metadata_split.length < 5 || metadata_split.length > 6) {
                return "Incomplete arguments" + "\r\n"
            }
            
            let key = metadata_split[1].trim()

            let data = {}
            for(let i=2;i<metadata_split.length;i++) {
                if(i == 2) {
                    data['flags'] = metadata_split[2].trim()
                }
                else if(i == 3) {
                    data['exptime'] = metadata_split[3].trim()
                }
                else if(i == 4) {
                    data['bytes'] = metadata_split[4].trim()
                }
                else if(i == 5) {
                    data['noreply'] = metadata_split[5].trim()
                }
            }

            if(!is_valid_key(key)) {
                return 'Invalid key' + "\r\n"
            }

            console.log(command[1]);
            if(data.bytes != value.length) {
                return "Mismatch value-size and length" + "\r\n"
            }

            value = JSON.stringify(value)
            data['value'] = value
            let result = await setItem(key,data)

            return result + "\r\n"
        }
        else {
            return "Invalid command" + "\r\n"
        }
    }
    catch(e){
        console.log(e)
    }
}

function is_valid_key(key) {
    let regex = /[^\w\s-]/gi;
    if(key.match(regex)) {
        console.log('Invalid key entered. No special characters allowed')
        return false
    }
    return true
}

//-----------------------------------------
// HELPERS
//-----------------------------------------

// const crypto = require('crypto');
// Generates filename - not used anywhere in code yet
const md5 = function (key) {
	return crypto.createHash('md5').update(key).digest('hex');
};

// document = await getDocument('key-value-store"')
async function getDocument(documentName) {
    let getDocument = await storage.getItem(documentName);
    if (typeof getDocument === 'undefined') {
     return [];
    }

    return getDocument;
}

// Blocking Sleep Function
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}