#!/usr/bin/python

import subprocess
import re
import sys
import time
import datetime
import requests
# ===========================================================================
# Google Account Details
# ===========================================================================

# Continuously append data
while(True):
  # Run the DHT program to get the humidity and temperature readings!

  output = subprocess.check_output(["./Adafruit_DHT", "11", "4"]);
  print output
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

  print "Temperature: %.1f C" % temp
  print "Humidity:    %.1f %%" % humidity
 
  # Append the data in the spreadsheet, including a timestamp
  try:
    print "http://home.tomasharkema.nl/temp/%.1f/" % temp
    r = requests.get("http://home.tomasharkema.nl/temp/%.1f/" % temp)
  except:
    print "Unable to append data.  Check your connection?"
    sys.exit()

  # Wait 30 seconds before continuing
  print "Wrote a row to %s" % spreadsheet
  time.sleep(30)
