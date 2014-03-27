#!/usr/bin/env python
""" Demonstration program for the lcd class """
 
from time import strftime, sleep
from lcd import *
 
# Initialize the display
display = Lcd('/dev/i2c-1')
 
 
# Demonstrate use of the Animation feature
mouth = [[0,0,0,0,0,0,31,31],
        [0,0,0,0,0,31,0,31]]
 
eye = [[0,0,4,10,4,0,0,0],
       [0,4,10,17,10,4,0,0],
       [4,10,17,0,17,10,4,0],
       [10,17,0,4,0,17,10,0]]
 
display.registerAnimation(eye, .2, 3,0,13, 'left_eye')
display.registerAnimation(mouth,   .5, 4,0,14, 'mouth')
display.write(chr(3),row=0,col=15)
 
display.startAnimation('left_eye')
display.startAnimation('mouth')
 
 
# Demonstrate use of the buildTransition helper function
slide_anim  = buildTransition(lcdNUMBERS)
 
display.registerAnimation(slide_anim, .3, 0,0,0, 'scrolling_digits')
display.startAnimation('scrolling_digits')
 
 
# Demonstrate use of the callback feature
def time_display():
    return strftime('%H:%M:%S')
 
def date_display():
    return strftime('%a, %b %d %Y')
 
display.registerCallback(time_display, 1, 0,4, 'time')
display.startCallback('time')
 
display.registerCallback(date_display, 360, 1,0, 'date')
display.startCallback('date')
 
 
# Other program code would go here.  Note that the main thread doesn't have to
# do anything else to keep the lcd updating itself!
while(1):
    sleep(1)
