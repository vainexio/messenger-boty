const { settings } = require('../storage/settings.js')
const AI_index = "1"
const open_ai = process.env['AI_' + AI_index]
const fetch = require('node-fetch');
const moment = require('moment');
const fs = require("fs-extra");

module.exports = {
    //
    AI: {
        chatAI: async function (content, type, user, acc) {
            console.log(user)
            let data = {}
            let date = new Date().toLocaleString("en-US", { timeZone: 'Asia/Shanghai' });
            let today = new Date(date)
            let currentDate = moment(today).format('llll');
            let hours = (today.getHours() % 12) || 12;
            let state = today.getHours() >= 12 ? 'PM' : 'AM'
            let time = hours + ":" + today.getMinutes() + ' ' + state;
            let stringInfos = "";
            //
            let infos = [
                "If the user asks for the date or time, respond with: \"" + currentDate + "\".",
            ]

            let count = 0
            for (let i in infos) {
                count++
                stringInfos += '\n\n' + count + '. ' + infos[i]
            }
            let messages = [ { "role": "system", "content": stringInfos }, ];
            let msgData = { "role": content.toLowerCase().startsWith('system:') ? "system" : "user", "content": content.replace('system:', '') }
            
            if (user.id) {
                let found = settings.AI.users.find(u => u.id === user.id && u.ai === acc.name)
                if (found) {
                    for (let i in found.messages) {
                        let msg = found.messages[i]
                        messages.push(msg)
                    }
                    found.messages.push(msgData)
                } else {
                    settings.AI.users.push({ id: user.id, messages: [msgData], ai: acc.name })
                }
            }

            messages.push(msgData)
            let chosenAPI = null
            //Image generation
            if (type === 'image') {
                chosenAPI = settings.AI.imageAPI
                data = {
                    "prompt": content,
                    "n": 1,
                    "size": "1024x1024"
                }
            }
            //Chat completion
            else {
                chosenAPI = settings.AI.chatAPI
                data = {
                    "model": settings.AI.models[settings.AI.modelCount],
                    "messages": messages,
                }
            }
            //Post to API
            let auth = {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + open_ai,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }
            //Iterate model
            settings.AI.modelCount++
            if (settings.AI.modelCount >= settings.AI.models.length) settings.AI.modelCount = 0
            let response = await fetch(chosenAPI, auth)
            //Handle response
            response = await response.json()
            console.log('Total tokens: ' + response?.usage?.total_tokens)
            return { response, chosenAPI, type };
        },
    }
    //
}
