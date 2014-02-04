/////////////////////////////////////////////////////////////////////////
// Version: 2
// Author of this application:
//	DS508_customer (http://www.synology.com/enu/forum/memberlist.php?mode=viewprofile&u=12636)
//	Please inform the author of any suggestions on (the functionality, graphical design, ... of) this application.
//	More info: http://wolviaphp.sourceforge.net
// License: GPLv2.0
// Main functionality of this application:
//	This application (a couple of PHP-scripts) allows webusers to wake up WOL-enabled remote hosts.
/	It sends a magic packet via UDP IPv4 to a remote host, according to the values of the variables on the webform:
//	optional schedule, MAC-address, optional SecureOn password, broadcast address, CIDR and port.
//	The last values will be stored in a persistent cookie, which will be encrypted if mcrypt is available on the webserver.
// Warnings:
//	Use At Your Own Risk. The author of this application is in no way liable for (the usage of) this application.
//	As datalink packets (such as magic packets) are send via ISO-layer 2:
//		any source/ client can send magic packets to wake a WOL enabled remote host and
//		it does not matter whether the source/ client or remote host have a fixed or dynamic IP address (OSI-layer 3).
// The application:
//	contains self explaining comments in English.
//	validates all user input (against code injection), before doing anything else.
//	forces a minimum delay of 3 seconds, between each WOL-request to prevent abuse (DOS-attacks/ flooding with magic packets).
// Requirements:
//	Webserver running PHP v5.2.6 (earlier versions may work as well).
//	Make sure firewalls allow incoming magic packets (i.e. forward the public UDP port to the remote host's private broadcast address and do not use conflicting anti-DOS/flooding-rules).
//	Make sure the webserver permits sending packages via sockets. If a "Fatal error: Call to undefined function socket_create()" occurs:
//		Make sure "php_sockets.dll" (Windows) or "php_sockets.so" (Linux) is installed on the webserver.
//		Make sure that the line "extension=php_sockets.dll" in the php.ini file on the Windows webserver is enabled (remove the semi-colon at the beginning of that line). 
//		Restart the webserver, after installing extensions and changing directives.
//	To encrypt/ decrypt the persistent cookie (used for storing form values of variables) mcrypt should be installed and enabled on the webserver.
// Installation:
//	Put all uncompressed files in the same directory on a PHP-enabled (Windows or Linux) webserver.
//	If mcrypt is installed and enabled on the webserver: Change the value of $key in Includes/config.php
// Roadmap (to-do's):
//	Allow to use que management for WOL-requests (i.e., create, read, update/ pauze and delete/ cancel mutiple WOL-requests).
//	Allow to enter multiple WOL-requests with one COMMIT (submit).
//	Allow to send via IPv4 or IPv6.
//	Allow to use a secure layer-3 challenge/response authentication mechanism with the client,
//		after the remote host receives a magic packet and
//		before the remote host decides to "fully" awake or resume sleeping.
//		This will require some software on the remote host.
//	Display that remote host has or may not have awoken (by sending a ping request: http://birk-jensen.dk/articles/php/ping/ping.php), after certain delay after sending a magic packet.
//	Implement custom error handling in form.
//	If mcrypt is not available, use an alternate encryption method (preferably AES-256).
//	Display an URL which triggers the WOL-request (which users can bookmark for example).
//	Check whether the remote oui.txt has been updated.
//	Support multi-languages.
//	Use Cascading Style Sheets (use <div> and <class>).
//	Add button to update data source: file 'oui.txt' on local filesystem of webserver
//	Add option to read/ write profiles (e.g. profile A, profile B, profile C, ...) to a file on the server:
//		"Read settings from: values in the form below/ persistent cookie on the client/ a file on the server"
//		"Write settings: nowwhere/ in persistent cookie on the client/ on a file on the server"
//	Change-log
//	1.0
//		First release
//	2.0
//		Bug fixes
//			Improved contents of ReadMe.txt
//		New or improved functions
//			Added an option [to NOT store and to delete existing] settings within a persistent cookie
/////////////////////////////////////////////////////////////////////////