/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!
var runHappening = false;
var runList = [];


controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!");
});

controller.hears('hello', 'direct_message', function (bot, message) {
    bot.reply(message, 'Hello!');
});


controller.hears('start', 'direct_mention', function(bot, message) {

    if (runHappening) {
        return bot.reply(message, 'Already gathering requests for a run in' + runChannel);
    }

    bot.reply(message, 'Holy La Croix! <@' + message.user + '> is going for a Pop-a-Top run. Who  <@here> has a request? Tell me what you want and I will let them know!');
    runHappening = true;
    console.log('===runHappening = ' + runHappening);
    console.log(message);
});

controller.hears('echo', 'direct_mention', function(bot, messsage) {
    bot.reply(message, '...echo');
    console.log('========Message ' + message);
});

//When the run is ended, collect runList into a string format, return it to user that owns the run
//TODO: Add metadata to the runList array containing owner, channel, etc.
controller.hears('end', 'direct_mention', function(bot, message) {
    if (!runHappening) {
        return bot.reply(message, 'Nobody is on a run right now. Start a new run with `start`');
    }
    runHappening = false;
    str = JSON.stringify(runList[0]);
    bot.reply(message, 'The run is now over!');

    bot.startConversation(message, function(err,convo){
        convo.ask('<@' + message.user + '> want to see the list?', [{
            pattern: bot.utterances.yes,
            callback: function(response, convo) {
                if (!runList[0]) {
                    bot.say({channel: message.channel, text: 'I have no requests for you at this time!'});
                    convo.next(); }

                /*
                * This looks messy! Should be tidied up and maybe functionalized
                */
                var listString = [];
                //Loop through runList and convert entries into strings
                for (var i = 0; i < runList.length; i++) {
                    //Create a variable that contains the object to push into 
                    var x = '<@' + runList[i].user + '>' + ': ' + runList[i].requests.join(', ');
                    //Use .push() to add each object anything to an array
                  listString.push(x);
            }
                listFormatted = listString.join('\n');
                 bot.say({channel: message.channel, text: listFormatted});
                convo.next();
            }
            ///^^End^^ of callback function triggered by bot.utterances.yes
               
            },
             {
            pattern: bot.utterances.no,
            callback: function(response,convo) {
                bot.say({channel: message.channel, text: 'Okey Dokey. That was fun, see you later!'});
                // runModel.clearStatuses();
                console.log('Heard no');
                convo.next();
            }
        }]);
    });})
;
/*runList = [
  {user: 'Em', requests: ['pamp mouse']}
]
*/
controller.hears('(.*)', 'direct_mention, direct_message', function(bot, message) {
    if (runHappening) {
        gatherRequest(bot, message);
    }
});

function gatherRequest(bot, message) {
    console.log('===request = ' + message.text);
    bot.reply(message, 'Got it! Thanks <@' + message.user + '>');
    addDesire(message);

function addDesire(message){
        if (!runList[0]) {
        var pushy = {user: message.user, requests: [message.text]};
        runList.push(pushy);
        console.log('===addDesire: !runlist[0] so add first entry');
        return;
        }
         
      for (var i = 0; i < runList.length; i++) {

    //Check if the current user already has an entry in runList under their user
      if (runList[i].user == message.user) {

        //If so, .push() the text of their message into the requests array
        runList[i].requests.push(message.text);
        console.log('===addDesire: user already exists in runList! Pushing their request into the requests array for their user');
      }

      //If not, .push() a new Object into runList with their user and request
      else {

        //Create a variable pushy to hold the object we are going to push into runList
        var pushy = {user: message.user, requests: [message.text]};
        console.log(pushy);
        runList.push(pushy);
      }
    }}
    console.log('===Pushing request to runList');
}




   /* runModel.addRequest({
        request: message.text,
        user: message.user
    });
    */



