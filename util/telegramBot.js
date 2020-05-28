const request               = require('request');
const telegramBotUrl        = "https://api.telegram.org/bot";
const telegramAccessToken   = "828135623:AAEqlTCxENIdUmq8i27D_YCjbUy2hPSkhIo";


exports.sendMessages = function(content, batchId){
    const requestBody = {
        chat_id: '-357531165',
        text: `[${batchId}]:`+content
    }

    //console.log(requestBody);

    request({
        method: 'POST',
        url: telegramBotUrl + telegramAccessToken + "/sendMessage",
        headers: {
            'Content-Type': 'application/json'
          },
        body:JSON.stringify(requestBody)

    }, (error, response, body) => {
        //console.log(response);
        //console.log(body);
        return;
    })
}

/*module.exports = function(messageContent){nodemon

    console.log(messageContent);
        const sendTelegramMsg = sendMessages(messageContent);
        console.log(sendTelegramMsg);

}*/
