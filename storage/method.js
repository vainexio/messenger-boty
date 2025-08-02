const { settings } = require('../storage/settings.js')
const { getRandom, getTime, getTime2, sleep, send } = require('../storage/wrap.js')
const https = require("https");

module.exports = {
  methods: {
    getArgs: function (content) {
      let args = content.trim().split(/\n| /);
      return args
    },
    //
    getCommand: function (content) {
      let args = content.trim().split(/\n| /);
      let cmd = args[0].toLowerCase(); //message.content.toLowerCase();
      let foundCmd = settings.commands.find(c => settings.prefix+c.name === cmd)
      if (foundCmd) {
        let params = content.replace(args[0],'').trim().split(/\n| /);
        let command = {
          cmd: settings.prefix+foundCmd.name,
          name: foundCmd.name,
          args: params,
        }
        return command;
      }
    },
    //
    getMessage: async function (api, event) {
      //Get files
      let files = []
      let rawFiles = []
      //Get attachments
      if (event.attachments.length > 0) {
        for (let i in event.attachments) {
          let file = event.attachments[i]
          files.push({id: file.ID, url: file.url})
          rawFiles.push(file.url)
        }
      }
      //Get info
      let user = settings.cache.users.find(u => u.id === event.senderID)
      if (!user) {
        user = await api.getUserInfo(event.senderID)
        user[event.senderID].id = event.senderID
        settings.cache.users.push(user[event.senderID])
      }
      let thread = settings.cache.threads.find(t => t.id === event.threadID)
      if (!thread) {
        thread = await api.getThreadInfo(event.threadID)
        settings.cache.threads.push(thread)
      }
      !user.name ? user = user[event.senderID] : null
      //console.log(user)
      //Save message info
      let message = {
        content: event.body,
        id: event.messageID,
        author: {
          id: event.senderID,
          name: user.name,
          gender: user.gender, //MALE, FEMALE
          bday: user.isBirthday,
          type: user.type, //user
          isBirthday: user.isBirthday,
          avatar: user.profileUrl,
        },
        channel: {
          id: thread.threadID,
          name: thread.threadName,
          participants: thread.participantIDs,
          type: thread.isGroup ? 'GC' : 'PM',
        },
        attachments: files,
      }
      let foundExisting = settings.messages.find(m => m.id === event.messageID)
      if (foundExisting) return console.log('return',foundExisting);
      settings.messages.push(message)
      return message;
    },
    //
    isJSON: function (str) {
      try {
        JSON.parse(str);
        return true;
      } catch (error) {
        return false;
      }
    }
}
}
