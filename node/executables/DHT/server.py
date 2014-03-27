#!/usr/bin/env python

import time

from lcd import lcd

from i2clibraries import i2c_lcd_smbus

lcd1 = lcddriver.lcd()

lcd2 = i2c_lcd_smbus.i2c_lcd(0x3f,1, 2, 1, 0, 4, 5, 6, 7, 3)
lcd2.command(lcd2.CMD_Display_Control | lcd2.OPT_Enable_Display)
lcd2.backLightOn()
