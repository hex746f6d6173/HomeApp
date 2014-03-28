import RPi.GPIO as io
import time

io.setmode(io.BCM)
 
pir_pin = 22
io.setup(pir_pin, io.IN)
while True:
    if io.input(pir_pin):
        print "JA"
    else:
        print "NEE"
    time.sleep(2)
