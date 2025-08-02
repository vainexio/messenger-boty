const express = require('express');
const body_parser = require('body-parser');
const fetch = require('node-fetch');
const app = express();
const fs = require("fs-extra");
const login = require("@dongdev/fca-unofficial");
const https = require("https");
const cors = require('cors');
// Allow requests from all origins


const { AI } = require('./storage/ai.js')
const { settings } = require('./storage/settings.js')
const { getRandom, getTime, getTime2, sleep, send } = require('./storage/wrap.js')
const { methods } = require('./storage/method.js')
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const mongooseToken = process.env.MONGOOSE;

app.use(express.json());

let convoSchema = null;
let convoModel = null
//SETTINGS
let messages = []
//Listen
let listener = app.listen(process.env.PORT, function() {
   console.log('Not that it matters but your app is listening on port ' + listener.address().port);
});
//

async function loadStuff() {
  await mongoose.connect(mongooseToken,{keepAlive: true});
  convoSchema = new mongoose.Schema({
    uuid: String, //Universally Unique Identifiers
    conversationFlow: [
      {
        role: String, //System, Assistant, User
        content: String, //Message
      }
    ]
  })
  convoModel = mongoose.model("Conversation_Model",convoSchema)
  let model = new convoModel(convoSchema)
  model.uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  let convo = [
    {role: 'System', content: 'You are a helpful assistant.'},
    {role: 'User', content: 'Hi'},
    {role: 'Assistant', content: 'Hello! How can I assist you today?'},
    {role: 'User', content: "What's 1+1?"},
    {role: 'Assistant', content: "The sum of 1 + 1 is 2."},
    {role: 'User', content: "Are you sure?"},
    {role: 'Assistant', content: "Yes, I'm sure. The arithmetic sum of 1 + 1 is 2. If you have a different context or if you have a specific question related to this, feel free to provide more details!"},
  ]
  model.conversationFlow = convo
  //await model.save();
}

loadStuff()

