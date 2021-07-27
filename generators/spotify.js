
const rs                    = require('randomstring');
const moment                = require('moment');
const terrirtoryConstant    = require('../constant/territoryCodeMapping.js')

module.exports = function(targetPlatform, data, batchId, isTakeDown){
    targetPlatform = 'sample_'+targetPlatform;
    var xmlWrapper = {};
     // for xml generation
     var SampleWrapper                     = require(`../util/${targetPlatform}/Wrapper.json`);
     var SampleMessage                     = require(`../util/${targetPlatform}/Message.json`);
     // Resource
     var SampleResource                    = require(`../util/${targetPlatform}/Resource/Resource.json`);
     var SampleSoundRecording              = require(`../util/${targetPlatform}/Resource/SoundRecording.json`);
     var SampleImage                       = require(`../util/${targetPlatform}/Resource/Image.json`);
     var SampleDisplayArtist               = require(`../util/${targetPlatform}/Resource/DisplayArtist.json`);
     var SampleIndirectResourceContributor = require(`../util/${targetPlatform}/Resource/IndirectResourceContributor.json`);
     var SampleUserDefinedContributor      = require(`../util/${targetPlatform}/Resource/UserDefinedIndirectResourceContributor.json`);
     var SampleResourceContributor         = require(`../util/${targetPlatform}/Resource/ResourceContributor.json`);
     // Release
     var SampleAlbumRelease                = require(`../util/${targetPlatform}/Release/AlbumRelease.json`);
     var SampleTrackRelease                = require(`../util/${targetPlatform}/Release/TrackRelease.json`);
     // Deal
     var SampleDeal                        = isTakeDown ? require(`../util/${targetPlatform}/EndDeal.json`):require(`../util/${targetPlatform}/Deal.json`);

    xmlWrapper = SampleWrapper;
    var MessageHeader = [];
    var Message = JSON.parse(JSON.stringify(SampleMessage));
    var UpdateIndicator = [ 
      "OriginalMessage"
    ];
    var ResourceList = [];
    var Resource = JSON.parse(JSON.stringify(SampleResource));

    var ReleaseList = [
      {
        "Release":[]
      }
    ];
    var DealList = [];
    var Deal = JSON.parse(JSON.stringify(SampleDeal));

    /* start MessageHeader */
    //  set Batch Id
    Message.MessageThreadId[0]=batchId;
    // set TIMER AND ADD UTC+8
    Message.MessageCreatedDateTime[0] = new Date().toISOString().split('.')[0] + '+08:00';
    // set PARTY DETAIL
    MessageHeader.push(Message);
    xmlWrapper["ern:NewReleaseMessage"].MessageHeader = MessageHeader;
    /* end MessageHeader */

    /* start UpdateIndicator */
    xmlWrapper["ern:NewReleaseMessage"].UpdateIndicator = UpdateIndicator;
    /* end UpdateIndicator */

    /* start ResourceList */
    var AlbumRelease = JSON.parse(JSON.stringify(SampleAlbumRelease))
    var Image = JSON.parse(JSON.stringify(SampleImage))
    var ReleaseResourceReference = {
      "_": "",
      "$": {
        "ReleaseResourceType": "SecondaryResource"
      }
    }
    var ResourceGroupContentItem = {
      "SequenceNumber": [
        "1"
      ],
      "ResourceType": [
        "Image"
      ],
      "ReleaseResourceReference": [
        { 
          "_": "A1",
          "$": {
            "ReleaseResourceType": "SecondaryResource"
          }
        }
      ]
    }

    let upcCode     = data.album.upcCode || '1234567890';

    let imageName   = upcCode+'.'+data.album.artworkSrc.split('.').pop()
    let imageRef    = (data.album.tracks.length+1).toString()

    let isrc        = data.album.cartItemId;
    let name        = data.album.title;
    let regions     = data.album.selectedRegions || 'Worldwide';
    let genre       = data.album.primaryGenre;
    let releaseType = data.album.type;
    let releaseDate = data.album.releaseDate;
    let releaseTime = ((data.album.releaseTime || '').split(':') || []).filter(t => t);
    let artists     = data.album.artists;
    //parse region
    regions = regions.join(",");
    console.log("regions:",regions);
    console.log(terrirtoryConstant.territoryCodeMapping);
    regions = regions.replace('AF', terrirtoryConstant.territoryCodeMapping.AF);
    regions = regions.replace('EU', terrirtoryConstant.territoryCodeMapping.EU);
    regions = regions.replace('OC', terrirtoryConstant.territoryCodeMapping.OC);
    regions = regions.split(",");
    console.log("regions parsed:",regions);


    Image.ImageDetailsByTerritory[0].TechnicalImageDetails[0].File[0].FileName[0]=imageName;
    // set image random id
    Image.ImageId[0].ProprietaryId[0]["_"]=rs.generate(12).toUpperCase();
    Image.ImageId[0].ProprietaryId[0]["$"].Namespace="DPID:PADPIDA2018041902M";
    //set RESOURCE REFERENCE
    Image.ResourceReference[0]=ReleaseResourceReference["_"]
    =ResourceGroupContentItem.ReleaseResourceReference[0]["_"]
    ="A"+imageRef;
    //set TechnicalResourceDetailsReference
    Image.ImageDetailsByTerritory[0].TechnicalImageDetails[0].TechnicalResourceDetailsReference
    ="T"+imageRef;

    ResourceGroupContentItem.SequenceNumber[0]=imageRef;

    AlbumRelease.ReleaseDetailsByTerritory[0].ResourceGroup[0].ResourceGroupContentItem.push(ResourceGroupContentItem);
    AlbumRelease.ReleaseResourceReferenceList[0].ReleaseResourceReference.push(ReleaseResourceReference);

    //set ISRC
    AlbumRelease.ReleaseId[0].ICPN[0]["_"]=upcCode;
    //set TITLE
    AlbumRelease.ReferenceTitle[0].TitleText[0]=name;
    for(var i in AlbumRelease.ReleaseDetailsByTerritory[0].Title) {
      AlbumRelease.ReleaseDetailsByTerritory[0].Title[i].TitleText[0]=name;
    }

    for(var i in Image.ImageDetailsByTerritory[0].Title) {
      Image.ImageDetailsByTerritory[0].Title[i].TitleText[0]=name;
    }
    //set RELEASE TYPE
    if(releaseType=="ep"){
      var userDefined = {
        "_": "UserDefined",
        "$": {
          "UserDefinedValue": "EP"
        }
      }
      AlbumRelease.ReleaseType.push(userDefined)

    }else if (releaseType=="compilation"){
      var userDefined = {
        "_": "UserDefined",
        "$": {
          "UserDefinedValue": "Compilation"
        }
      }
      AlbumRelease.ReleaseType.push(userDefined)
    }else {
      AlbumRelease.ReleaseType[0]=releaseType.charAt(0).toUpperCase() + releaseType.slice(1);
    }

    //add release time to release date
    if (releaseTime.length > 0) {
      console.log('releaseDate:',releaseDate);
      //releaseTime.push('00');
      //var d = new Date(releaseDate + ' ' + releaseTime.join(':'));
      //releaseDate = d.toISOString();
    }

    //set RELEASE DATE
    AlbumRelease.ReleaseDetailsByTerritory[0].OriginalReleaseDate[0]
    =releaseDate;

    console.log('isTakeDown:'+isTakeDown);
    if(isTakeDown){
      var endDate = new Date().toISOString();
      delete Deal.ReleaseDeal[0].Deal[0].DealTerms[0].ValidityPeriod[0].StartDate;
      delete Deal.ReleaseDeal[0].Deal[1].DealTerms[0].ValidityPeriod[0].StartDate;
      Deal.ReleaseDeal[0].Deal[0].DealTerms[0].ValidityPeriod[0].EndDate[0]
      =Deal.ReleaseDeal[0].Deal[1].DealTerms[0].ValidityPeriod[0].EndDate[0]
      = endDate;
    }else{
      delete Deal.ReleaseDeal[0].Deal[0].DealTerms[0].ValidityPeriod[0].EndDate;
      delete Deal.ReleaseDeal[0].Deal[1].DealTerms[0].ValidityPeriod[0].EndDate;
      Deal.ReleaseDeal[0].Deal[0].DealTerms[0].ValidityPeriod[0].StartDate[0]
      =Deal.ReleaseDeal[0].Deal[1].DealTerms[0].ValidityPeriod[0].StartDate[0]
      = releaseDate;
    }

    //set RELEASE DATE for all deal
    Deal.ReleaseDeal[0].Deal[0].DealTerms[0].ReleaseDisplayStartDate[0]
    =Deal.ReleaseDeal[0].Deal[0].DealTerms[0].TrackListingPreviewStartDate[0]
    =Deal.ReleaseDeal[0].Deal[0].DealTerms[0].CoverArtPreviewStartDate[0]
    =Deal.ReleaseDeal[0].Deal[0].DealTerms[0].ClipPreviewStartDate[0]
    =Deal.ReleaseDeal[0].Deal[1].DealTerms[0].ReleaseDisplayStartDate[0]
    =Deal.ReleaseDeal[0].Deal[1].DealTerms[0].TrackListingPreviewStartDate[0]
    =Deal.ReleaseDeal[0].Deal[1].DealTerms[0].CoverArtPreviewStartDate[0]
    =Deal.ReleaseDeal[0].Deal[1].DealTerms[0].ClipPreviewStartDate[0]
    =releaseDate
    


    //set ARTIST with sequence number
    var sequenceNum = 1;

    for(var key in artists) {
      var artist = artists[key];
     

      let type = artist.type;
      let name = artist.name;
      var DisplayArtist = JSON.parse(JSON.stringify(SampleDisplayArtist));
      var ResourceContributor = JSON.parse(JSON.stringify(SampleResourceContributor));

      if(type==="main"){
        DisplayArtist.PartyName[0].FullName[0]
        =DisplayArtist.PartyName[0].KeyName[0]
        =ResourceContributor.PartyName[0].FullName[0]
        =ResourceContributor.PartyName[0].KeyName[0]
        =AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtistName[0]
        =name;

        DisplayArtist.ArtistRole[0]
        =ResourceContributor.ResourceContributorRole[0]
        ="MainArtist";
      }
      else {
        DisplayArtist.PartyName[0].FullName[0]
        =DisplayArtist.PartyName[0].KeyName[0]
        =ResourceContributor.PartyName[0].FullName[0]
        =ResourceContributor.PartyName[0].KeyName[0]
        =name;

        DisplayArtist.ArtistRole[0]
        =ResourceContributor.ResourceContributorRole[0]
        ="FeaturedArtist";

      }

      DisplayArtist["$"].SequenceNumber
      =ResourceContributor["$"].SequenceNumber
      =sequenceNum;

      sequenceNum++;

      Image.ImageDetailsByTerritory[0].ResourceContributor.push(ResourceContributor);
      AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
    }

    AlbumRelease.GlobalReleaseDate[0]=releaseDate;

    //set cline and pline for album and image 
    AlbumRelease.ReleaseDetailsByTerritory[0].PLine[0].Year
    =AlbumRelease.ReleaseDetailsByTerritory[0].CLine[0].Year
    =Image.ImageDetailsByTerritory[0].CLine[0].Year
    =data.album.tracks[0].publishedYear;

    AlbumRelease.ReleaseDetailsByTerritory[0].PLine[0].PLineCompany
    =AlbumRelease.ReleaseDetailsByTerritory[0].CLine[0].CLineCompany
    =Image.ImageDetailsByTerritory[0].CLine[0].CLineCompany
    =data.album.tracks[0].publishRightHolder;

    AlbumRelease.ReleaseDetailsByTerritory[0].PLine[0].PLineText
    =AlbumRelease.ReleaseDetailsByTerritory[0].CLine[0].CLineText
    =Image.ImageDetailsByTerritory[0].CLine[0].CLineText
    =('(P) ' + data.album.tracks[0].publishedYear + ' ' + data.album.tracks[0].publishRightHolder);

    // AlbumRelease.ReleaseDetailsByTerritory[0].CLine[0].Year=data.album.tracks[0].publishedYear;
    // AlbumRelease.ReleaseDetailsByTerritory[0].CLine[0].CLineCompany=data.album.tracks[0].publishRightHolder;
    // AlbumRelease.ReleaseDetailsByTerritory[0].CLine[0].CLineText=('(C) ' + data.album.tracks[0].publishedYear + ' ' + data.album.tracks[0].publishRightHolder);

    ReleaseList[0].Release.push(AlbumRelease);


    //set R0 into deal lists
    Deal.ReleaseDeal[0].DealReleaseReference.push("R0");

    for(var key in data.album.tracks) {
        var sequencecNumber = 1;
        var inDirectSequenceNumber = 1;

        var track = data.album.tracks[key]
        var SoundRecording = JSON.parse(JSON.stringify(SampleSoundRecording))
        var TrackRelease = JSON.parse(JSON.stringify(SampleTrackRelease))
        var ReleaseResourceReference = {
          "_": "A1",
          "$": {
            "ReleaseResourceType": "PrimaryResource"
          }
        }
        var ResourceGroupContentItem = {
          "SequenceNumber": [
            "1"
          ],
          "ResourceType": [
            "SoundRecording"
          ],
          "ReleaseResourceReference": [
            {
              "_": "A1",
              "$": {
                "ReleaseResourceType": "PrimaryResource"
              }
            }
          ]
        }

        let resourceRef   = (parseInt(key)+1).toString();
        let isrc          = track.isrc;
        let name          = track.name;
        let duration      = moment.duration(track.duration, 'seconds').toISOString();
        let trackFilename = upcCode+'_'+key+'.'+track.src.split('.').pop();

        let artists       = track.artists;
        let composers     = track.composers;
        let lyrists       = track.lyrists;
        let arrangers     = track.arrangers;
        let producers     = track.producers;
        let remixers      = track.remixers;
        let conductors    = track.conductors;
        let orchestra     = track.orchestra;

        //set ISRC
        SoundRecording.SoundRecordingId[0].ISRC[0]=isrc;
        //set ISRC with UPC Code and track order
        TrackRelease.ReleaseId[0].ProprietaryId[0]["_"]=upcCode+ "_"+isrc+ "_R"+resourceRef;
        // set pline
        SoundRecording.SoundRecordingDetailsByTerritory[0].PLine[0].PLineText[0]
        =TrackRelease.PLine[0].PLineText[0]
        =('(P) ' + track.publishedYear + ' ' + track.publishRightHolder);

        // set pline company
        SoundRecording.SoundRecordingDetailsByTerritory[0].PLine[0].PLineCompany[0]
        =TrackRelease.PLine[0].PLineCompany[0]
        =track.publishRightHolder;


        // set cline
        TrackRelease.CLine[0].CLineText[0]
        =('(C) ' + track.publishedYear + ' ' + track.publishRightHolder);
        //set label name
        //SoundRecording.SoundRecordingDetailsByTerritory[0].LabelName[0]
        TrackRelease.ReleaseDetailsByTerritory[0].LabelName[0]
        =track.copyrightHolder;
        //set ResourceReference
        SoundRecording.ResourceReference[0]
        =ReleaseResourceReference["_"]
        =ResourceGroupContentItem.ReleaseResourceReference[0]["_"]
        =TrackRelease.ReleaseDetailsByTerritory[0].ResourceGroup[0].ResourceGroup[0].ResourceGroupContentItem[0].ReleaseResourceReference[0]["_"]
        =TrackRelease.ReleaseResourceReferenceList[0].ReleaseResourceReference[0]["_"]
        ="A"+resourceRef;
        //set TechnicalResourceDetailsReference
        SoundRecording.SoundRecordingDetailsByTerritory[0].TechnicalSoundRecordingDetails[0].TechnicalResourceDetailsReference
        ="T"+resourceRef;
        //set ReleaseReference
        TrackRelease.ReleaseReference[0]="R"+resourceRef;
        Deal.ReleaseDeal[0].DealReleaseReference.push("R"+resourceRef);
        ResourceGroupContentItem.SequenceNumber[0]=resourceRef;
        AlbumRelease.ReleaseDetailsByTerritory[0].ResourceGroup[0].ResourceGroup[0].ResourceGroupContentItem.push(ResourceGroupContentItem);
        AlbumRelease.ReleaseResourceReferenceList[0].ReleaseResourceReference.push(ReleaseResourceReference);
        //set NAME
        SoundRecording.ReferenceTitle[0].TitleText[0]=TrackRelease.ReferenceTitle[0].TitleText[0]=name;
        for(var i in SoundRecording.SoundRecordingDetailsByTerritory[0].Title) {
          SoundRecording.SoundRecordingDetailsByTerritory[0].Title[i].TitleText[0]=TrackRelease.ReleaseDetailsByTerritory[0].Title[i].TitleText[0]=name
        }
        //set TerritoryCode
        SoundRecording.SoundRecordingDetailsByTerritory[0].TerritoryCode
        //=Image.ImageDetailsByTerritory[0].TerritoryCode
        =AlbumRelease.ReleaseDetailsByTerritory[0].TerritoryCode
        =TrackRelease.ReleaseDetailsByTerritory[0].TerritoryCode
        =regions;
        //set Genre
        SoundRecording.SoundRecordingDetailsByTerritory[0].Genre[0].GenreText
        =AlbumRelease.ReleaseDetailsByTerritory[0].Genre[0].GenreText
        =TrackRelease.ReleaseDetailsByTerritory[0].Genre[0].GenreText
        =genre;

        //set ARTIST with sequence number
        var sequenceNum = 1;

        for(var key in artists) {
          var artist = artists[key];

          let type = artist.type;
          let name = artist.name;
          var DisplayArtist = JSON.parse(JSON.stringify(SampleDisplayArtist));

          if(type==="main"){
            DisplayArtist.PartyName[0].FullName[0]
            =DisplayArtist.PartyName[0].KeyName[0]
            =TrackRelease.ReleaseDetailsByTerritory[0].DisplayArtistName
            =name;

            DisplayArtist.ArtistRole[0]="MainArtist";
          }
          else {
            DisplayArtist.PartyName[0].FullName[0]
            =DisplayArtist.PartyName[0].KeyName[0] 
            =name;

            DisplayArtist.ArtistRole[0]="FeaturedArtist";
          }
          DisplayArtist["$"].SequenceNumber = sequenceNum;
          sequenceNum++;

          TrackRelease.ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
          SoundRecording.SoundRecordingDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
        }
        //set COMPOSERS
        if (composers && composers.length) {
          for(var key in composers) {
            var composer = composers[key]
            var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

            let name = composer.name;

            if (name)
              IndirectResourceContributor.PartyName[0].FullName[0]=IndirectResourceContributor.PartyName[0].KeyName[0]=name;
            IndirectResourceContributor.IndirectResourceContributorRole[0]="Composer";
            IndirectResourceContributor["$"].SequenceNumber = inDirectSequenceNumber;

            SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
            inDirectSequenceNumber++;
          }
        }
        //set LYRISTS
        if (lyrists && lyrists.length) {
          for(var key in lyrists) {
            var lyrist = lyrists[key]
            var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

            let name = lyrist.name;

            IndirectResourceContributor.PartyName[0].FullName[0]
            =IndirectResourceContributor.PartyName[0].KeyName[0]
            =name;

            IndirectResourceContributor.IndirectResourceContributorRole[0]="Lyricist";
            IndirectResourceContributor["$"].SequenceNumber = inDirectSequenceNumber;

            SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
            inDirectSequenceNumber++;
          }
        }
        //set ARRANGERS
        if (arrangers && arrangers.length) {
          for(var key in arrangers) {
            var arranger = arrangers[key]
            var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

            let name = arranger.name;
            IndirectResourceContributor.PartyName[0].FullName[0]
            =IndirectResourceContributor.PartyName[0].KeyName[0]
            =name;

            IndirectResourceContributor.IndirectResourceContributorRole[0]="Arranger";
            IndirectResourceContributor["$"].SequenceNumber = inDirectSequenceNumber;

            SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
            inDirectSequenceNumber++;
          }
        }
        //set PRODUCERS
        if (producers && producers.length) {
          for(var key in producers) {
            var producer = producers[key]
            var ResourceContributor = JSON.parse(JSON.stringify(SampleResourceContributor));;

            let name = producer.name;

            ResourceContributor.PartyName[0].FullName[0]
            =ResourceContributor.PartyName[0].KeyName[0]
            =JSON.stringify(name);

            ResourceContributor.ResourceContributorRole[0]="Producer";
            ResourceContributor["$"].SequenceNumber = sequencecNumber;

            SoundRecording.SoundRecordingDetailsByTerritory[0].ResourceContributor.push(ResourceContributor);
            sequencecNumber++;
          }
        }  
        //set REMIXERS
        if (remixers) {
          var UserDefinedContributor = JSON.parse(JSON.stringify(SampleUserDefinedContributor));

          let name = remixers;

          UserDefinedContributor.PartyName[0].FullName[0]
          =IndirectResourceContributor.PartyName[0].KeyName[0]
          =name;

          UserDefinedContributor.IndirectResourceContributorRole[0]["$"].UserDefinedValue="Remixer"; // PADPIDA2018041902M
          UserDefinedContributor.IndirectResourceContributorRole[0]["$"].Namespace="DPID:PADPIDA2018041902M";
          UserDefinedContributor["$"].SequenceNumber = inDirectSequenceNumber;

          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(UserDefinedContributor);
          inDirectSequenceNumber++;
        }
        //set CONDUCTORS
        if (conductors) {
          var UserDefinedContributor = JSON.parse(JSON.stringify(SampleUserDefinedContributor));

          let name = remixers;
          UserDefinedContributor.PartyName[0].FullName[0]
          =IndirectResourceContributor.PartyName[0].KeyName[0]
          =name;

          UserDefinedContributor.IndirectResourceContributorRole[0]["$"].UserDefinedValue="Conductor";
          UserDefinedContributor.IndirectResourceContributorRole[0]["$"].Namespace="DPID:PADPIDA2018041902M";
          UserDefinedContributor["$"].SequenceNumber = inDirectSequenceNumber;

          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(UserDefinedContributor);
          inDirectSequenceNumber++;
          /*
          var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

          let name = conductors;
          IndirectResourceContributor.PartyName[0].FullName[0]=name;
          IndirectResourceContributor.IndirectResourceContributorRole[0]="Conductor";
          IndirectResourceContributor["$"].SequenceNumber = inDirectSequenceNumber;

          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
          inDirectSequenceNumber++;
          */
        } 
        //set ORCHESTRA
        if (orchestra) {
          var UserDefinedContributor = JSON.parse(JSON.stringify(SampleUserDefinedContributor));

          let name = remixers;
          UserDefinedContributor.PartyName[0].FullName[0]
          =IndirectResourceContributor.PartyName[0].KeyName[0]
          =name;

          UserDefinedContributor.IndirectResourceContributorRole[0]["$"].UserDefinedValue="Orchestra";
          UserDefinedContributor.IndirectResourceContributorRole[0]["$"].Namespace="DPID:PADPIDA2018041902M";
          UserDefinedContributor["$"].SequenceNumber = inDirectSequenceNumber;

          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(UserDefinedContributor);
          inDirectSequenceNumber++;
          /*
          var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

          let name = orchestra;
          IndirectResourceContributor.PartyName[0].FullName[0]=name;
          IndirectResourceContributor.IndirectResourceContributorRole[0]="Orchestra";
          IndirectResourceContributor["$"].SequenceNumber = inDirectSequenceNumber;

          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
          inDirectSequenceNumber++;
          */
        }
        //set SOUND TRACK
        SoundRecording.SoundRecordingDetailsByTerritory[0].TechnicalSoundRecordingDetails[0].File[0].FileName[0]=trackFilename;
        // set duration
        SoundRecording.Duration=duration;
        Resource.SoundRecording.push(SoundRecording);
        ReleaseList[0].Release.push(TrackRelease);
        
    }
    Resource.Image.push(Image);
    ResourceList.push(Resource);
    //to be commend for take down
    xmlWrapper["ern:NewReleaseMessage"].ResourceList = ResourceList;
    /* end ResourceList */

    /* start ReleaseList */
    //to be commend for take down
    xmlWrapper["ern:NewReleaseMessage"].ReleaseList = ReleaseList;
    /* end ReleaseList */

    /* start DealList */
    DealList.push(Deal)
    
    xmlWrapper["ern:NewReleaseMessage"].DealList = DealList; 
    /* end DealList */
    //console.log(JSON.stringify(xmlWrapper));
    return xmlWrapper;
}