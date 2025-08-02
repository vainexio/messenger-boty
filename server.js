const express = require('express');
const body_parser = require('body-parser');
const fetch = require('node-fetch');
const app = express();
const fs = require("fs-extra");
const login = require("fca-unofficial");
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
//
let DTM_User = null;
let todoSchema = null;
let todoModel = null;

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
  //Todo
  todoSchema = new mongoose.Schema({
    id: Number,
    author: String,
    desc: String,
    duration: Number,
    notices: Number,
    ms: Number,
    fixedTime: Number,
    message: String,
    bot: String,
  })
  todoModel = mongoose.model("Todo_Model4",todoSchema)
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
    api.setOptions({listenEvents: true, forceLogin: true}); //, 
    //Logs
    if (acc.logins === 1) console.log('Logged in as '+acc.name)
    else api.sendMessage('Logged in as '+acc.name+' ('+acc.logins+')',settings.channels.test)
    
    //Message event
    let listenEmitter = api.listen(async (err, event) => {
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
        //If birthday
        if (message.author.bday && !settings.birthdays.find(b => b === event.senderID)) {
          settings.birthdays.push(event.senderID)
          api.sendMessage('🎉🎂 HAPPY BUDAYY',event.threadID,event.messageID)
        }
        if (command) {
          //let endTyping = await api.sendTypingIndicator(message.channel.id);
          if (command.name === 'accept.threads' && isDev) {
            //Accept pending threads
            let threads = await api.getThreadList(10, null, ["PENDING"])
            console.log('Pending threads: '+threads.length)
            if (threads.length > 0) {
              let stringThread = '';
              for (let i in threads) {
                let thread = threads[i]
                let id = thread.threadID
                await api.handleMessageRequest(id, true)
                api.sendMessage(settings.acceptMessage,id)
                
                if (!thread.isGroup) {
                  let user = thread.userInfo.find(u => u.id !== acc.id) 
                  if (user) {
                    stringThread += '👤 '+user.name+' - '+id+'\n\n'
                    console.log('PM thread: '+user.name+' - '+id)
                  }
                  } else {
                    stringThread += '👥 '+thread.name+' - '+id+'\n\n'
                    console.log('GC thread: '+thread.name+' - '+id)
                  }
                
              }
              api.sendMessage('Accepted '+threads.length+' thread(s).\n\n'+stringThread,event.threadID)
            } else api.sendMessage("There are currently no pending threads to accept.",event.threadID)
          } 
          
          else if (command.name === 'threads' && isDev) {
            //Accept pending threads
            let args = methods.getArgs(message.content)
            let isCustom = !isNaN(args[1])
            let max = isCustom ? Number(args[1]) : 100
            let threads = await api.getThreadList(max, null, ["INBOX"])
            console.log('Total threads: '+threads.length)
            if (threads.length > 0) {
              let stringThread = '';
              for (let i in threads) {
                let thread = threads[i]
                
                let id = thread.threadID
                if (!thread.isGroup) {
                  let user = thread.userInfo.find(u => u.id !== acc.id) 
                  if (user) {
                    isCustom ? stringThread = '👤 '+user.name+' - '+id+'\n\n'
                    : stringThread += '👤 '+user.name+' - '+id+'\n\n'
                  }
                  } else {
                    isCustom ? stringThread = '👥 '+thread.name+' - '+id+'\n\n'
                    : stringThread += '👥 '+thread.name+' - '+id+'\n\n'
                  }
                
              }
              api.sendMessage('Found '+(isCustom ? '1' : threads.length)+' thread(s).\n\n'+stringThread,event.threadID)
            } else api.sendMessage("No threads found.",event.threadID)
          }
          else if (command.name === 'reset' && isDev) {
            settings.AI.users = []
            api.sendMessage('✅ Successfully reset all users data!',event.threadID)
          }
          else if (command.name === 'remind') {
            //let message = await methods.getMessage(api, event)
            let args = event.body.trim().split(/ +/);
            if (!args[1]) return await api.sendMessage('Command Template\n/remind [duration] [text]\n\nExample:\n/remind 30m wake up\n\ns = seconds\nm = minutes\nh = hours\nd = days',event.threadID);
            
            let type = args[1].replace(/[0-9]/g, '').toLowerCase()
            let numState = Number(args[1].replace(/d|h|m|s/g,''))
            let stringDuration = ""
            //Determine length
            if (type !== 'd' && type !== 'h' && type !== 'm' && type !== 's') return api.sendMessage(' Please input an absolute length. No decimalss. (e.g. 1s, 2m, 3h, 4d)',event.threadID)
            let deadline = numState
            if (deadline < 10 && type === 's') return api.sendMessage('The set duration must be at least longer than 10 seconds!',event.threadID)
            type === 'd' ? deadline = deadline*86400000 : type === 'h' ? deadline = deadline*3600000 : type === 'm' ? deadline = deadline*60000 : type === 's' ? deadline = deadline*1000 : null
            stringDuration = type === 'd' ? args[1].replace(type,' days.') : type === 'h' ? args[1].replace(type,' hours.') : type === 'm' ? args[1].replace(type,' minutes.') : type === 's' ? args[1].replace(type,' seconds.') : null
            console.log(numState)
            numState === 1 ? stringDuration = stringDuration.replace('s','') : null
            //Get time
            let currentTime = new Date().getTime();
            let todo = args.slice(2).join(" ");
            let id = getRandom(1000,100000)
            let dur = currentTime+deadline
            let newModel = new todoModel(todoSchema)
            newModel.id = id
            newModel.author = event.senderID
            newModel.desc = todo
            newModel.duration = getTime2(dur)
            newModel.fixedTime = currentTime
            newModel.notices = 0
            newModel.ms = deadline
            newModel.message = event.threadID
            newModel.bot = acc.name
            
            let msg = {
              body: "I'll remind you of that in "+stringDuration
            }
            api.sendMessage(msg,event.threadID,event.messageID)
            //api.setMessageReaction('👍',event.messageID)
            await newModel.save()
           
          }
          else if (command.name === 'userphone') {
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
          else if (command.name === 'add') {
            let args = methods.getArgs(event.body)
            let id = args.slice(1).join(' ')
            console.log(id.length,id,'lll')
            if (id.length === 0) return api.sendMessage('Please select a valid user name or ID.',event.threadID,event.messageID)
            let foundUser = settings.cache.users.find(u => u.name.toLowerCase() === id.toLowerCase() || id.toLowerCase().startsWith(u.firstName.toLowerCase()))
            if (foundUser) {
              console.log('found user')
              api.addUserToGroup(foundUser.id,event.threadID, (err) => {
                if (err) return api.sendMessage('⚠️ Failed to add user to the group. Unexpected error occurred',event.threadID,event.messageID)
                api.sendMessage('✅ Successfully added user to the group.',event.threadID,event.messageID)
              })
            } else {
              console.log('User not found - find via ID')
              api.addUserToGroup(id[1],event.threadID, (err) => {
                if (err) return api.sendMessage('⚠️ Failed to add user to the group. Unknown user name/ID.',event.threadID,event.messageID)
                api.sendMessage('✅ Successfully added user to the group.',event.threadID,event.messageID)
              })
            }
          }
          else if (command.name === 'addall') {
            let args = methods.getArgs(event.body)
            let id = args.slice(1).join(' ')
            let thread = await api.getThreadInfo(id)
            for (let i in thread.participantIDs) {
              await sleep(1000)
              api.addUserToGroup(thread.participantIDs[i], event.threadID)
            }
          }
          else if (command.name === 'test') {
            let file2 = fs.createReadStream("file.jpg");
            api.sendMessage({attachment: file2},event.threadID)
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
            //api.markAsRead(message.channel.id);
            
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
          let msg = { body: foundMsg.author.name+' unsent a message.\n\nContent:\n'+(foundMsg.content ? foundMsg.content : 'N/A')+(attachments.length > 0 ? '\n\nAttachments:\n'+attachments : ''), }
          let thread = acc.unsentLogger.sendToThread ? event.threadID : settings.channels.test
          if (acc.unsentLogger.enabled) api.sendMessage(msg, thread);
        }
      }
      //
    });
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    let ready = true
    const interval1 = setInterval(async function() {
      if (count !== acc.logins) clearInterval(interval1);
      //Reminder
      if (!todoModel) return;
      let models = await todoModel.find()
      //REMINDER
      for (let i in models) {
        let model = models[i]
        let time = getTime2(new Date().getTime())
        let half = getTime2(model.fixedTime+(model.ms/2))
        let percentage = getTime2(model.fixedTime+(95*model.ms)/100)
        //Send reminder
        if (time >= half && model.bot === acc.name) {
          //If reached half
          
          //if passed duration
          if (model.notices === 0 && time >= model.duration) {
            let user = await api.getUserInfo(model.author)
            if (user) {
              let msg = {
                body: "🔔 @Reminder "+model.desc, //user[model.author].name
                mentions: []
              }
              let thread = await api.getThreadInfo(model.message)
              if (thread.isGroup) {
                for (let i in thread.participantIDs) {
                  let id = thread.participantIDs[i]
                  msg.mentions.push({
                  tag: '@Reminder',
                  id: id,
                  fromIndex: 0,
                })
                }
              } else {
                msg.mentions.push({
                  tag: '@Reminder',
                  id: model.author,
                  fromIndex: 0,
                })
              }
              model.notices++;
              await model.save();
              api.sendMessage(msg,model.message);
              await todoModel.deleteOne({id: model.id});
            }
          }
        }
      }
      //END REMINDER
      //Get time//
      let date = new Date().toLocaleString("en-US", { timeZone: 'Asia/Shanghai' });
      let today = new Date(date);
      let hours = (today.getHours() % 12) || 12;
      let dayCount = today.getDay();
      //if (dayCount === 0 || dayCount === 6) return;
      let days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
      let day = days[dayCount]
      let state = today.getHours() >= 12 ? 'PM' : 'AM'
      let time = hours +":"+today.getMinutes()+' '+state;
      
      let schedules = [
        {
          day: 'monday',
          tasks: [
            { remindIn: '8:30 AM', type: 1, title: '𝗖𝗢𝗡𝗪𝗢𝗥𝗟𝗗', text: 'Starts at 9:00 AM', prof: 'Dayielle Menchie C. Fidel', loc: 'V-Dynmc 2'},
            { remindIn: '12:30 PM', type: 1, title: '𝗜𝗧 𝗖𝗢𝗡𝗖𝗘𝗣𝗧𝗦', text: 'Starts at 1:00 PM', prof: 'Dominique M. Azarraga', loc: 'CCS-E01'},
            { remindIn: '2:30 PM', type: 1, title: '𝗔𝗥𝗧 𝗔𝗣𝗣𝗥𝗘𝗖𝗜𝗔𝗧𝗜𝗢𝗡', text: 'Starts at 3:00 PM', prof: 'Aerhiel D. Ban-O', loc: 'V-402'},
          ],
        },
        {
          day: 'thursday',
          tasks: [
            { remindIn: '8:30 AM', type: 2, title: '𝗖𝗢𝗡𝗪𝗢𝗥𝗟𝗗', text: 'Starts at 9:00 AM', prof: 'Dayielle Menchie C. Fidel', loc: 'Dynmc 2'},
            { remindIn: '12:30 PM', type: 2, title: '𝗜𝗧 𝗖𝗢𝗡𝗖𝗘𝗣𝗧𝗦', text: 'Starts at 1:00 PM', prof: 'Dominique M. Azarraga', loc: 'CCS-E01'},
            { remindIn: '2:30 PM', type: 2, title: '𝗔𝗥𝗧 𝗔𝗣𝗣𝗥𝗘𝗖𝗜𝗔𝗧𝗜𝗢𝗡', text: 'Starts at 3:00 PM', prof: 'Aerhiel D. Ban-O', loc: 'HSSH-402'},
          ],
        },
        //
        {
          day: 'tuesday',
          tasks: [
            { remindIn: '6:30 AM', type: 1, title: '𝗡𝗦𝗧𝗣', text: 'Starts at 7:00 AM', prof: 'Alathea S. Jimenez', loc: 'V-401'},
            { remindIn: '8:30 AM', type: 1, title: '𝗠𝗠𝗪', text: 'Starts at 9:00 AM', prof: 'Leona Lisa D. De Jesus', loc: 'V-Dynmc 1'},
            { remindIn: '12:30 PM', type: 1, title: '𝗔𝗣𝗣𝗟𝗜𝗘𝗗 𝗣𝗥𝗢𝗝𝗘𝗖𝗧 𝟭', text: 'Starts at 1:00 PM', prof: 'Daniel Ivonh M. Ingco', loc: 'V-202'},
            { remindIn: '2:30 PM', type: 1, title: '𝗜𝗡𝗧𝗖𝗢𝗠𝗣', text: 'Starts at 3:00 PM', prof: 'Abigail T. Velasco', loc: 'VComLab-3'},
          ],
        },
        {
          day: 'friday',
          tasks: [
            { remindIn: '6:30 AM', type: 2, title: '𝗡𝗦𝗧𝗣', text: 'Starts at 7:00 AM', prof: 'Alathea S. Jimenez', loc: 'HSSH-401'},
            { remindIn: '8:30 AM', type: 2, title: '𝗠𝗠𝗪', text: 'Starts at 9:00 AM', prof: 'Leona Lisa D. De Jesus', loc: 'Dynmc 1'},
            { remindIn: '12:30 PM', type: 2, title: '𝗔𝗣𝗣𝗟𝗜𝗘𝗗 𝗣𝗥𝗢𝗝𝗘𝗖𝗧 𝟭', text: 'Starts at 1:00 PM', prof: 'Daniel Ivonh M. Ingco', loc: 'HSSH-202'},
            { remindIn: '2:30 PM', type: 2, title: '𝗜𝗡𝗧𝗖𝗢𝗠𝗣', text: 'Starts at 3:00 PM', prof: 'Abigail T. Velasco', loc: 'ComLab 3'},
          ],
        },
      ]
      //Get info
      if (ready) {
        let currentSched = schedules.find(s => s.day === day)
        if (currentSched) {
          let sched = currentSched.tasks.find(t => t.remindIn == time)
          if (sched) {
            console.log(sched)
            ready = false
            let state = sched.type === 1 ? '🟢 Online' : sched.type === 2 ? '🟠 FTF' : 'Unknown'
            let message = '🔔 '+sched.title+'\n\n'+sched.text+'\n'+state+' at '+sched.loc+'\n'+sched.prof
            api.sendMessage(message,settings.channels.test)
          }
        }
        if (!ready) {
          setTimeout(function() {
            ready = true;
          },60000)
        }
      }
  
    },5000)
    
    //
    const interval2 = setInterval(async function() {
      if (count !== acc.logins) clearInterval(interval2);
      //Accept pending threads
      let threads = await api.getThreadList(10, null, ["PENDING"])
      //console.log('Pending threads: '+threads.length)
      if (threads.length > 0) {
        let stringThread  = ""
        for (let i = 0; i < threads.length; i++) {
          let thread = threads[i]
          let id = thread.threadID
          await api.handleMessageRequest(id, true)
          api.sendMessage(settings.acceptMessage,id)
          if (!thread.isGroup) {
            let user = thread.userInfo.find(u => u.id !== acc.id) 
            if (user) {
              stringThread += '👤 '+user.name+' - '+id+'\n\n'
              console.log('PM thread: '+user.name+' - '+id)
            }
          } else {
            stringThread += '👥 '+thread.name+' - '+id+'\n\n'
            console.log('GC thread: '+thread.name+' - '+id)
          }
        }
        api.sendMessage('Accepted '+threads.length+' threads.\n\n'+stringThread,settings.channels.test)
      }
    },600000) //
    //
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

let attendance = []
app.use(body_parser.json()).get('/chatbot', async (req,res) => {
  let text = req.query.text
  let user = {id: req.query.id}
  let type = req.query.type
  if (type !== 'chat' && type !== 'image') return res.status(404).send({status: 404, error: "Invalid query type"})
  if (!text || text.length === 0) return res.status(404).send({status: 404, error: "No message content was found"})
  if (!req.query.id) return res.status(404).send({status: 404, error: "Invalid ID"})
  let data = await AI.chatAI(text,type,user,settings.users[0])
  if (data.response.error) {
    return res.status(404).send({status: 404, error: data.response.error.message});
  } else {
    if (data.type === 'image') {
      let url = data.response.data[0].url
      return res.status(200).send({status: 200, body: url});
    } else {
      let msg = data.response.choices[0].message
      console.log(msg.content)
      let found = settings.AI.users.find(u => u.id === user.id)
      if (found) {
        found.messages.push(msg)
        if (data.response.usage.total_tokens >= settings.AI.maxTokens) found.messages = []
      }              
      let filtered = settings.AI.filter(msg.content,settings.users[0])
      let textContent = filtered.replace(/<\/?[^>]+(>|$)/g, '');
      let linkRegex = /https:\/\/(media\.discordapp\.net|cdn\.discordapp\.com)\/[^\s,)]+/g;
      let links = textContent.match(linkRegex);
      let args = await methods.getArgs(filtered)
      
      if (!links) return res.status(200).send({status: 200, body: filtered, attachments: null});
      let attachments = []
      for (let i in links) {
        let link = links[i]
        let found = args.find(a => a.includes(link))
        if (found) filtered = filtered.replace(found,'𝙎𝙚𝙚 𝘼𝙩𝙩𝙖𝙘𝙝𝙢𝙚𝙣𝙩')
        attachments.push(link)
      }
      res.status(200).send({status: 200, body: filtered, attachments: attachments})
    }
  }
  //.sendFile(__dirname+ '/hi.html');
})
app.use(cors())
app.post('/chatbot2', async (req,res) => {
  console.log('received',req.body)
  
   let text = req.body?.text
   let user = {id: req.body?.id}
   let type = req.body?.type
  if (type !== 'chat' && type !== 'image') return res.status(404).json({status: 404, error: "Invalid query type"})
  if (!text || text.length === 0) return res.status(404).send({status: 404, error: "No message content was found"})
  if (!req.body.id) return res.status(404).send({status: 404, error: "Invalid ID"})
  let data = await AI.chatAI(text,type,user,settings.users[0])
  if (data.response.error) {
    return res.status(404).send({status: 404, error: data.response.error.message});
  } else {
    if (data.type === 'image') {
      let url = data.response.data[0].url
      return res.status(200).send({status: 200, body: 'Generated Image', attachments: [url]});
    } else {
      let msg = data.response.choices[0].message
      console.log(msg.content)
      let found = settings.AI.users.find(u => u.id === user.id)
      if (found) {
        found.messages.push(msg)
        if (data.response.usage.total_tokens >= settings.AI.maxTokens) found.messages = []
      }              
      let filtered = settings.AI.filter(msg.content,settings.users[0])
      let textContent = filtered.replace(/<\/?[^>]+(>|$)/g, '');
      let linkRegex = /https:\/\/(media\.discordapp\.net|cdn\.discordapp\.com)\/[^\s,)]+/g;
      let links = textContent.match(linkRegex);
      let args = await methods.getArgs(filtered)
      
      if (!links) return res.status(200).send({status: 200, body: filtered, attachments: null});
      let attachments = []
      for (let i in links) {
        let link = links[i]
        let found = args.find(a => a.includes(link))
        if (found) filtered = filtered.replace(found,'𝙎𝙚𝙚 𝘼𝙩𝙩𝙖𝙘𝙝𝙢𝙚𝙣𝙩')
        attachments.push(link)
      }
      res.status(200).send({status: 200, body: filtered, attachments: attachments})
      
    }
  }
  //.sendFile(__dirname+ '/hi.html');
})
//END FB BOTTING
process.on('unhandledRejection', async error => {
  console.error(error);
});