//FB Botting
async function start(acc) {
  //Login event
  login({appState: JSON.parse(fs.readFileSync('./'+acc.file+'.json', 'utf8'))}, async (err, api) => {
    //
    if (err) return console.log(err.error)
    //Variables
    acc.logins++
    let count = acc.logins
    api.setOptions({listenEvents: true});
    //Logs
    if (acc.logins === 1) console.log('Logged in as '+acc.name)
    else api.sendMessage('Logged in as '+acc.name+' ('+acc.logins+')',settings.channels.test)
    
    //Message event
    let listenEmitter = api.listenMqtt(async (err, event) => {
      //Close connection on error
      if (err) {
        if (typeof err === 'string' && err.includes('Connection closed.')) {
          console.log('Logged out as '+acc.name)
          count === acc.logins ? (console.log('Restarting'), listenEmitter.stopListening(), start(acc)) : null
        }
        
        return console.error(acc.name+" error: "+err);
      }
      //Receive if the event is a message
      if (event.type === "message" || event.type === "message_reply") {
        let bot = settings.users.find(u => u.id === event.senderID && u.enabled === true)
        if (bot) return;
        let type = event.isGroup ? 'GC' : 'PM'
        //
        let message = await methods.getMessage(api, event)
        console.log(message.author.name+' ['+message.channel.name+' - '+message.channel.id+']: '+event.body)
        console.log(event.attachments)
        event.attachments[0]?.ID ? settings.stickers.registered.push(`\n"${event.attachments[0]?.ID}"`) : null
        
        let hasPing = false
        event.mentions[acc.id] ? hasPing = true : event.type === 'message_reply' && event.messageReply.senderID === acc.id ? hasPing = true : event.body.toLowerCase().includes(acc.name) ? hasPing = true : null
        //Handle
        let command = methods.getCommand(event.body)
        let typing = false
        let reactions = ['😍','😆','😮','😢','😠']
        let randomReact = reactions[getRandom(0,reactions.length)]
        if (acc.name === 'Test') await api.setMessageReaction(randomReact,event.messageID)
        //Userphone Events
        let foundPhone = acc.userphones.find(p => p.threads.find(t => t === event.threadID) && p.pending === false)
        //
        let isDev = settings.developers.find(d => d === event.senderID || d === event.threadID)
        if (command) {
          //let endTyping = await api.sendTypingIndicator(message.channel.id);
          if (command.name === 'userphone') {
            //let message = await methods.getMessage(api, event)
            let phone = acc.userphones.find(p => p.pending === true)
            let currentPhone = acc.userphones.find(p => p.threads.find(t => t === event.threadID))
            if (currentPhone) return api.sendMessage("⭕ You are currently in a call. Please /disconnect first before initiating another call!",event.threadID)
            if (phone) {
              phone.pending = false
              phone.threads.push(event.threadID)
              api.sendMessage("📞 You picked up someone's call! Say hi!",event.threadID)
              api.sendMessage('📞 Someone picked up your call! Say hello!',phone.threads[0])
            } else {
              let data = {
                pending: true,
                threads: [ event.threadID ],
                author: event.userID,
              }
              acc.userphones.push(data)
              api.sendMessage('☎️ Waiting for someone to pickup the call...\nType /disconnect if you wish to end the call',event.threadID)
            }
          }
          else if (command.name === 'disconnect') {
            if (acc.userphones.length === 0) return api.sendMessage("⭕ You don't have an existing call right now.",event.threadID);
            for (let i in acc.userphones) {
              let phone = acc.userphones[i]
              if (phone.threads.find(t => t === event.threadID)) {
                if (phone) {
                  let otherThread = phone.threads.find(t => t !== event.threadID)
                  api.sendMessage("📵 You hung up the phone.",event.threadID)
                  otherThread ? api.sendMessage("📵 The other party hung up the phone :c\nType /userphone again to start another call!",otherThread) : null
                  acc.userphones.splice(i,1)
                } else {
                  api.sendMessage("⭕ You're not in a call right now. Type /userphone to start an anonymous call!",event.threadID)
                }
              }
              else if (i == acc.userphones.length-1) {
                api.sendMessage("⭕ You don't have an existing call right now.",event.threadID)
              }
            }
          }
          //await endTyping();
        }
        else if (foundPhone) {
          let otherThread = foundPhone.threads.find(t => t !== event.threadID)
          if (otherThread) {
            api.sendMessage('👤: '+event.body,otherThread)
            api.markAsRead(event.threadID)
          }
          else api.sendMessage('It seems like the other party hung up the phone..',event.threadID)
          return;
        }
        else if (hasPing || type === 'PM') {
          if (event.body.length > 0) {
            if (settings.AI.maintenance.enabled) {
              let mn = settings.AI.maintenance
              let date = getTime()
              if ((date.hour >= mn.until && date.state === mn.state) || date.day !== mn.day) {
                mn.enabled = false
                console.log('Disable Maintenance')
              } else {
                return api.sendMessage('🔴 Bot Maintenance\n• Date: '+mn.day+'\n• Until: '+mn.until+':00 '+mn.state+'\n• Reason: '+mn.desc,event.threadID,event.messageID)
              }
            }
            //let message = await methods.getMessage(api, event)
            let foundTrigger = settings.presave.find(p => p.trigger.find(t => event.body.toLowerCase().includes(t)))
            if (foundTrigger && foundTrigger.run) {
              let randomRespo = foundTrigger.response[getRandom(0,foundTrigger.response.length)]
              api.sendMessage(randomRespo,event.threadID,event.messageID)
              return;
            }
            let endTyping = await api.sendTypingIndicator(event.threadID)
            
            let data = await AI.chatAI(event.body.toLowerCase().replace(/image:|@nutatanong mo/g,''),event.body.toLowerCase().includes('image:') ? 'image' : 'chat',message.author,acc)
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
              api.setMessageReaction('😢',event.messageID)
              api.sendMessage("⚠️  Unexpected error occurred.\nThe bot is currently filled with requests.",event.threadID,event.messageID) //+data.response.error.message
            } else {
              if (data.type === 'image') {
                let url = data.response.data[0].url
                https.get(url, (res) => {
                  api.sendMessage({attachment: res},event.threadID,event.messageID)
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
                  await api.setMessageReaction('😥',event.threadID)
                }
              }
              let randomStix = settings.stickers.randoms[getRandom(0,settings.stickers.randoms.length)]
              
              let filtered = settings.AI.filter(msg.content,acc)
              let textContent = filtered.replace(/<\/?[^>]+(>|$)/g, '');
              let linkRegex = /https:\/\/(media\.discordapp\.net|cdn\.discordapp\.com)\/[^\s,)]+/g;///https:\/\/media\.discordapp\.net\/[^\s,)]+/g;
              let links = textContent.match(linkRegex);
              let args = await methods.getArgs(filtered)
              
              if (!links) return api.sendMessage({body: filtered},event.threadID,event.messageID), await endTyping();
              let attachments = []
              for (let i in links) {
                let link = links[i]
                let found = args.find(a => a.includes(link))
                if (found) filtered = filtered.replace(found,'𝙎𝙚𝙚 𝘼𝙩𝙩𝙖𝙘𝙝𝙢𝙚𝙣𝙩 𝘽𝙚𝙡𝙤𝙬')
                console.log(link)
                https.get(link, (res) => {
                  console.log('looping '+i)
                  attachments.push(res)
                  if (attachments.length == links.length) {
                    api.sendMessage({body: filtered, attachment: attachments},event.threadID,event.messageID)
                  }
                })
                }
              //
            }
            await endTyping()
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
              attachments += 'File '+(Number(i)+1)+': '+file+'\n\n'
            }
          }
          let msg = { body: foundMsg.author.name+' unsent a message:\n\n'+(foundMsg.content ? foundMsg.content : 'N/A')+(attachments.length > 0 ? '\n\nAttachments:\n'+attachments : ''), }
          let thread = acc.unsentLogger.sendToThread ? event.threadID : settings.channels.test
          if (acc.unsentLogger.enabled) api.sendMessage(msg, thread);
        }
      }
      //
    });
  });
  //End login event
}
///////////
let oneUserEnabled = false
for (let i in settings.users) {
  let acc = settings.users[i]
  if (acc.enabled) {
    start(acc)
    oneUserEnabled = true
  }
}
if (!oneUserEnabled) console.log('❌ No bots enabled')

app.use(cors())
//END FB BOTTING
process.on('unhandledRejection', async error => {
  console.error(error);
});
