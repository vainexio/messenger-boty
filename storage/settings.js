const { getTime } = require('../storage/wrap.js')

let channels = {
  test: '6092122660821476',
  bois: '3700562556620542',
  group4: '6786445438078486',
}
module.exports = {
  //
  settings: {
    firstTime: [], //9677784418962608
    birthdays: [],
    acceptMessage: 'Thread accepted. You can now interact with me 💖\n\n[ 𝐓𝐇𝐈𝐍𝐆𝐒 𝐘𝐎𝐔 𝐂𝐀𝐍 𝐃𝐎 ]\n\n❓Converse with me just like how u would talk to an AI.\n❓Ask questions about NU Laguna or NU in general.\n❓Talk to other users anonymously by typing /userphone in our PM or GC.\n❓Play games! I am capable of playing logical games throughout our conversation, such as: Rock-Paper-Scissors, Tic-Tac-Toe, Guess Who, Hangman, Word Ladder and more!\n❓Set reminders! You can instruct me to notify you on a given duration by typing /remind.\n\n📑 [ 𝐑𝐔𝐋𝐄𝐒 ]\n— Failure to follow the rules will result in a non-appealable block.\n1. Do not spam your messages.\n2. Avoid harassing the other party in /userphone.\n3. Avoid using profanity and use common sense.\n\n— You can start the conversation by simply saying, hi!\n— or type "𝘴𝘩𝘰𝘸 𝘮𝘦 𝘢 𝘱𝘪𝘤𝘵𝘶𝘳𝘦 𝘰𝘧 𝘵𝘩𝘦 𝘤𝘢𝘯𝘵𝘦𝘦𝘯" for starters.',
    stickers: {
      registered: [],
      randoms: [
        '641023022579976',
        '641022915913320',
        '641023092579969',
        '641022995913312',
        '641022929246652',
        '641023182579960',
        '641023209246624',
        '641023219246623',
        '641023242579954',
        '641023259246619',
        "392309834199662",
        "392309834199662",
        "392309957532983",
        "392309990866313",
        "392310037532975",
        "392309727533006",
        "392309637533015",
        "392309754199670",
        "392309760866336",
        "392309784199667",
        "392309790866333",
        "392309800866332",
        "392309827532996",
        "392309844199661",
        "126362100881920",
        "126361974215266",
        "126362187548578",
        "126362137548583",
        "126361874215276",
        "126361920881938",
        "126362064215257",
        "126361967548600",
        "1598371140426188",
        "445625775636614",
        "445625352303323",
        "445624712303387",
        "1402232810073796",
        "1402232776740466",
        "144885315685735",
        "144885035685763",
        "144884805685786",
        "144884925685774",
        "144884815685785",
        "144885112352422",
        "144885089019091",
        "144885145685752",
        "144884825685784",
        "1435020460122244",
        "1435019323455691",
        "1435020103455613",
        "1435020383455585",
        "1435021390122151",
        "1435020546788902",
      ],
      hatch: {
        happy: '641023022579976',
        smile: '641022915913320',
        bleh: '641023092579969',
        bleh2: '641022995913312',
        gum: '641022929246652',
        hungry: '641023182579960',
        sob: '641023209246624',
        cry: '641023219246623',
        bruh: '641023242579954',
        sad: '641023259246619',
      }
    },
    presave: [
      { run: true, trigger: ['kiss'], response: ["If you gave me a chance, I would take it"]},
      //{ run: true, trigger: ['prof','dean'], response: ["ikaw",'aso ko','di q alam','ha']}
    ],
    developers: [
      '100050989909561', //nex
      '100011020382512', //ian
      '6786445438078486', //group 4 gc
    ],
    channels: channels,
    prefix: '/',
    cache: {
      users: [],
      threads: [],
    },
    messages: [],
    //
    commands: [
      { name: 'accept.threads' },
      { name: 'threads' },
      { name: 'test' },
      { name: 'remind' },
      { name: 'userphone' },
      { name: 'disconnect' },
      { name: 'add' },
      { name: 'reset' },
      { name: 'addall' },
    ],
    users: [
      {
        name: 'NUVIA',
        file: 'nutatanongmo',
        id: '100065140674032', //61550515301866
        logins: 0,
        enabled: true,
        chatbot: true,
        unsentLogger: {
          enabled: true,
          sendToThread: false,
        },
        userphones: [],
      },
      {
        name: 'ian',
        file: 'ian',
        id: '0',
        logins: 0,
        enabled: false,
        chatbot: true,
        unsentLogger: {
          enabled: true,
          sendToThread: true,
        }
      },
    ],
    //AI
    AI: {
      maxTokens: 4000,//,
      maintenance: {
        enabled: false,
        day: 'Thursday',
        until: 12,
        state: 'AM',
        desc: 'aaaaa',
      },
      modelCount: 0,
      users: [],
      filter: function(string,acc) {
        string = string.replace(/As an AI language model, /g,'')
          .replace(/ As an AI language model, /g,'')
          .replace(/As the language model AI, /g,'')
          .replace(/an AI language model/g,acc.name)
          .replace('/laguna/campus-life/','/nu-laguna/')
          .replace('/laguna/','/nu-laguna/')
        
        string = string.replace(/ChatGPT/g,acc.name)
        return string;
      },
    chatAPI: 'https://api.openai.com/v1/chat/completions',
    imageAPI: 'https://api.openai.com/v1/images/generations',
    models: [
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-0613',
      'gpt-3.5-turbo-16k-0613',
    ]//  
  },
  }
  //
}
