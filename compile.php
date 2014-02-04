#!/usr/bin/env php
<?php
//require_once "System/Daemon.php";                 // Include the Class

//System_Daemon::setOption("appName", "mydaemon");  // Minimum configuration
//System_Daemon::start();                           // Spawn Deamon!
//error_reporting("0");
ignore_user_abort(true);
function get($url){
	$curl = curl_init();
	curl_setopt_array($curl, array(
	    CURLOPT_RETURNTRANSFER => 1,
	    CURLOPT_URL => $url
	));
	$result=curl_exec($curl);
	return $result;
}

function is_online() { $retval = 0; system("ping iPhoneTomas.local -c1 -q -w1", $retval); return $retval == 0; }
include "notify.php";
$kachel=0;
$i=0;
$vorige="";
notify("PI Gestart", "De pi is opgestart!");
$y=0;
$x=0;
while(1){
$settemp=file_get_contents("temp.json");
$livetemp=file_get_contents("gettemp.json");

if($livetemp<$settemp){
	//KOUDER
	if($kachel==0){
		$kachel=1;
		echo "-----------\n";
		echo "Kachel: $kachel\n";
		echo get("http://localhost/home/switch.php?b=elro&d=11111&u=1&s=1")."\n";
		echo get("http://localhost/home/switch.php?b=elro&d=11111&u=1&s=1")."\n";
		echo get("http://localhost/home/switch.php?b=elro&d=11111&u=1&s=1")."\n";
		echo get("http://localhost/home/status.php?d=1")."\n";
		echo "Tempratuur:".$livetemp."\n";
		echo "Ingestelde Tempratuur:".$settemp."\n";
		file_put_contents("heat.json", 1);
		echo "Return: ".file_get_contents("heat.json")."\n";
		echo notify("Kachel AAN!", "Thermostaat: $settemp\nGemeten tempratuur: $livetemp.")."\n";
		echo "-----------\n";
		$message = "Omdat het $livetemp graden celcius is in je kamer, heb ik je kachel aangezet!";

		// In case any of our lines are larger than 70 characters, we should use wordwrap()
		$message = wordwrap($message, 70, "\r\n");
		
		// Send
		
		
	}else{
		
	}
	
	
}else{
	//WARMER
	if($kachel==1){
	$kachel=0;
	echo "-----------\n";
	echo "Kachel: $kachel\n";
	echo get("http://localhost/home/switch.php?b=elro&d=11111&u=1&s=0");
	echo get("http://localhost/home/switch.php?b=elro&d=11111&u=1&s=0");
	echo get("http://localhost/home/switch.php?b=elro&d=11111&u=1&s=0");
	echo get("http://localhost/home/status.php?d=0");
	echo "Tempratuur:".$livetemp."\n";
	echo "Ingestelde Tempratuur:".$settemp."\n";
	file_put_contents("heat.json", 0);
	echo file_get_contents("heat.json")."\n";
	echo "-----------\n";
	notify("Kachel UIT!", "Thermostaat: $settemp\nGemeten tempratuur: $livetemp.");
	}
}

$content=file_get_contents("http://192.168.1.100/status.json");

if($content!=""){
	$json["status"]="1";	
}else{
	$json["status"]="0";
}

if($vorige!==$json["status"]){
	file_put_contents("serverstatus.json",json_encode($json));
	if($json["status"]=="1"){
		echo notify("Server AAN!", "De server is succesvol aangezet!")."\n";
	}else{
		echo notify("Server UIT!", "De server is uitgezet!")."\n";
	}
}
$vorige=$json["status"];
$i++;



// Check voor iphone
$weg=file_get_contents("weg.json");
if($weg=="1"){

if(is_online()){
	$y=0;
	if($x==5){
		echo "Iphone Gevonden\n";
	}
	$x++;
}else{
	if($y==10){
		echo "Iphone Niet Gevonden\n";
		exec("cd /home/pi/rc/ex/lights && sudo ./elro 31 B off");
		exec("cd /home/pi/rc/ex/lights && sudo ./action 21 B off");
		exec("cd /home/pi/rc/ex/lights && sudo ./elro 31 C off");
		echo notify("Iphone Weg", "Iphone Weg")."\n";
		
	$x=0;
	}
	$y++;
}

echo $x.",".$y."--\n";
}


sleep(5);
}
?>
