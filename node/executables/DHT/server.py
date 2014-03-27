#!/usr/bin/python

import lcddriver
from time import *

from socketIO_client import SocketIO

def on_aaa_response(*args):
    print 'on_aaa_response', args

socketIO = SocketIO('home.tomasharkema.nl', 80)
socketIO.on('temp', on_aaa_response)

lcd = lcddriver.lcd()

lcd.lcd_display_string("HOME APP     C:I T:0", 1)
lcd.lcd_display_string("16oC / 16Lux", 2)
lcd.lcd_display_string("", 3)
lcd.lcd_display_string("Status: All fine!", 4)