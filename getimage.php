<?
$camurl="http://localhost:8081/";
$boundary="\n--";
$f = @fopen($camurl,"r") ;
   if(!$f)
   {
        //**** cannot open
        echo "error";
   }
    else
  {
        //**** URL OK
         while (substr_count($r,"Content-Length") != 2) $r.=@fread($f,512);
         $start = strpos($r,'ÿ')+1;
         $end   = strpos($r,$boundary,$start)-1;
         $frame = substr("$r",$start,$end - $start);
         header("Content-type: image/jpeg");
         echo $frame;
   }
fclose($f);
?>