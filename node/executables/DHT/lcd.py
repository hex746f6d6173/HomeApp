import serial
import threading
from time import sleep
 
################################################################################
# These are some helpful defines for the board.
#
# Note that they are the same as the standard ASCII definitions.
################################################################################
 
lcdCHR_BACKSPACE    = chr(8)
lcdCHR_HORIZTAB     = chr(9)
lcdCHR_LF           = chr(10)
lcdCHR_VERTTAB      = chr(11)
lcdCHR_CR           = chr(13)
 
 
################################################################################
# Some handy (8x5) custom character definitions
################################################################################
 
""" Set of horizontal bars that can be used to display a meter """
lcdMETER = [[0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,31],
            [0,0,0,0,0,0,31,31],
            [0,0,0,0,0,31,31,31],
            [0,0,0,0,31,31,31,31],
            [0,0,0,31,31,31,31,31],
            [0,0,31,31,31,31,31,31],
            [0,31,31,31,31,31,31,31],
            [31,31,31,31,31,31,31,31]]
 
 
""" Array of numbers.  Use these to make animations involving digits """
lcdNUMBERS = [[14,17,19,21,25,17,14,0],
              [4,12,4,4,4,4,14,0],
              [14,17,1,2,4,8,31,0],
              [31,2,4,2,1,17,14,0],
              [2,6,10,18,31,2,2,0],
              [31,16,30,1,1,17,14,0],
              [6,8,16,30,17,17,14,0],
              [31,1,2,4,8,8,8,0],
              [14,17,17,14,17,17,14,0],
              [14,17,17,15,1,2,12,0]]
 
 
################################################################################
# AnimationThread class
# TODO: rework this to something more sensible, add runonce method
################################################################################
 
class AnimationThread(threading.Thread):
    """  Build an animation based on an array of custom characters, that
    updates at a specific interval.  The intended purpose of this is to make
    simple animations.
    """
    def __init__ (self, display, animation, time, address, row, col):
        self.display = display
        self.time = time
        self.animation = animation
        self.index = 0
        self.length = len(animation)
        self.address = address
        self.row = row
        self.col = col
        threading.Thread.__init__(self)
    def run(self):
        self.display.write(chr(self.address), row=self.row, col=self.col)
        while(1):
            self.display.assignCustomCharacter(self.animation[self.index],
                                               self.address)
            self.index = (self.index + 1) % self.length
            sleep(self.time)
 
 
################################################################################
# CallbackThread class
# TODO: rework this to something more sensible, add runonce method
################################################################################
 
class CallbackThread(threading.Thread):
    """ Set up a periodic call to a function that returns text.  The intended
    use for this is to make it easy to monitor data that is constantly
    changing.
    """
    def __init__ (self, display, callback, time, row, col):
        self.display = display
        self.time = time
        self.callback = callback
        self.row = row
        self.col = col
        threading.Thread.__init__(self)
    def run(self):
        while(1):
            self.display.write(self.callback(),row=self.row,col=self.col)
            sleep(self.time)
 
 
################################################################################
# buildTransition helper function
################################################################################
 
def buildTransition(characters, transition="vertical",
                    charheight=8, charwidth=5):
    """ Build a custom character animation by transitioning from the first
    character to the second.  The parameters charheight and charwidth are
    optional.
 
    Keyword Arguments
    characters -- A list of custom caracters to build a transition
                  animation out of.  For example, a slot machine effect
                  could be created with this effect, or a waterfall.
    transition -- Type of transition to perform.  Currently, only
                 "vertical" is supported.  Additions to this are welcome.
    charheight -- Height of a character (pixels)
    charwidth -- Width of a character (pixels)
    """
 
    animation = []
 
    for n in range(0, len(characters)-1):
        character1 = characters[n]
        character2 = characters[n+1]
        if(transition=="vertical"):
            for i in range(0, charheight):
                # outer loop, make each character
                tempchar = []
                for j in range(0, charheight):
                    # inner loop, make line of character
                    if(j <= i):
                        tempchar.append(character2[charheight-1-i+j])
                    else:
                        tempchar.append(character1[j-i-1])
                animation.append(tempchar)
        else:
            # not implemented
            return
 
    return animation
 
 
 
################################################################################
# Lcd Class.
################################################################################
 
class Lcd():
    """ Class to control an LCD display
    The display will be intialized when the class is started.
 
    Required arguments:
    port -- Serial port to attach to (for example, /dev/ttyS0)
 
    Optional arguments:
    backlight -- Power level of the backlight (in %).  0 corresponds to off.
    contrast -- Contrast setting.
    baud -- Baud rate that the device talks at.  The NetMedia is hardwired to
            either 9600 or 2400
    rows -- Number of rows that the display has
    cols -- Number of colums that the display has
    charheight -- Height of a character (pixels)
    charwidth -- Width of a character (pixels)
    """
    def __init__(self, port, baud=9600, backlight=50, contrast=30,
                 rows=2, cols=16, charheight = 8, charwidth=5):
        # Anything that uses _serial should first acquire _writelock
        self._serial = serial.Serial(port, baud)
        self._writelock = threading.Semaphore()
 
        self._backlight = backlight
        self._contrast = contrast
 
        # These are really functions of the specific LCD being used, so they
        # should be moved to a device-specific class if that is separated from
        # this interface.
        self._rows = rows
        self._cols = cols
        self._charheight = charheight
        self._charwidth = charheight
 
        # These are dictionaries that contain lists of the current animations
        # and callbacks
        self._animations = {}
        self._callbacks = {}
 
        # Reset the display.  This has the side effect of clearing the screen
        # and setting the backlight and contrast values to their specified
        # values.
        self.reset()
 
