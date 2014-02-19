#!/usr/bin/python
import requests
import time
import RPi.GPIO as io
io.setmode(io.BCM)
 
pir_pin = 18
 
io.setup(pir_pin, io.IN)         # activate input

state = 0;

previousTime = 0;

requests.get("http://home.tomasharkema.nl/pir/1/0/")

while True:
    if io.input(pir_pin):
        if (state == 0) :
            state = 1
            print("PIR ALARM!")
            previousTime = int(round(time.time() * 1000))
            r = requests.get("http://home.tomasharkema.nl/pir/1/1/")
    else:
        now = int(round(time.time() * 1000))
        
        if ((previousTime + (1000 * 60 * 10)) < now):
            print("PIR NO ENTER!")

            if(state == 1):
                state = 0
                r = requests.get("http://home.tomasharkema.nl/pir/1/0/")
                
    time.sleep(0.5)