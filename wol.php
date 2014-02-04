<?php
function wakeup($mac_addr,$router_addr) { 
     if ($fp = fsockopen($router_addr, 9, $errno, $errstr, 4)) { 
          //erlaubte Zeichen: 
          $hexchars = array("0","1","2","3","4","5","6","7","8","9", 
          "A","B","C","D","E","F", 
          "a","b","c","d","e","f" 
          ); 


     // 6 "volle" bytes (Also mit Wert 255 bzw. FF in hexadezimal) 
     $data = "\xFF\xFF\xFF\xFF\xFF\xFF"; 
     $hexmac = ""; 
     
     // Jetzt werden unnötige zeichen in der mac-adresse 
     // entfern (also z.B. die bindestriche usw.) 
     for ($i = 0; $i < strlen($mac_addr); $i++) { 
          if (!in_array(substr($mac_addr, $i, 1), $hexchars)) { 
               $mac_addr = str_replace(substr($mac_addr, $i, 1), "", $mac_addr); 
               } 
          } 

     for ($i = 0; $i < 12; $i += 2) { 
          $hexmac .= chr(hexdec(substr($mac_addr, $i, 2))); 
          } 

     // Hexadresse wird 16mal hintereinandergeschrieben 
     for ($i = 0; $i < 16; $i++) { 
          $data .= $hexmac; 
          } 
     fputs($fp, $data); 
     fclose($fp); 
     return true; 
     }else{ 
     echo "<b>Warnung: $errno</b> $errstr<br>"; 
     return false; 
     } 
}
wakeup("00:24:21:82:9B:8C","192.168.1.100");
?>