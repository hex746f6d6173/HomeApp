#!/bin/bash
#################################################
# Switch Test #1
#
# Sets up the GPIO 4 port to check for a button
# press.  Loops until the button is pressed
#
#################################################

# Setup the port First

gpio -g mode 4 in
gpio -g mode 4 up

# Loop Looking for a button press

while [ 1 ]
do
    value=gpio -g read 4
    if [ $value -eq 0 ]
    then
       break
    fi
    sleep 1
done

echo "We left the loop"
