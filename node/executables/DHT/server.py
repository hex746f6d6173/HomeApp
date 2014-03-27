#!/usr/bin/python

#import logging
#logging.basicConfig(level=logging.DEBUG)

import lcddriver
#from time import *

import time
from time import gmtime, strftime

from socketIO_client import SocketIO

lcd = lcddriver.lcd()

print 'HALLO'

tempratuur = "0"
lumen = "0"

def updateUI():
    global tempratuur
    lcd.lcd_display_string("HOME APP   "+strftime("%H:%M:%S", gmtime()), 1)
    lcd.lcd_display_string(tempratuur + "oC / "+lumen+"Lux", 2)
    lcd.lcd_display_string("", 3)
    lcd.lcd_display_string("Status: All fine!", 4)

def temp(*args):
    global tempratuur
    print 'on_aaa_response', args, args[0], str(args[0])
    tempratuur = str(args[0]);
    updateUI()

with SocketIO('home.tomasharkema.nl', 80) as socketIO:
    socketIO.on('temp', temp)
    socketIO.emit('me', 'python')
    socketIO.wait_for_callbacks(seconds=1000)
    socketIO.wait()

while True:
    updateUI()
    time.sleep(1)
