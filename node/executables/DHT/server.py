#!/usr/bin/python

#import logging
#logging.basicConfig(level=logging.DEBUG)

import lcddriver
from time import *

from socketIO_client import SocketIO

lcd = lcddriver.lcd()

print 'HALLO'

tempratuur = 0
lumen = 0

def updateUI():
    lcd.lcd_display_string("HOME APP     C:I T:0", 1)
    lcd.lcd_display_string(tempratuur + "oC / "+lumen+"Lux", 2)
    lcd.lcd_display_string("", 3)
    lcd.lcd_display_string("Status: All fine!", 4)

def temp(*args):
    print 'on_aaa_response', args
    tempratuur = str(args[0]);
    updateUI()


with SocketIO('home.tomasharkema.nl', 80) as socketIO:
    socketIO.on('temp', temp)
    socketIO.emit('me', 'python')
    socketIO.wait_for_callbacks(seconds=1000)
    socketIO.wait()
