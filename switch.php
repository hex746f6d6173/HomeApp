<?php
$b=$_GET["b"];
$d=$_GET["d"];
$u=$_GET["u"];
$s=$_GET["s"];
$output["status"]=exec("cd /home/pi/rc/ex/lights && sudo ./$b $d $u $s");
echo json_encode($output);
?>