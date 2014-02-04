#include <wiringPi.h>
#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <unistd.h>
#include <ctype.h>
#include <iostream>

using namespace std;

/*

433Send for Elro devices
by J. Lukas 2012
www.jer00n.nl

This file uses WiringPi to output a bit train to a 433.92 MHz transmitter, allowing you
to control light switches from the Elro brand.

Credits:
This file is mostly a port from Arduino source code written by Piepersnijder:
	http://gathering.tweakers.net/forum/view_message/34919677
Some parts have been rewritten and/or translated.

Any GPIO pin can be used, please see https://projects.drogon.net/raspberry-pi/wiringpi/pins/
to find out which WiringPi number corresponds to each GPIO pin.

Change the key[] variable below according to the dipswitches on your Elro receivers.

Version 1.0

Usage:
	Execute as root!
	sudo ./433send -d <device number> -s 1|0
	-d: device number. A = 1, B = 2, C = 4 ...
	-s: 1 = on, 0 = off

	Device	A = 1
			B = 2
			C = 4
			D = 8
			E = 16

	Example: sudo ./433send -d 4 -s 1 (turn on device C)

*/

int main(int argc, char **argv) 
{

int pin_out = 0;	

// Zone settings (dipswitches 1..5 on each receiver)
int key[5] = {1,1,0,0,0}; 

// Number of transmissions
int repeat = 10; 

int pulselength = 300;
int Bit[16];
int x;

int opt = 0;
int ab = 0;
int onoff = 0;

while((opt = getopt(argc, argv, "d:s:")) != -1)
{
	switch(opt)
	{
		case 'd':
			ab = atoi(optarg);
			break;
		case 's':
			onoff = atoi(optarg);
			break;
		default:
			exit(EXIT_FAILURE);
		}
	}



	if(wiringPiSetup() == -1)
	{
		printf("fail");
		exit(1);
	}

	pinMode(pin_out, OUTPUT);

	digitalWrite(pin_out, LOW);

	for (int t=0; t<5; t++)
	{
     		if (!key[t]) Bit[t]=142; else {Bit[t]=136;} // Bit 0 t/m 4
   	}

     	x = 1;
     	for (int i=1; i<6; i++)
	{
       	if ((ab & x)>0) Bit[4+i] = 136; else Bit[4+i] = 142; // Bit 5 t/m 9 
          	x = x<<1;
     }

     	if (onoff == 1) {
       	Bit[10] = 136;
        	Bit[11] = 142;
     	}
     	else 
	{
         	Bit[10] = 142;
         	Bit[11] = 136;
     	}

     	Bit[12] = 128;
     	Bit[13] = 0;
     	Bit[14] = 0;
     	Bit[15] = 0;



   	for (int z=0; z<=repeat; z++)
	{ // repeat
      		for (int y=0; y<16; y++)
		{
        		x = 128;
		        for (int i=1; i<9; i++)
			{
		        	if ((Bit[y] & x)>0)  digitalWrite(pin_out, HIGH);   
             			else { digitalWrite(pin_out, LOW); }  
           			usleep(pulselength);
           			x = x>>1;
        		}
     		}
  	}

}


