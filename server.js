const login = require("@dongdev/fca-unofficial");
const body_parser = require('body-parser');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const express = require('express');
const fs = require("fs-extra");
const https = require("https");
const cors = require('cors');
const app = express();

const { getRandom, getTime, getTime2, sleep, send } = require('./storage/wrap.js');
const { settings } = require('./storage/settings.js');
const { methods } = require('./storage/method.js');
const { AI } = require('./storage/ai.js');
const { scheduleNotifications, backfillReminders } = require('./storage/class-schedules.js');

////--------------------------------------------------------------------------------------------------


////--------------------------------------------------------------------------------------------------


app.use(express.json());
mongoose.set('strictQuery', false);
const mongooseToken = process.env.MONGOOSE;

// Listen
let listener = app.listen(process.env.PORT, function() {
  console.log('Bot listening on port ' + listener.address().port);
});

async function loadStuff() {
  await mongoose.connect(mongooseToken, { keepAlive: true });
}

// FB Botting
async function start(acc) {
  login({ appState: JSON.parse(fs.readFileSync(`./${acc.file}.json`, 'utf8')) }, async (err, api) => {
    if (err) return console.error(err);
    acc.logins++;
    api.setOptions({ listenEvents: true });

    scheduleNotifications(api);
    backfillReminders(api);

    const loginMsg = acc.logins === 1
      ? `Logged in as ${acc.name}`
      : `Logged in as ${acc.name} (${acc.logins})`;
    console.log(loginMsg);
    if (acc.logins > 1) api.sendMessage(loginMsg, settings.channels.log);

    //Message event
    let listenEmitter = api.listenMqtt(async (err, event) => {
      //Close connection on error
      if (err) {
        if (typeof err === 'string' && err.includes('Connection closed.')) {
          console.log('Logged out as ' + acc.name)
          count === acc.logins ? (console.log('Restarting'), listenEmitter.stopListening(), start(acc)) : null
        }

        return console.error(acc.name + " error: " + err);
      }
      //Receive if the event is a message
      if (event.type === "message" || event.type === "message_reply") {
        let bot = settings.users.find(u => u.id === event.senderID && u.enabled === true)
        if (bot) return;
        let type = event.isGroup ? 'GC' : 'PM'
        console.log(event)
        //
        let message = await methods.getMessage(api, event)
        console.log(message.author.name + ' [' + message.channel.name + ' - ' + message.channel.id + ']: ' + event.body)
        console.log(event.attachments)
        event.attachments[0]?.ID ? settings.stickers.registered.push(`\n"${event.attachments[0]?.ID}"`) : null

        let hasPing = false
        event.mentions[acc.id] ? hasPing = true : event.type === 'message_reply' && event.messageReply.senderID === acc.id ? hasPing = true : event.body.toLowerCase().includes(acc.name) ? hasPing = true : null
        //
        let isDev = settings.developers.find(d => d === event.senderID || d === event.threadID)
        if (hasPing || type === 'PM') {
          if (event.body.length > 0) {
            if (settings.AI.maintenance.enabled) {
              let mn = settings.AI.maintenance
              let date = getTime()
              if ((date.hour >= mn.until && date.state === mn.state) || date.day !== mn.day) {
                mn.enabled = false
                console.log('Disable Maintenance')
              } else {
                return api.sendMessage('🔴 Bot Maintenance\n• Date: ' + mn.day + '\n• Until: ' + mn.until + ':00 ' + mn.state + '\n• Reason: ' + mn.desc, event.threadID, event.messageID)
              }
            }
            //let message = await methods.getMessage(api, event)
            let foundTrigger = settings.presave.find(p => p.trigger.find(t => event.body.toLowerCase().includes(t)))
            if (foundTrigger && foundTrigger.run) {
              let randomRespo = foundTrigger.response[getRandom(0, foundTrigger.response.length)]
              api.sendMessage(randomRespo, event.threadID, event.messageID)
              return;
            }

            let data = await AI.chatAI(event.body.toLowerCase().replace(/image:|@nicholas jace travious/g, ''), event.body.toLowerCase().includes('image:') ? 'image' : 'chat', message.author, acc)
            !data.response.choices ? console.log(data) : null
            let firstTime = !settings.firstTime.find(f => f === event.threadID)
            if (firstTime) {
              /*settings.firstTime.push(event.threadID)
              let link = 'https://cdn.discordapp.com/attachments/1150419141824610334/1160064612302073976/ba2da865eba76ecfbb49fbf8da494b12.mp4'
              https.get(link, (res) => {
                api.sendMessage({attachment: res},event.threadID,event.messageID)
              })
              return;*/
            }
            if (data.response.error) {
              api.setMessageReaction('😢', event.messageID)
              api.sendMessage("⚠️  Unexpected error occurred.\nThe bot is currently filled with requests.", event.threadID, event.messageID) //+data.response.error.message
            } else {
              if (data.type === 'image') {
                let url = data.response.data[0].url
                https.get(url, (res) => {
                  api.sendMessage({ attachment: res }, event.threadID, event.messageID)
                })
                return;
              }
              let msg = data.response.choices[0].message
              console.log(msg.content)
              let found = settings.AI.users.find(u => u.id === event.senderID)
              if (found) {
                found.messages.push(msg)
                if (data.response.usage.total_tokens >= settings.AI.maxTokens) {
                  found.messages = []
                  await api.setMessageReaction('😥', event.threadID)
                }
              }
              let randomStix = settings.stickers.randoms[getRandom(0, settings.stickers.randoms.length)]

              let filtered = settings.AI.filter(msg.content, acc)
              let textContent = filtered.replace(/<\/?[^>]+(>|$)/g, '');
              let linkRegex = /https:\/\/(media\.discordapp\.net|cdn\.discordapp\.com)\/[^\s,)]+/g;///https:\/\/media\.discordapp\.net\/[^\s,)]+/g;
              let links = textContent.match(linkRegex);
              let args = await methods.getArgs(filtered)

              if (!links) return api.sendMessage({ body: filtered }, event.threadID, event.messageID);
              let attachments = []
              for (let i in links) {
                let link = links[i]
                let found = args.find(a => a.includes(link))
                if (found) filtered = filtered.replace(found, '𝙎𝙚𝙚 𝘼𝙩𝙩𝙖𝙘𝙝𝙢𝙚𝙣𝙩 𝘽𝙚𝙡𝙤𝙬')
                console.log(link)
                https.get(link, (res) => {
                  console.log('looping ' + i)
                  attachments.push(res)
                  if (attachments.length == links.length) {
                    api.sendMessage({ body: filtered, attachment: attachments }, event.threadID, event.messageID)
                  }
                })
              }
              //
            }
          }
        }
        //
      }
      else if (event.type === "message_unsend") {
        let foundMsg = settings.messages.find(m => m.id === event.messageID)
        if (foundMsg && acc.id !== event.senderID) {
          let attachments = ''
          if (foundMsg.attachments.length > 0) {
            for (let i in foundMsg.attachments) {
              let file = foundMsg.attachments[i].url
              attachments += 'File ' + (Number(i) + 1) + ': ' + file + '\n\n'
            }
          }
          let msg = { body: foundMsg.author.name + ' unsent a message:\n\n' + (foundMsg.content ? foundMsg.content : 'N/A') + (attachments.length > 0 ? '\n\nAttachments:\n' + attachments : ''), }
          let thread = acc.unsentLogger.sendToThread ? event.threadID : settings.channels.log
          if (acc.unsentLogger.enabled) api.sendMessage(msg, thread);
        }
      }
      //
    });
  });
}

let oneUserEnabled = false;
settings.users.forEach(acc => {
  if (acc.enabled) {
    start(acc);
    oneUserEnabled = true;
  }
});
if (!oneUserEnabled) console.log('❌ No bots enabled');

app.use(cors());
process.on('unhandledRejection', error => console.error(error));
