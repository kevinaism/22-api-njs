 
 /** 
  * Record Label and KKbox sftp folder name mapping,default point to tt_one_cool_music
  * Key:    Record Label
  * Value:  folder name in kkbox
  **/
 const recordlabelToFolderMapping = {
    'Kurious Grocery Limited '      :'tt_kurious_grocery',
    'Kurious Grocery Limited'       :'tt_kurious_grocery',
    'Kurious Grocery Ltd.'          :'tt_kurious_grocery',
    'Goomusic Limited'              :'tt_goomusic',
    'People Mountain People Sea'    :'tt_people_mountain_people_sea',
    'One Cool Music'                :'tt_one_cool_music',
    ''                              :'tt_one_cool_music',
    'One Cool Music (HK) Limited'  :'tt_one_cool_music',
    'One Cool Music (HK) Limited '  :'tt_one_cool_music',
    '19Hz'                          :'tt_19hz',
    '19Hz '                         :'tt_19hz',
    'One Cool Music (HK) Limited & Triple S Co., Ltd.':'tt_one_cool_music',
    'Tat Flip'                      :'tt_tat_flip',
    '光復香港唱片公司'                 :'tt_goomusic',
    'Mosic Music'                   :'tt_mosic_music',
    'Mosic Music '                   :'tt_mosic_music',
    'Rockmui Ltd.'                  :'tt_rockmui_limited',
    'Lowland Pianist Limited'       :'tt_lowland_pianist_limited',
    'GDJYB Independent'             :'tt_lose_control_company',
    'Daymaker Creatives'            :'tt_daymaker_creatives', 
    'Daymaker Creatives '           :'tt_daymaker_creatives' ,
    'Leading PR and Promotion Limited':'tt_one_cool_music',
    '1516 Productions ': 'tt_1516_productions'
}

module.exports = Object.freeze({
    recordlabelToFolderMapping
}); 