  /** 
  * Record Label and KKbox sftp folder name mapping,default point to tt_one_cool_music
  * Key:    Record Label
  * Value:  folder name in kkbox
  **/
 const territoryCodeMapping = {
    'AF'       :'DZ,EG,MA,ZA,TN',
    'EU'        :'AD,AT,BE,BG,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IS,IE,IT,LV,LI,LT,LU,MT,MC,NL,NO,PL,PT,RO,SK,ES,SE,CH,TR,GB',
    'OC'        :'AU,NZ'
    
}


module.exports = Object.freeze({
    territoryCodeMapping
});



/**
 const TerritoryCode = [
    "AD", "AE", "AG", "AL", "AR", "AT", "AU", "BA", "BB", "BE", "BG", "BH", "BO", "BR", "BS", 
    "BY", "BZ", "CA", "CH", "CL", "CO", "CR", "CY", "CZ", "DE", "DK", "DM", "DO", "DZ", "EC", 
    "EE", "EG", "ES", "FI", "FR", "GB", "GD", "GR", "GT", "GY", "HK", "HN", "HR", "HT", "HU", 
    "ID", "IE", "IL", "IN", "IS", "IT", "JM", "JO", "JP", "KN", "KW", "KZ", "LB", "LC", "LI", 
    "LT", "LU", "LV", "MA", "MC", "MD", "ME", "MK", "MT", "MX", "MY", "NI", "NL", "NO", "NZ", 
    "OM", "PA", "PE", "PH", "PL", "PS", "PT", "PY", "QA", "RO", "RS", "RU", "SA", "SE", "SG", 
    "SI", "SK", "SV", "TH", "TN", "TR", "TT", "TW", "UA", "UY", "VC", "VN", "ZA"
    ]
**/