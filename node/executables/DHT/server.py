#!/usr/bin/python

#import logging
#logging.basicConfig(level=logging.DEBUG)

import lcddriver
from time import *

from socketIO_client import SocketIO
print 'HALLO'
def on_aaa_response(*args):
    print 'on_aaa_response', args

    lcd = lcddriver.lcd()
    lcd.lcd_display_string("HOME APP     C:I T:0", 1)
    lcd.lcd_display_string(str(args[0]) + "oC / 16Lux", 2)
    lcd.lcd_display_string("", 3)
    lcd.lcd_display_string("Status: All fine!", 4)

with SocketIO('home.tomasharkema.nl', 80) as socketIO:
    socketIO.on('temp', on_aaa_response)
    socketIO.emit('me', 'python')
    socketIO.wait_for_callbacks(seconds=1000)
    socketIO.wait()
