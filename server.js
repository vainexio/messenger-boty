const login = require("@dongdev/fca-unofficial");
const body_parser = require('body-parser');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const express = require('express');
const cron = require('node-cron');
const fs = require("fs-extra");
const https = require("https");
const cors = require('cors');
const app = express();

const { getRandom, getTime, getTime2, sleep, send } = require('./storage/wrap.js');
const { settings } = require('./storage/settings.js');
const { methods } = require('./storage/method.js');
const { AI } = require('./storage/ai.js');

app.use(express.json());
mongoose.set('strictQuery', false);
const mongooseToken = process.env.MONGOOSE;

// Listen
let listener = app.listen(process.env.PORT, function() {
  console.log('Bot listening on port ' + listener.address().port);
});

const classSchedule = [
  { day: 'Tuesday', subject: 'Telecommunications & VOIP', section: 'BSIT231C', start: '13:00', end: '15:00', professor: 'Abigail T. Velasco' },
  { day: 'Friday', subject: 'Telecommunications & VOIP', section: 'BSIT231C', start: '13:00', end: '15:00', professor: 'Abigail T. Velasco' },
  { day: 'Monday', subject: 'Elective 2', section: 'BSIT231C', start: '09:00', end: '11:00', professor: 'Marco Paulo J. Burgos' },
  { day: 'Thursday', subject: 'Elective 2', section: 'BSIT231C', start: '09:00', end: '11:00', professor: 'Marco Paulo J. Burgos' },
  { day: 'Tuesday', subject: 'ICT Services Management', section: 'BSIT231C', start: '09:00', end: '11:00', professor: 'Kenneth Dynielle Lawas' },
  { day: 'Friday', subject: 'ICT Services Management', section: 'BSIT231C', start: '15:00', end: '17:00', professor: 'Kenneth Dynielle Lawas' },
  { day: 'Monday', subject: 'Information Security', section: 'BSIT231C', start: '11:00', end: '13:00', professor: 'TBA' },
  { day: 'Thursday', subject: 'Information Security', section: 'BSIT231C', start: '11:00', end: '13:00', professor: 'TBA' },
  { day: 'Wednesday', subject: 'Systems Analysis & Detailed Design', section: 'BSIT231C', start: '11:00', end: '15:00', professor: 'Edison M. Esberto' },
];

classSchedule.forEach(entry => { entry.mode = ['Monday', 'Tuesday'].includes(entry.day) ? 'online' : 'face-to-face' });
const daysMap = { Sunday: '0', Monday: '1', Tuesday: '2', Wednesday: '3', Thursday: '4', Friday: '5', Saturday: '6' };

function scheduleNotifications(api) {
  // Daily summary at 7:00 AM
  Object.entries(daysMap).forEach(([dayName, dayNum]) => {
    cron.schedule(`0 7 * * ${dayNum}`, () => {
      const today = moment.tz('Asia/Manila').format('dddd');
      if (today !== dayName) return;
      const todayClasses = classSchedule.filter(s => s.day === dayName);
      if (!todayClasses.length) return;

      let msg = '📚 *Today\'s Classes* 📚\n';
      todayClasses.forEach(s => {
        const start12 = moment.tz(s.start, 'HH:mm', 'Asia/Manila').format('h:mm A');
        const end12 = moment.tz(s.end, 'HH:mm', 'Asia/Manila').format('h:mm A');
        msg += `\n• *${s.subject}* with _${s.professor}_\n  _${start12} - ${end12}_ (${s.mode})\n`;
      });
      api.sendMessage(msg, settings.channels.log);
    }, { timezone: 'Asia/Manila' });
  });

  // 5-minute before each class reminder
  classSchedule.forEach(s => {
    const rem = moment.tz(s.start, 'HH:mm', 'Asia/Manila').subtract(5, 'minutes');
    const h = rem.hour(), m = rem.minute();
    const dayNum = daysMap[s.day];

    if (Number.isInteger(h) && Number.isInteger(m)) {
      cron.schedule(`${m} ${h} * * ${dayNum}`, () => {
        const start12 = moment.tz(s.start, 'HH:mm', 'Asia/Manila').format('h:mm A');
        const text = `⏰ Reminder: *${s.subject}* with _${s.professor}_ starts at ${start12} (${s.mode})`;
        api.sendMessage(text, settings.channels.log);
      }, { timezone: 'Asia/Manila' });
    }
  });
}

/**
 * Backfill any missed reminders when the bot starts (if within the 5-min window).
 */
function backfillReminders(api) {
  const now = moment.tz('Asia/Manila');
  const todayDay = now.format('dddd');
  classSchedule
    .filter(c => c.day === todayDay)
    .forEach(c => {
      const start = moment.tz(c.start, 'HH:mm', 'Asia/Manila');
      const remTime = start.clone().subtract(5, 'minutes');
      if (now.isBetween(remTime, start)) {
        const start12 = start.format('h:mm A');
        const notice = `⏰ Reminder: *${c.subject}* with _${c.professor}_ starts at ${start12} (${c.mode})`;
        api.sendMessage(notice, settings.channels.log);
      }
    });
}

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
