<?php
exec("nmap -sP 192.168.1.*",$lines);
$ip;
foreach($lines as $line){
	$array=explode(" ", $line);
	if (preg_match('#[0-9]#',$array[4])){
		$ip[]=$array[4];
	}
}
print_r($ip);
?>