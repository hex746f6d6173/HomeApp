<?php
session_start();
// Check if an array of MAC-addresses is available
if (!$_SESSION['MAC_array'])
{
	if(file_exists('oui.txt'))
	{
		$_SESSION['MAC_array_source'] = " (data source: file 'oui.txt' on local filesystem of webserver)";
		$file_array = file('oui.txt');
	}
	else
	{
		// Import file to RAM
		$file_array = @file('http://standards.ieee.org/regauth/oui/oui.txt');
		// If no local file, try online
		if($file_array)
		{
			$_SESSION['MAC_array_source'] = " (data source: <a href=\"http://standards.ieee.org/regauth/oui/oui.txt\" target=\"_blank\">remote file</a>)";
			// Put a local copy in the directory of this script
			file_put_contents('oui.txt', $file_array);
		}
		else
		{
			$_SESSION['MAC_array_source'] = " (data source: locally nor remotely available)";
		}
	}
	if ($file_array)
	{
		// Build an array of MAC-addresses from $_SESSION['MAC_array']
		$i=0;
		foreach ($file_array as $key => $value)
		{
			if(substr_count($value,"   (hex)") == 1)
			{
				$delimiter = strpos($value,"   (hex)");
				$_SESSION['MAC_array'][substr($value,0,$delimiter)]=ltrim(substr($value,$delimiter+8,strlen($value)-($delimiter+8)),"\t");
				$i++;
			}
		}
	}
}
else
{
	$_SESSION['MAC_array_source'] = " (data source: cached from RAM)";
}
// To support proxy users (unreliable/ unsecure function)
if ($_SERVER["HTTP_X_FORWARDED_FOR"] == "")
{
	$current_client_IP = $_SERVER["REMOTE_ADDR"];
}
else
{
	$current_client_IP = $_SERVER["HTTP_X_FORWARDED_FOR"];
}
if (isset($_COOKIE['WOL'])) {
	// Read and decrypt cookie
	require("Includes/Decryption.php");
	$decrypted = Decryption(base64_decode($_COOKIE["WOL"]));
	// Prefill variables with contents of cookie
	$CutCookie = explode("<->", $decrypted);
	$Prefix = $CutCookie[0];
	$http_user_agent = $CutCookie[1];
	$time_string = $CutCookie[2];
	if ($time_string == "+0 seconds")
	{
		$time_string = "";
	}
	$mac_address = $CutCookie[3];
	$secureon = $CutCookie[4];
	$addr = $CutCookie[5];
	if ($addr == $current_client_IP)
	{
		$addr = "";
	}
	$cidr = $CutCookie[6];
	if ($cidr == "0")
	{
		$cidr = "";
	}
	$port = $CutCookie[7];
	$store = $CutCookie[8];
	$Postfix = $CutCookie[9];
	// Check salt (pre- and postfix) to check if cookie has been tampered with
	if (($Prefix != "prefix") || ($Postfix != "postfix")) {
		$set_cookie=1;
	}
	// Compare http_user_agent to check if cookie has been stolen
	if ($http_user_agent != $_SERVER['HTTP_USER_AGENT']) {
		$set_cookie=1;
	}
}
else {
	// If there is no cookie
	$set_cookie=1;
}
// Set default values
if ($set_cookie == 1) {
	$time_string = "+3 seconds";
	$mac_address = "00:00:00:00:00:00";
	$secureon = "";
	$addr = "";
	$cidr = "24";
	$port = "9";
	$store = "No";
}
?>
<!DOCTYPE html
PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" 
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></meta>
<meta http-equiv="Content-Language" content="en-us"></meta>

<meta http-equiv="Site-Enter" content="blendTrans(Duration=0.3)"></meta>
<meta http-equiv="Site-Exit" content="blendTrans(Duration=0.3)"></meta>
<meta http-equiv="Page-Enter" content="blendTrans(Duration=0.1)"></meta>
<meta http-equiv="Page-Exit" content="blendTrans(Duration=0.1)"></meta>

<meta name="description" content="This application (a couple of PHP-scripts) allows webusers to wake up WOL-enabled remote hosts."></meta>
<meta name="keywords" content="Wake-On-Lan, magic packet, sleep, hybernate"></meta>

<meta name="Owner" content="'DS508_customer' is the legal owner of this contents, unless stated differently."></meta>
<meta name="Copyright" content="© Copyright by 'DS508_customer'"></meta>

<meta http-equiv="Content-Style-Type" content="text/css"></meta>

