#!/usr/bin/python

#import logging
#logging.basicConfig(level=logging.DEBUG)

import lcddriver
#from time import *

import time
from time import gmtime, strftime, localtime

import threading
from socketIO_client import SocketIO

import requests
import RPi.GPIO as io
import atexit
import os
import sys

lcd = lcddriver.lcd()

print 'HALLO'

tempratuur = "0"
lumen = "0"
trigger = "0"

socketIO = SocketIO('home.tomasharkema.nl', 80)

def updateUI():
	global tempratuur
	
	localtime = time.strftime("%H:%M:%S", time.localtime())
	

	lcd.lcd_display_string("HOME APP    "+localtime, 1)
	lcd.lcd_display_string(tempratuur + "oC / "+lumen+"Lux / TrA: "+trigger, 2)
	lcd.lcd_display_string("", 3)
	lcd.lcd_display_string("Status: All fine!", 4)

def temp(*args):
	global tempratuur
	print 'on_aaa_response', args, args[0], str(args[0])
	tempratuur = str(args[0]);
	threadLock.acquire()
	updateUI()
	threadLock.release()
def lightsLume(*args):
	global lumen
	print 'lumen', args, args[0], str(args[0])
	lumen = str(args[0]);
	threadLock.acquire()
	updateUI()
	threadLock.release()
def triggerArm(*args):
	global trigger
	print 'trigger', args, args[0], str(args[0])
	trigger = str(args[0]);
	threadLock.acquire()
	updateUI()
	threadLock.release()
class SocThread (threading.Thread):
	
	def __init__(self):
		
		threading.Thread.__init__(self)

	def run(self):

		socketIO.on('temp', temp)
		socketIO.on('lightsLume', lightsLume)
		socketIO.on('triggerArm', triggerArm)
		socketIO.emit('me', 'Python')
		socketIO.wait_for_callbacks(seconds=1000)
		socketIO.wait()



class timeThread (threading.Thread):

	def __init__(self):
		
		threading.Thread.__init__(self)

	def run(self):
		while True:
			threadLock.acquire()
			updateUI()
			threadLock.release()
			time.sleep(1)

class pirThread (threading.Thread):

	def __init__(self):
		threading.Thread.__init__(self)

	def run(self):
		io.setmode(io.BCM)
 
		pir_pin = 18
		 
		io.setup(pir_pin, io.IN)         # activate input

		state = 0;

		previousTime = int(round(time.time() * 1000));

		requests.get("http://home.tomasharkema.nl/pir/1/0/")

		initTime = int(round(time.time() * 1000));

		while True:
			if io.input(pir_pin):
				if (state == 0) :
					state = 1
					print("PIR ALARM!")
					previousTime = int(round(time.time() * 1000))
					r = requests.get("http://home.tomasharkema.nl/pir/1/1/")
					time.sleep(1)
					r.connection.close()
			else:
				now = int(round(time.time() * 1000))
				
				if ((previousTime + (1000 * 60 * 10)) < now):
					print("PIR NO ENTER!")
					
					r = requests.get("http://home.tomasharkema.nl/pir/1/0/")
					time.sleep(1)
					r.connection.close()
				state = 0
						
			time.sleep(0.5)


threadLock = threading.Lock()



try:
	thread1 = SocThread()
	thread2 = timeThread()
	thread2.daemon=True
	thread1.daemon=True
	thread1.start()
	thread2.start()
	while True: time.sleep(100)
except (KeyboardInterrupt, SystemExit):
	print '\n! Received keyboard interrupt, quitting threads.\n'