###############################################################################
# 'Public' functions.  These can be called at any time.  Note that they do not
# affect the hardware directly, but through the back-end functions.  This is
# to facilitate easy porting of this library to other LCD hardware.
###############################################################################
 
    def write(self, data, row=-1, col=-1):
        """ Function to write characters to the display.
        The parameters x and y are optional.  They should either both be used
        or both not be used.  If they are not specified, or the position they
        specify is out of range, they will both be ignored.
 
        Keyword Arguments
        data -- Data to write to the display
        row -- Row to write data to
        col -- Column to write data to
        """
        self._writelock.acquire()
        if(self._isValidPosition(row,col)):
            self._setPosition(row,col)
        self._serial.write(data)
        self._writelock.release()
 
 
    def reset(self):
        """ Reset the device, clear the screen, and set the backlight and 
        contrast settings to their default settings.
        """
        self._writelock.acquire()
        self._reset()
        self._setBacklight(self._backlight)
        self._setContrast(self._contrast)
        self._clearScreen()
        self._writelock.release()
 
 
    def clearScreen(self):
        """ Clear the LCD screen.  This has the side effect of moving the
        cursor position to 0,0
        """
        self._writelock.acquire()
        self._clearScreen()
        self._writelock.release()
 
 
    def setPosition(self, row, col):
        """ Set the write cursor to the given position.  A better way of
        acheiving this is to specify the x and y arguments to write().
 
        Keyword Arguments
        row -- Row to write data to
        col -- Column to write data to
        """
        self._writelock.acquire()
        self._setPosition(row, col)
        self._writelock.release()
 
 
    def setBacklight(self, percent):
        """ Set the power level of the backlight to the given percentage.
        Also, store the given backlight setting so it can be restored during
        a call to reset().
 
        Keyword Arguments
        percent -- Percentage of power that the backlight should be set to. 
                   Zero corresponds to turning the backlight off.
        """
        self._backlight = percent
        self._writelock.acquire()
        self._setBacklight(percent)
        self._writelock.release()
 
 
    def setContrast(self, percent):
        """ Set the contrast level of the LCD.  Also, store the given 
        contrast setting so it can be restored during a call to reset().
 
        Keyword Arguments
        percent -- Contrast level, in percent.  100 is maximum contrast.
        """
        self._contrast = contrast
        self._writelock.acquire()
        self._setContrast(percent)
        self._writelock.release()
 
 
    def assignCustomCharacter(self, character, address):
        """ Place a custom character in one of the character slots.  The
        character should be an array of bytes representing the character
        bitmap.
 
        Keyword Arguments
        character -- The custom character to use write.  This should be a
                     character array representing the 
        """
        self._writelock.acquire()
        self._assignCustomCharacter(character, address)
        self._writelock.release()
 
 
    def registerAnimation(self, animation, time, address, col, row, name):
        """ TODO: rework this feature """
        # first, check if the name is new
        if(name in self._animations):
            return
        else:
            # make a new animation thread
            newanimation = AnimationThread(self, animation, time, address, col, row)
            # make it a daemon so that it won't stall the program at exit
            newanimation.setDaemon(1)
            # and add it to the list of animations
            self._animations[name] = newanimation
 
    def startAnimation(self, name):
        """ TODO: rework this feature """
        if(name in self._animations):
            self._animations[name].start()
 
    def stopAnimation(self, name):
        """ TODO: rework this feature """
        if(name in self._animations):
            # do we need to make sure semaphore is released first?
            self._animations[name].stop()
 
    def unregisterAnimation(self, name):
        """ TODO: rework this feature """
        if(name in self._animations):
            # do we need to make sure semaphore is released first?
            stop_animation(name)
            self._animations.pop(name)
 
    def registerCallback(self, callback, time, row, col, name):
        """ TODO: rework this feature """
        if(name in self._callbacks):
            return
        else:
            newcallback = CallbackThread(self, callback, time, row, col)
            newcallback.setDaemon(1)
            self._callbacks[name] = newcallback
 
    def startCallback(self, name):
        """ TODO: rework this feature """
        if(name in self._callbacks):
            self._callbacks[name].start()
 
    def stopCallback(self, name):
        """ TODO: rework this feature """
        if(name in self._callbacks):
            # do we need to make sure semaphore is released first?
            self._callback[name].stop()
 
    def unregisterCallback(self, name):
        """ TODO: rework this feature """
        if(name in self._callbacks):
            # do we need to make sure semaphore is released first?
            stop_callback(name)
            self._callbacks.pop(name)
 
 
###############################################################################
# Back-End functions.  This is where the actual hardware interaction happens.
# These are not intended to be called directly by the user.
###############################################################################
 
    def _reset(self):
        self._serial.write(chr(14))
        sleep(1)   # wait for device to come around
 
    def _clearScreen(self):
        self._serial.write(chr(12))
 
    def _setPosition(self, row, col):
        self._serial.write(chr(17) + chr(row) + chr(col))
 
    def _setBacklight(self, percent):
        self._serial.write(chr(20)+chr(int(percent*255/100)))
 
    def _setContrast(self, percent):
        self._serial.write(chr(19)+chr(int(percent*255/100)))
 
    def _assignCustomCharacter(self,character, address): 
        # address is 0 to 7.  This table defines the RAM locations for each
        # custom character
        location = [64, 72, 80, 88, 96, 104, 112, 120]
 
        # character is an array of eight integers
        self._serial.write(chr(21) + chr(location[address]))
        for i in range(0,8):
            self._serial.write(chr(23) + chr(character[i]))
 
    def _isValidPosition(self, row, col):
        if(col >=0 and col< self._cols and row>=0 and row< self._rows):
            return True
        return False