<link rel="icon" href="/media/styleguide/favicon.ico" type="image/vnd.microsoft.icon"></link>
<link rel="shortcut icon" href="/media/styleguide/favicon.ico" type="image/vnd.microsoft.icon"></link>
<link rel="favicon" href="/media/styleguide/favicon.ico" type="image/vnd.microsoft.icon"></link>

<meta name="Generator" content="http://notepad-plus.sourceforge.net"></meta>
<meta http-equiv="Content-Script-Type" content="application/javascript"></meta>

<script type="text/javascript">
<!--
// This AJAX-function retrieves the value of the "Manufacturer of NIC" field.
function showValue(str) {
	var xmlHttp=null;
	// try to instantiate AJAX-object in "xmlHttp"
	try {
		// AJAX for Firefox, Opera 8.0+, Safari
		xmlHttp=new XMLHttpRequest();
	}
	catch (e) {
		//
		try {
			// AJAX for Internet Explorer 6.0+
			xmlHttp=new ActiveXObject("Msxml2.XMLHTTP");
		}
		catch (e) {
			try {
				// AJAX for Internet Explorer 5.5+
				xmlHttp=new ActiveXObject("Microsoft.XMLHTTP");
			}
			catch (e) {
				// browser does not support AJAX
				alert ("Your browser does not support AJAX!");
				return false;
			}
		}
	}
	// check whether AJAX-object exists
	if (xmlHttp==null) {
		// browser does not support AJAX
		return false;
	}
	// Build and send URL
	var url="NIC_manufacturer.php";
	url=url+"?ajaxVariable="+str;
	url=url+"&sid="+Math.random();
	xmlHttp.open("GET",url,true);
	xmlHttp.send(null);
	// If webserver returns a response
	xmlHttp.onreadystatechange=function()
	{
		// fill innerHTML in class="ajaxDIV" with the AJAX-response from server
		if(xmlHttp.readyState==4) {
			if (xmlHttp.status==200) {
				var ajaxDisplay=document.getElementById("ajaxDIV");
				if(ajaxDisplay != null) {
					ajaxDisplay.innerHTML=xmlHttp.responseText;
				}
			}
			else {
				// Problem retrieving XML data
				return false;
			}
		}
	}
}

function showPrefill() {
	// Prefill contents based on value of input-field (in case user has not changed anything)
	document.getElementById("ajaxDIV").innerHTML=showValue(document.getElementById('WOL_mac_address').value);
}
//-->
</script>

<title>Wake-On-Lan (WOL) - version 1 - input</title>
</head>
<body onload="showPrefill()">
Main functionality of this application: wake up remote devices that support it, such as WOL-enabled clients.
<!-- FORM -->
<form method="POST" action="WOL_script.php" name="WOL_form.php">
<fieldset>
	<legend>Schedule</legend>
	<table>
		<tr>
			<td>
				<label for="WOL_time_string">
					<p>
					Enter either the [date/time at] or [delay after] which the magic packet has to be send.<br></br>
					Enter a value in <a href="http://www.gnu.org/software/tar/manual/html_node/tar_113.html" target="_blank">this</a> input format.<br></br>
					Note: To prevent abuse, a minimum delay of 3 seconds will be set.<br></br>
					Leave the following field empty, if the magic packet needs to be send ASAP, after sending the WOL-request.<br></br>
					<?php
						echo "Current date and time of the webserver: <b>".date("d-m-y H:i:s e",time())."</b> (dd-mm-yyyy hh:mm:ss <a href=\"http://convertit.com/Go/ConvertIt/World_Time/Current_Time.ASP\" target=\"_blank\">timezone</a>).<br></br>";
					?>
					</p>
				</label>
			</td>
			<td>
				<div id="WOL_time_string">
					<input type="text" name="time_string" size="100" value="<?php echo $time_string; ?>"></input><br></br>
				</div>
			</td>
		</tr>
	</table>
</fieldset>
<fieldset>
	<legend>MAC-address</legend>
	<table>
		<tr>
			<td>
				<label for="WOL_mac_address">
					<p>
					Enter the MAC-address of the (possibly embedded) Network Interface Card (NIC) of the remote host.<br></br>
					Enter a value in this pattern: "xx-xx-xx-xx-xx-xx"<br></br>
					Manufacturer of NIC: <span id="ajaxDIV"></span><br></br>
					</p>
				</label>
			</td>
			<td>
					<input type="text" id="WOL_mac_address" name="mac_address" size="17" value="<?php echo $mac_address; ?>" onchange="showValue(this.value)"></input><br></br>
			</td>
		</tr>
	</table>
