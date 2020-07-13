
const rs            = require('randomstring');
const moment        = require('moment');

module.exports = function(targetPlatform, data, batchId, isTakeDown){
    targetPlatform = 'sample_' + targetPlatform;
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
     var SampleResourceContributor         = require(`../util/${targetPlatform}/Resource/ResourceContributor.json`);
     // Release
     var SampleAlbumRelease                = require(`../util/${targetPlatform}/Release/AlbumRelease.json`);
     var SampleTrackRelease                = require(`../util/${targetPlatform}/Release/TrackRelease.json`);
     // Deal
     var SampleDeal                        = require(`../util/${targetPlatform}/Deal.json`);

    xmlWrapper = SampleWrapper;
    var MessageHeader = [];
    var Message = SampleMessage;
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
    // set TIME
    Message.MessageCreatedDateTime[0]=new Date().toISOString();
    // set PARTY DETAIL
    MessageHeader.push(Message);
    console.log("Message");
    console.log(Message);
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
    console.log(imageName);
    console.log('releaseASAP:',data.album.releaseASAP);
    let imageRef    = (data.album.tracks.length+1).toString()
    let isrc        = data.album.cartItemId;
    let name        = data.album.title;
    let regions     = data.album.selectedRegions || 'Worldwide';
    let genre       = data.album.primaryGenre;
    let releaseType = data.album.type;
    let releaseDate = data.album.releaseASAP == 'true' ? new Date().toISOString() : data.album.releaseDate;
    let releaseTime = ((data.album.releaseTime || '').split(':') || []).filter(t => t);
    let artists     = data.album.artists;
    

    // console.log(imageName);
    // console.log('releaseASAP:',data.album.releaseASAP);
    // console.log('releaseDate:',data.album.releaseDate);
    // console.log('releaseDate:',releaseDate);

    //set COVER IMAGE
    Image.ImageDetailsByTerritory[0].TechnicalImageDetails[0].File[0].FileName[0]=imageName;
    // set random id, no random id for joox
    //Image.ImageId[0].ProprietaryId[0]["_"]=rs.generate(12);
    //set RESOURCE REFERENCE
    Image.ResourceReference[0]=ReleaseResourceReference["_"]=ResourceGroupContentItem.ReleaseResourceReference[0]["_"]="A"+imageRef;
    //set TechnicalResourceDetailsReference
    Image.ImageDetailsByTerritory[0].TechnicalImageDetails[0].TechnicalResourceDetailsReference
    ="T"+imageRef;
    ResourceGroupContentItem.SequenceNumber[0]=imageRef;
    AlbumRelease.ReleaseDetailsByTerritory[0].ResourceGroup[0].ResourceGroupContentItem.push(ResourceGroupContentItem);
    AlbumRelease.ReleaseResourceReferenceList[0].ReleaseResourceReference.push(ReleaseResourceReference);

    //set ISRC
    //AlbumRelease.ReleaseId[0].ISRC[0]["_"]=upcCode;
    AlbumRelease.ReleaseId[0].UPC[0]=upcCode;
    AlbumRelease.ReleaseId[0].ISRC[0]=upcCode;
    //set TITLE
    AlbumRelease.ReferenceTitle[0].TitleText[0]=name;
    for(var i in AlbumRelease.ReleaseDetailsByTerritory[0].Title) {
      AlbumRelease.ReleaseDetailsByTerritory[0].Title[i].TitleText[0]=name;
    }
    console.log('releaseType:',releaseType);
    console.log('releaseType:',releaseType.toLowerCase() == "compilation");
    //set RELEASE TYPE
    if(releaseType.toLowerCase() == "ep"){
      var userDefined = {
        "_": "UserDefined",
        "$": {
          "UserDefinedValue": "EP"
        }
      }
      AlbumRelease.ReleaseType.push(userDefined)

    }else if (releaseType.toLowerCase() == "compilation"){
      var userDefined = {
        "_": "UserDefined",
        "$": {
          "UserDefinedValue": "Compilation"
        }
      }
      AlbumRelease.ReleaseType.push(userDefined)
    }else {
      AlbumRelease.ReleaseType[0]=releaseType;
    }

    // //add release time to release date
    // if (releaseTime.length > 0) {
    //   releaseTime.push('00');
    //   var d = new Date(releaseDate + ' ' + releaseTime.join(':'));
    //   releaseDate = d.toISOString();
    // }

    //set RELEASE DATE
    AlbumRelease.ReleaseDetailsByTerritory[0].ReleaseDate[0]
    =Deal.ReleaseDeal[0].Deal[0].DealTerms[0].ValidityPeriod[0].StartDate[0]
    =Deal.ReleaseDeal[0].Deal[1].DealTerms[0].ValidityPeriod[0].StartDate[0]
    =releaseDate.split(/T/).shift();


    //set Album ARTIST in R0
    if (releaseType.toLowerCase() != "compilation"){
      for(var key in artists) {
        var artist = artists[key]
  
        let type = artist.type;
        let name = artist.name;
        var DisplayArtist = JSON.parse(JSON.stringify(SampleDisplayArtist));
  
        if(type==="main"){
          DisplayArtist.PartyName[0].FullName[0]=AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtistName[0]=name;
          DisplayArtist.ArtistRole[0]="MainArtist";
        }
        else{
          DisplayArtist.PartyName[0].FullName[0]=name;
          AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtistName[0]='';
          DisplayArtist.ArtistRole[0]="FeaturedArtist";
        }
        AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
      }

    }else{
      var DisplayArtist = JSON.parse(JSON.stringify(SampleDisplayArtist));

      DisplayArtist.PartyName[0].FullName[0]="Various Artists";
      DisplayArtist.ArtistRole[0]="MainArtist";

      AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
    }
    

    ReleaseList[0].Release.push(AlbumRelease);
    //set R0 into deal lists
    Deal.ReleaseDeal[0].DealReleaseReference.push("R0");

    for(var key in data.album.tracks) {
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
        //set UPC
        TrackRelease.ReleaseId[0].UPC[0]=upcCode;
        //set ISRC
        SoundRecording.SoundRecordingId[0].ISRC[0]=TrackRelease.ReleaseId[0].ISRC[0]=isrc;
        // set pline
        SoundRecording.SoundRecordingDetailsByTerritory[0].PLine[0].PLineText[0]
        =TrackRelease.PLine[0].PLineText[0]
        =('(P) ' + track.publishedYear + ' ' + track.publishRightHolder);
        // set cline
        TrackRelease.CLine[0].CLineText[0]
        =('(C) ' + track.publishedYear + ' ' + track.publishRightHolder);
        //set label name
        SoundRecording.SoundRecordingDetailsByTerritory[0].LabelName[0]
        =TrackRelease.ReleaseDetailsByTerritory[0].LabelName[0]
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
        console.log('push deal ref:',"R"+resourceRef);
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
        //set track ARTIST
        // if (releaseType.toLowerCase() != "compilation"){
          for(var key in artists) {
            var artist = artists[key]
            let type = artist.type;
            let name = artist.name;
            var DisplayArtist = JSON.parse(JSON.stringify(SampleDisplayArtist));
            
            console.log(`display ${type} artist:`, name);

            if(type==="main"){
              DisplayArtist.PartyName[0].FullName[0]=TrackRelease.ReleaseDetailsByTerritory[0].DisplayArtistName=name;
              DisplayArtist.ArtistRole[0]="MainArtist";
            }
            else {
              DisplayArtist.PartyName[0].FullName[0]=name;
              TrackRelease.ReleaseDetailsByTerritory[0].DisplayArtistName='';
              DisplayArtist.ArtistRole[0]="FeaturedArtist";
            }
            //only add track artist to album level if release type is not compilation
            // if (releaseType.toLowerCase() != "compilation")
            //   AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);

            TrackRelease.ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
            SoundRecording.SoundRecordingDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
          }
        // }
        console.log('DisplayArtists: ',JSON.stringify(TrackRelease.ReleaseDetailsByTerritory[0].DisplayArtist));
        //set COMPOSERS
        if (composers && composers.length) {
          for(var key in composers) {
            var composer = composers[key]
            var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

            let name = composer.name;

            if (name)
              IndirectResourceContributor.PartyName[0].FullName[0]=name;
            IndirectResourceContributor.IndirectResourceContributorRole[0]="Composer";
            SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
          }
        }
        //set LYRISTS
        if (lyrists && lyrists.length) {
          for(var key in lyrists) {
            var lyrist = lyrists[key]
            var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

            let name = lyrist.name;

            IndirectResourceContributor.PartyName[0].FullName[0]=name;
            IndirectResourceContributor.IndirectResourceContributorRole[0]="Lyricist";
            SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
          }
        }
        //set ARRANGERS
        if (arrangers && arrangers.length) {
          for(var key in arrangers) {
            var arranger = arrangers[key]
            var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

            let name = arranger.name;
            IndirectResourceContributor.PartyName[0].FullName[0]=name;
            IndirectResourceContributor.IndirectResourceContributorRole[0]="Arranger";
            SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
          }
        }
        //set PRODUCERS
        if (producers && producers.length) {
          for(var key in producers) {
            var producer = producers[key]
            var ResourceContributor = JSON.parse(JSON.stringify(SampleResourceContributor)); 

            let name = producer.name;

            ResourceContributor.PartyName[0].FullName[0]=name;
            ResourceContributor.ResourceContributorRole[0]="Producer";
            SoundRecording.SoundRecordingDetailsByTerritory[0].ResourceContributor.push(ResourceContributor);
          }
        }
        //set REMIXERS
        if (remixers) {
          var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

          let name = remixers;
          IndirectResourceContributor.PartyName[0].FullName[0]=name;
          IndirectResourceContributor.IndirectResourceContributorRole[0]="Remixer";
          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
        }
        //set CONDUCTORS
        if (conductors) {
          var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

          let name = conductors;
          IndirectResourceContributor.PartyName[0].FullName[0]=name;
          IndirectResourceContributor.IndirectResourceContributorRole[0]="Conductor";
          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
        }
        //set ORCHESTRA
        if (orchestra) {
          var IndirectResourceContributor = JSON.parse(JSON.stringify(SampleIndirectResourceContributor));

          let name = orchestra;
          IndirectResourceContributor.PartyName[0].FullName[0]=name;
          IndirectResourceContributor.IndirectResourceContributorRole[0]="Orchestra";
          SoundRecording.SoundRecordingDetailsByTerritory[0].IndirectResourceContributor.push(IndirectResourceContributor);
        }
        //set SOUND TRACK
        SoundRecording.SoundRecordingDetailsByTerritory[0].TechnicalSoundRecordingDetails[0].File[0].FileName[0]=trackFilename;
        // set duration
        SoundRecording.Duration=duration;

        SoundRecording.SoundRecordingDetailsByTerritory[0].RightsController.DelegatedUsageRights.PeriodOfRightsDelegation.StartDate = data.album.releaseDate;

        Resource.SoundRecording.push(SoundRecording);
        //console.log(Deal.ReleaseDeal[0].DealReleaseReference);
        ReleaseList[0].Release.push(TrackRelease);
    }

     // console.log('Resource.SoundRecording: ',JSON.stringify(Resource.SoundRecording));
     // add various artist if releaseType == "compilation"
  //  if (releaseType.toLowerCase() == "compilation"){
  //     var DisplayArtist = JSON.parse(JSON.stringify(SampleDisplayArtist));
  //     var TrackRelease = JSON.parse(JSON.stringify(SampleTrackRelease))

  //     DisplayArtist.PartyName[0].FullName[0]="Various Artists";
  //     DisplayArtist.ArtistRole[0]="MainArtist";

  //     AlbumRelease.ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
  //     ReleaseList[0].Release[0].ReleaseDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
  //     Resource.SoundRecording[0].SoundRecordingDetailsByTerritory[0].DisplayArtist.push(DisplayArtist);
  //   }  


    Resource.Image.push(Image);
    ResourceList.push(Resource);
    xmlWrapper["ern:NewReleaseMessage"].ResourceList = ResourceList;
    /* end ResourceList */

    /* start ReleaseList */
    xmlWrapper["ern:NewReleaseMessage"].ReleaseList = ReleaseList;
    /* end ReleaseList */
    console.log(Deal.ReleaseDeal[0].DealReleaseReference);
    /* start DealList */
    DealList.push(Deal)
    xmlWrapper["ern:NewReleaseMessage"].DealList = DealList; 
    /* end DealList */

    return xmlWrapper;
}