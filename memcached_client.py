import socket
import sys
import time
import signal
from pymemcache.client.base import Client

def signal_handler(sig, frame):
    print('Gracefully shutting down from SIGINT (Crtl+C)')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

HOST, PORT = "localhost", 9889

try:
    client = Client('127.0.0.1:9889')
    #client._connect()

    # Need to perform one operation in order to connect to server 
    # as no API provided for direct connection
    print("Bonus : Memcached compatibility\r\n")
    print("Setting key 'memcached_client_key' from Memcached client")
    res = client.set('memcached_client_key', 'mc_value', noreply=False)
    if(res):
        res = client.get('memcached_client_key')
        print("STORED\r\n")
    time.sleep(0.3)
    print("Getting key 'memcached_client_key' from Memcached client")
    res = client.get('memcached_client_key')
    print("Retrieved value - ",res.decode("utf-8"),"\r\n")
    while True:
            print("1. Set key\r\n2. Get key")
            data = input()
            
            if(data == "quit"):
                break
            
            if(data == "1"):
                print("Enter key followed by value (Ex - key1 value1): ")
                data = input()
                set_item = data.split(" ")
                result = client.set(set_item[0], set_item[1], noreply=False)
                
                if(result):
                    time.sleep(0.5)
                    result = client.get(set_item[0])
                    print("STORED\r\n")
                else:
                    print("NOT-STORED\r\n")
            elif( data == "2"):
                print("Enter key: ")
                data = input()
                result = client.get(data)
                print("Retrieved value - ",result.decode("utf-8"),"\r\n")
            else:
                print("Wrong Choice!\r\n")
                continue
finally:
    pass