</fieldset>
<fieldset>
	<legend>SecureOn</legend>
	<table>
		<tr>
			<td>
				<label for="WOL_secureon">
					<p>
					Enter a hexidecimal password of a SecureOn enabled Network Interface Card (NIC) of the remote host.<br></br>
					Enter a value in this pattern: "xx-xx-xx-xx-xx-xx"<br></br>
					Leave the following field empty, if SecureOn is not used (for example, because the NIC of the remote host does not support SecureOn).<br></br>
					</p>
				</label>
			</td>
			<td>
					<input type="text" id="WOL_secureon" name="secureon" size="17" value="<?php echo $secureon; ?>"></input><br></br>
			</td>
		</tr>
	</table>
</fieldset>
<fieldset>
	<legend>Broadcast address</legend>
	<table>
		<tr>
			<td>
				<label for="WOL_addr">
					<p>
					Enter the host name (e.g. a FQDN from a dynamic DNS) or the IP address of the remote host's broadcast address (or gateway).<br></br>
					Enter 'localhost' to use '127.0.0.1' (i.e. this webserver), for example for a technical test.<br></br>
					Leave the following field empty, if the IP address from the current client should be used: <b><?php echo $current_client_IP; ?></b>.<br></br>
					Make sure this IP address  does not change, before the magic packet is send.<br></br>
					</p>
				</label>
			</td>
			<td>
					<input type="text" id="WOL_addr" name="addr" size="15" value="<?php echo $addr; ?>"></input><br></br>
			</td>
		</tr>
	</table>
</fieldset>
<fieldset>
	<legend>CIDR</legend>
	<table>
		<tr>
			<td>
				<label for="WOL_cidr">
					<p>
					Enter a number within the range of 0 to 32 in the following field.<br></br>
					Leave the following field empty, if no subnet mask should be used (CIDR = 0).<br></br>
					If the remote host's broadcast address is unkown:<br></br>
					1) enter the host name or IP address of the remote host in the previous field and<br></br>
					2) enter the CIDR subnet mask of the remote host in the following field.<br></br>
					</p>
				</label>
			</td>
			<td>
					<input type="text" id="WOL_cidr" name="cidr" size="2" value="<?php echo $cidr; ?>"></input><br></br>
			</td>
		</tr>
	</table>
</fieldset>
<fieldset>
	<legend>Port</legend>
	<table>
		<tr>
			<td>
				<label for="WOL_port">
					<p>
					Enter the port number at which the magic packet should be sent.<br></br>
					Enter a <a href="http://www.iana.org/assignments/port-numbers" target="_blank">port number</a> within the range 0 to 65536.<br></br>
					Note: Port 0 is historically the most common port and 7 or 9 are becoming the most common ports for transferring magic packets.<br></br>
					</p>
				</label>
			</td>
			<td>
					<input type="text" id="WOL_port" name="port" size="5" value="<?php echo $port; ?>"></input><br></br>
			</td>
		</tr>
	</table>
</fieldset>
<fieldset>
	<legend>Store</legend>
	<table>
		<tr>
			<td>
				<label for="Store">
					<p>
					Choose to (not) store this profile within a persistent cookie, which
					<?php
						if (!extension_loaded('mcrypt'))
						{
							echo "will <b>NOT</b> be encrypted (since <a href=\"http://nl.php.net/mcrypt\" target=\"_blank\">mcrypt</a> is unavailable on this webserver).";
						}
						else
						{
							echo "<b>WILL</b> be encrypted.";
						}
					?>
					<br></br>
					</p>
				</label>
			</td>
			<td>
				Do NOT store (also deletes an existing cookie): <input type="radio" name="store" value="No"
					<?php
						if ($store == "No")
						{
							echo " checked";
						}
					?>
				><br></br>
				This is usefull for unsafe and multi-user webbrowsers (such as in internet cafes).<br></br>
				DO store (overrides an existing cookie): <input type="radio" name="store" value="Yes"
					<?php
						if ($store == "Yes")
						{
							echo " checked";
						}
					?>
				><br></br>
				This is usefull for safe and single user webbrowsers.<br></br>
			</td>
		</tr>
	</table>
</fieldset>
<!-- BUTTONS -->
<em unselectable="on">
	<input type="submit" name="submit" value="Send request"></input>
</em>
<!-- BUTTONS -->
</form>
<!-- FORM -->
</body>
</html>