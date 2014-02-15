#!/usr/bin/python
import requests
import time
import RPi.GPIO as io
io.setmode(io.BCM)
 
pir_pin = 18
 
io.setup(pir_pin, io.IN)         # activate input
 
while True:
    if io.input(pir_pin):
        print("PIR ALARM!")
        r = requests.get("http://home.tomasharkema.nl/pir/1/1/")
    else:
    	r = requests.get("http://home.tomasharkema.nl/pir/1/0/")
    time.sleep(0.5)