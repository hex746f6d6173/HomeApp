#!/usr/bin/python
import requests
import time
import RPi.GPIO as io
io.setmode(io.BCM)
 
pir_pin = 18
 
io.setup(pir_pin, io.IN)         # activate input

state = 0;

previousTime = 0;

while True:
    if io.input(pir_pin):
        if (state == 0) :
            state = 1
            print("PIR ALARM!")
            previousTime = int(round(time.time() * 1000))
            r = requests.get("http://home.tomasharkema.nl/pir/1/1/")
    else:
        print("PIR NO ALARM!")
        now = int(round(time.time() * 1000));
        if ((previousTime +  (1000 * 60 * 15)) <  now):
            r = requests.get("http://home.tomasharkema.nl/pir/1/0/")
                
    time.sleep(0.5)