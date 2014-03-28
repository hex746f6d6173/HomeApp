#!/usr/bin/python

#import logging
#logging.basicConfig(level=logging.DEBUG)

import lcddriver
#from time import *
import json
import time
from time import gmtime, strftime, localtime

import threading
from socketIO_client import SocketIO
import re
import requests
import RPi.GPIO as io
import atexit
import os
import sys
import subprocess
import datetime

import logging
logging.basicConfig(filename='server.log',level=logging.DEBUG)

from datetime import tzinfo,timedelta

class Zone(tzinfo):
	def __init__(self,offset,isdst,name):
		self.offset = offset
		self.isdst = isdst
		self.name = name
	def utcoffset(self, dt):
		return timedelta(hours=self.offset) + self.dst(dt)
	def dst(self, dt):
			return timedelta(hours=1) if self.isdst else timedelta(0)
	def tzname(self,dt):
		 return self.name

lcd = lcddriver.lcd()

print 'HALLO'
logging.debug('HALLO')
tempratuur = "0"
lumen = "0"
trigger = "0"
pir = "0"

bed = "0"

sleepStatus = "0"
sleepTime = 0

lastCommand = ""

io.setmode(io.BCM)

background = True

socketIO = SocketIO('home.tomasharkema.nl', 80)

def updateUI():
	global tempratuur
	global lumen
	global trigger
	global lastCommand
	global pir
	global background

	GMT = Zone(1,False,'GMT')
	localtime = datetime.datetime.now(GMT).strftime("%H:%M:%S")
	
	if(background):
		lcd.lcd_backlight()
	else:
		lcd.lcd_noBacklight()

	#lcd.lcd_clear()

	sleepRow = "                    "

	if(int(sleepStatus)>0):
		sleepRow = "sleeptime:"+  time.strftime('%H:%M:%S', time.gmtime(float(int(datetime.datetime.now().strftime("%s")) - int(int(sleepTime) / 1000))))

	lcd.lcd_display_string("HOME APP    "+localtime, 1)
	lcd.lcd_display_string(tempratuur + "oC / "+lumen+"Lux / TrA: "+trigger, 2)
	lcd.lcd_display_string(lastCommand, 3)
	lcd.lcd_display_string(sleepRow, 4)



def temp(*args):
	global tempratuur
	logging.debug('on_aaa_response' + str(args[0])
	print 'on_aaa_response', args, args[0], str(args[0])
	tempratuur = str(args[0]);
	
def lightsLume(*args):
	global lumen
	logging.debug('lumen' + str(args[0])
	print 'lumen', args, args[0], str(args[0])
	lumen = str(args[0]);
	
def triggerArm(*args):
	global trigger
	logging.debug('trigger' + str(args[0])
	print 'trigger', args, args[0], str(args[0])
	trigger = str(args[0]);
	

def switchedCallback(*args):
	global lastCommand
	logging.debug('switchedCallback' + str(args[0]['switch']['name'])
	print "switchedCallback", args, args[0]['switch']['name'], type(args[0])
	lastCommand = args[0]['switch']['name'] + ":"+str(args[0]['switch']['state']);
	

def sleepStatusCallback(*args):
	global sleepStatus
	global sleepTime
	logging.debug('sleepStatus' + args[0]['status'])
	print "sleepStatus", args, args[0]['status'], type(args[0])
	sleepStatus = str(args[0]['status'])
	sleepTime = args[0]['bedTime'];
	

class SocThread (threading.Thread):
	
	def __init__(self):
		
		threading.Thread.__init__(self)

	def run(self):

		socketIO.on('temp', temp)
		socketIO.on('lightsLume', lightsLume)
		socketIO.on('triggerArm', triggerArm)
		socketIO.on('switched', switchedCallback)
		socketIO.on('sleepStatus', sleepStatusCallback)
		socketIO.emit('me', 'LCD')
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
		
 
		pir_pin = 18
		 
		io.setup(pir_pin, io.IN)         # activate input

		state = 0;

		previousTime = int(round(time.time() * 1000));

		requests.get("http://home.tomasharkema.nl/pir/1/0/")

		initTime = int(round(time.time() * 1000));

		global bed
		global background

		while True:
			if io.input(pir_pin):
				if (state == 0) :
					state = 1
					print("PIR ALARM!")
					global pir
					pir = "1"
					
					previousTime = int(round(time.time() * 1000))
					r = requests.get("http://home.tomasharkema.nl/pir/1/1/")
					time.sleep(1)
					r.connection.close()
			else:
				now = int(round(time.time() * 1000))
				
				if ((previousTime + (1000 * 60 * 10)) < now):
					print("PIR NO ENTER!")
					global pir
					pir = "0"
					
					r = requests.get("http://home.tomasharkema.nl/pir/1/0/")
					time.sleep(1)
					r.connection.close()
				state = 0
			
			bed_pin = 22
			io.setup(bed_pin, io.IN)



			if io.input(bed_pin):
				if (bed != "1"):
					print "JA"
					bed = "1"
					socketIO.emit('bed', bed)
					socketIO.wait_for_callbacks(seconds=1000)
					background = False
					
			else:
				if (bed != "0"):
					print "NEE"
					bed = "0"
					socketIO.emit('bed', bed)
					socketIO.wait_for_callbacks(seconds=1000)
					background = True
					

			time.sleep(0.5)

class tempThread (threading.Thread):

	def __init__(self):
		threading.Thread.__init__(self)

	def run(self):
		# ===========================================================================
		# Google Account Details
		# ===========================================================================

		# Continuously append data
		logging.debug('temp')
		print "temp"

		while(True):
			# Run the DHT program to get the humidity and temperature readings!

			output = subprocess.check_output(["./Adafruit_DHT", "11", "4"]);
			#print output
			matches = re.search("Temp =\s+([0-9.]+)", output)
			if (not matches):
				time.sleep(3)
				continue
			temp = float(matches.group(1))

			# search for humidity printout
			matches = re.search("Hum =\s+([0-9.]+)", output)
			if (not matches):
				time.sleep(3)
				continue
			humidity = float(matches.group(1))
			logging.debug("Temperature: %.1f C" % temp)
			print "Temperature: %.1f C" % temp
			#print "Humidity:    %.1f %%" % humidity

			# Append the data in the spreadsheet, including a timestamp

			#print "http://home.tomasharkema.nl/temp/%.1f/" % temp
			r = requests.get("http://home.tomasharkema.nl/temp/%.1f/" % temp)
			

			time.sleep(30)



threadLock = threading.Lock()



try:
	thread1 = SocThread()
	thread2 = timeThread()
	thread3 = pirThread()
	thread4 = tempThread()

	thread3.daemon=True
	thread2.daemon=True
	thread1.daemon=True
	thread4.daemon=True

	thread1.start()
	thread2.start()
	thread3.start()
	thread4.start()

	while True: time.sleep(100)
except (KeyboardInterrupt, SystemExit):
	print '\n! Received keyboard interrupt, quitting threads.\n'
