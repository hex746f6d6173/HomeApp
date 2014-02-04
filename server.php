<?php
$q=$_GET["q"];
if($q=="0"){
	$connection = ssh2_connect('192.168.1.100', 22);
	ssh2_auth_password($connection, 'root', 'fleismann');
	
	$stream = ssh2_exec($connection, 'sudo poweroff');
	stream_set_blocking($stream, true);
	echo stream_get_contents($stream);
	fclose($stream);
}else{
	$url="http://localhost/home/wol/WOL_script.php?time_string=+3%20seconds&mac_address=00:24:21:82:9B:8C&secureon=&addr=192.168.1.100&cidr=24&port=9&store=No&submit=Send%20request";
	$curl = curl_init();
	curl_setopt_array($curl, array(
	    CURLOPT_RETURNTRANSFER => 1,
	    CURLOPT_URL => $url
	));
	$result=curl_exec($curl);
	echo $result;
}
?>