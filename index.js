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
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
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
    bot.reply(message, "I'm here!")
});

controller.hears('hello', 'direct_message', function (bot, message) {
    bot.reply(message, 'Hello!');
});


controller.hears('start', 'direct_mention', function(bot, message) {

    if (runHappening) {
        return bot.reply(message, 'Already gathering requests for a run in' + runChannel);
    }

    bot.reply(message, 'Holy La Croix! <@' + message.user_name + '> is going for a Pop-a-Top run. Who <@here> has a request? Tell me what you want and I will let them know!');
    runHappening = true;
    console.log('===runHappening = ' + runHappening);

    /*//notify first user and start a conversation
    userIterator = usersModel.iterator();
    currentUser = userIterator.next();
    promptUser(bot);*/

});

controller.hears('echo', 'direct_mention' function(bot, messsage) {
    bot.reply(message, '...echo');
    console.log('========Message ' + message);
});

controller.hears('end', 'direct_mention', function(bot, message) {
    if (!runHappening) {
        return bot.reply(message, 'Nobody is on a run right now. Start a new run with `start`');
    }

    runHappening = false;
    console.log('===runHappening = ' + runHappening);

    console.log('===runList = ' + runList);

    bot.reply(message, 'The run is now over!');

    bot.startConversation(message, function(err,convo){
        convo.ask('<@' + message.user_name + '> want to see the list?', [{
            pattern: bot.utterances.yes,
            callback: function(response, convo) {
                console.log('====runList = ' + runList);

                for (var i = 0; i < runList.length; i++) {
                  listString = (message.user_name + ': ' + runList[i].requests.join(', '));
                    bot.reply(message, (listString));
                }

                console.log('===Heard yes, output runList object');
                console.log('===Output listString= ' + listString);
                convo.next();
            }
        }, {
            pattern: bot.utterances.no,
            callback: function(response,convo) {
                bot.say({channel: message.channel, text: 'Okey Dokey. That was fun, see you later!'});
                // runModel.clearStatuses();
                console.log('Heard no')
                convo.next();
            }
        }]);
    });
});

/*runList = [
  {user_name: 'Em', requests: ['pamp mouse']}
]
*/
controller.hears('(.*)', 'direct_mention, direct_message', function(bot, message) {
    if (runHappening) {
        gatherRequest(bot, message);
    }
});

function gatherRequest(bot, message) {
    console.log('===request = ' + message);
    bot.reply(message, 'Got it! Thanks ' + message.user_name);
    addDesire(message);
    function addDesire(message){
      for (var i = 0; i < runList.length; i++) {
      if (runList[i].user_name === message.user_name) {
        runList[i].requests.push(message.text);
      }
      else {
        runList.push({user_name: message.user_name, requests: [message.text]});
      }
    }};

    console.log('===Pushing request to runList');

   /* runModel.addRequest({
        request: message.text,
        user: message.user
    });
    */

}
