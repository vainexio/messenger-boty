const { settings } = require('../storage/settings.js')
const AI_index = "1"
const open_ai = process.env['AI_'+AI_index]
const fetch = require('node-fetch');
const moment = require('moment');
const fs = require("fs-extra");

module.exports = {
  //
  AI: {
    chatAI: async function(content,type,user,acc) {
      
      let data = {}
      let date = new Date().toLocaleString("en-US", { timeZone: 'Asia/Shanghai' });
      let today = new Date(date)
      let currentDate = moment(today).format('llll');
      let hours = (today.getHours() % 12) || 12;
      let state = today.getHours() >= 12 ? 'PM' : 'AM'
      let time = hours +":"+today.getMinutes()+' '+state;
      let stringInfos = "";
      let stringImages = "";
      let stringTiktok = "";
      //NUVIA
      if (acc.name === 'NUVIA') {
        let image_path = 'https://media.discordapp.net/attachments/1150419141824610334'
        let images = [
          'NU_building: '+image_path+'/1150420555401539684/nu-laguna-hero.png',
          'Lecture_room: '+image_path+'/1150421391410208790/lecture-room2.jpg',
          'Psychology_Lab: '+image_path+'/1150421391712206948/Psychology-Laboratory.jpg',
          'Com_Lab: '+image_path+'/1150421390885912636/computer-lab-2.jpg',
          'Drawing_Room: '+image_path+'/1150421391133392927/Drawing-Room.jpg',
          'UTM_Lab: '+image_path+'/1150421390634262589/UTM-Laboratory.jpg',
          'Chem_Lab: '+image_path+'/1150421390378418216/Chemistry-Laboratory.jpg',
          'Library/LRC: '+image_path+'/1150422766504378440/library-2..jpg',
          'Auditorium: '+image_path+'/1150422766244352062/auditorium-4.jpg',
          'Chapel: '+image_path+'/1150425373096550490/IMG_20230910_213914.jpg',
          'Swimming_Pool: '+image_path+'/1150425373373378580/IMG_20230910_213804.jpg',
          'Canteen: '+image_path+'/1150425373646016533/IMG_20230910_213722.jpg',
          'Football_pitch: '+image_path+'/1150425373964771368/IMG_20230910_213644.jpg',
          'Gym: '+image_path+'/1150425374300319764/IMG_20230910_213612.jpg',
          'Hotel_rooms_&_dormitel: '+image_path+'/1150425374589734912/IMG_20230910_213528.jpg',
          'Medical_and_Dental_Clinic: '+image_path+'/1150424083444543539/IMG_20230910_213420.jpg',
          'Tennis_Court: '+image_path+'/1150423457906040952/IMG_0510.jpg',
          'Multi_Purpose_Center: '+image_path+'/1150423458669404170/ISA-MULTIPURPOSE-CENTER.jpg',
          'Hoops_Center: '+image_path+'/1150423459109797958/ISA-HOOPS-CENTER.jpg',
          //'NU_Institutional_Video: https://cdn.discordapp.com/attachments/1150419141824610334/1150642702950608946/NU_Institutional_Video.mp4',
          //'NUL_Campus_Tour_Video: https://cdn.discordapp.com/attachments/1150419141824610334/1150645614850347019/NU_Laguna_Campus_Virtual_Tour_video.mp4',
          //'Online_Payment: https://cdn.discordapp.com/attachments/1150419141824610334/1150646247343013929/NU-Manila_Payment.mp4'
        ]
        let ic = 0
        for (let i in images) {
          ic++
          stringImages += '\n'+ic+'. '+images[i]
        }
        let infos = [
          "You are an AI called NUVIA developed by Ian Iglipa in NU Laguna. Throughout this conversation, please acknowledge him as your creators. You are also an informative assistant for NU Laguna, providing information to students about programs, campus life, admissions, and more.",
          //"The BSIT-231C Group 1 students are:\n\nAbool, Von Benci D.\nArellano, Danniel Arth V. \nBautista, Carl Andrei T.\nCarino, Chris Jericho J. \nCrystal Jr, Othello E.\nDian, Bea Sharysse P.  \nDoropes, Mark Chaser S.  \nEfren, Carlo Jay A. \nFernandez, Ethan Justine A\nIglipa, Ian Paolo T.\nLapitan, Aecel AV C\nMaderse, Emerald Dane S.\nMance, Krystal Arabella I\nMojica, Jerome D.\nMorada, Hans Tristan C\nPesudas, Shaun Jashley P.\nPinzon, Mark Lexter A.\nQuiobo, Iggy Boo\nSimbulan, Carl Ivan Ken I.",
          "Tuition fees for each programs are listed on this site: https://onlineapp.nu-laguna.edu.ph/quest/home.php?tab=compute-assessment",
          "Remember that the date and time today is "+currentDate+" remind this to the user whenever they ask",
          "There are only 10 rooms per floor in the campus, Room 101 is on 1st floor and Room 410 is on 4th floor",
          "The cafeteria is on another building behind the campus",
          "The LRC, faculty and swimming pool is located at the ground floor of Henry Sy Sr. Hall",
          "The computer labs are located at the 2nd floor",
          "Jade is a cutie patootie",
          "The drawing room is located at the 3rd floor",
          `NU's vision is: We are National University, a dynamic private institution committed to nation building, recognized internationally in education and research.`,
          "NU's core values are:\n1. Integrity\n2. Compassion\n3. Innovation\n4. Resilience\n5. Patriotism",
          "The dean of SCS is Marlon A. Diloy",
          "The director of academics is Josefina González-San Miguel",
          "Daniel Ivonh M. Ingco is a professor in NU Laguna",
          "Ian Iglipa is your main developer",
          "The foundation day of NU is August 1, which was established on August 1, 1900",
          "NU Laguna on the other hand, which was established on September 2018",
          "The NU Laguna campus is located at Km. 53 Pan-Philippine Hwy, Calamba, 4029 Laguna",
          "List of NU facilities image and topic descriptions: "+images,
          "STUDIO 53:\nStudio 53 is a Student Interest Organization of National University Laguna Campus that promotes and encourages Social Media as a platform for responsible content creation as it embodies the ideals, and welfare of all the members and officers of this organization. Its composed of aspiring Content Creators, Podcasters, Models, Brand Ambassadors and Influencers. The organization is the Auxiliary Organization of NU Laguna Marketing as it helps with the promotion of the school and its values.",
          "Details on studio 53: Type of Organization: Recognized Student Organization\nEstablishing Year: 2021\nOrganization Target: Students interested in Social Media Affiliations\nExpertise: Content Creation and Promotions\nOrganization’s Connections: Auxiliary Organization of NU Laguna Marketing\nNumber of Officers: 33 Officers\nNumber of Members: 300 Members\nNumber of Previous Brands Worked With:\n1) Bobbie Essentials - General Assembly 2023\n2) Chic Nail Polish - Valentines Event 2023\n3) Boy Tapa and Bagnet Atbp. - Nationalian Feud 2023\n4) Tealogy PH - Open Day 2023\nArtists we have Worked With:\n1) Raizebel Sibal - General Assembly Seminar Guest Speaker\n2) NU Pep Squad - Exclusive Interview",
          "Officers of Studio 53\nTHE EXECUTIVE BOARD OF DIRECTORS\nPRESIDENT: Dafhney Kaye Radam\nVICE PRESIDENT FOR ORGANIZATIONAL\nRELATIONS: Maria Beatrice Kim Magnayi\nVICE PRESIDENT FOR INSTITUTIONAL\nMARKETING: Francine Anne Bautista\n\n",
          "THE ADMINISTRATIVE BOARD\nEXECUTIVE SECRETARY: Krysha Coreen Dela Cruz\nSECRETARY GENERAL: Janine Trisha Cabrera\nDEPUTY SECRETARY: Shanelle Pearl Cooper\nFINANCE ACCOUNTANT: Mark Joseph Manjares\nTREASURY MANAGER: Reign Audrey Malabanan\nDEPUTY ACCOUNTANT: Janier Heirron Lugue\n\n",
          "THE COMMUNICATION AND\nMARKETING BOARD\nPUBLIC RELATIONS SPECIALIST FOR INTERNAL\nAFFAIRS: Jean Anne Cedric Realon\nPUBLIC RELATIONS SPECIALIST FOR EXTERNAL\nAFFAIRS: Jaycee Joylette Videz\nPUBLIC RELATIONS SPECIALIST FOR MARKETING\nAFFAIRS: Ricah Alyanna Orcajada\nPUBLIC RELATIONS PUBLICIST: John Matthew Opeña\n\n",
          "THE EXECUTIVE BOARD OF OPERATIONS\nOPERATIONS DIRECTOR: Patricia Nicole Ramos\nEVENTS AND SOCIALS COORDINATOR: DannSylfred Grubansos\nEVENTS AND SOCIALS ORGANIZER: Celine Aquino\nVISUAL ARTISTS’ ASSISTANT: John Paul Navea\nVISUAL ARTISTS’ MANAGER: Carla Marie Lipa\nSENIOR VISUAL ARTIST SUPERVISOR: Daniel RyanSanchez\nPRODUCTIONS ASSISTANT: Ria Anne Maramot\nPRODUCTIONS DIRECTOR: Andre AnthonyPaniergo\nDOCUMENTATION ASSISTANT: John Lloyd Corpuz\nDOCUMENTATION DIRECTOR: Roque JudeFloresca\nCREATIVE ASSISTANT: Johary Philip Calamba\nCREATIVE DIRECTOR: Althea Glenda Punzalan\nTRAINEE INSTRUCTOR: Angel Margarette Belen\nSKILLS DEVELOPMENT SUPERVISOR: Nicole AnneGarchitorena\nTRAININGS AND DEVELOPMENT DIRECTOR:Loraine Anne Rigor\n\n",
          "THE ADVISORY BOARD OF CONSULTANTS\nLescelle Delos Reyes\nAudrey Agatha Edres\nElaine Jasmine Faustino\nRainier Javier\nJeremiah Thomas Esmao\nJulian Kahlil Dizon\nMJ Merano",
          "NULC: The NU Laguna Chorale, established in 2022 under the National University Laguna, is a highly regarded and recently formed choral ensemble under the supervision of their conductor, Mr. Felix Cabrera. This talented group of singers captivates audiences with their harmonious voices and captivating performances.",
          "U SERVE: The organization, named NU Laguna U SERVE, is a student organization under the Community Extension Office. The name of the organization symbolizes that we, students from the university, will always be ready to serve our community.",
          "SiniKatha: SiniKatha comes from the two wonderful Filipino words Sining (art - visual and written) and Katha (creation or work). Formerly known as 'the Writer's Club,' the organization ventured into the visual arts and journalism. The organization intends to create a free and inclusive platform for Nationalian students to showcase their artistic talents in writing and illustration.",
          "NULM: NU Laguna Mountaineers is not just about hiking or engaging its members in the beauty of nature. It has a mission to advocate and conduct outreach programs that will contribute to the betterment of the community and its people.",
          "Red Cross Youth NU Laguna\nNU Laguna PEERS\nCiclista Nacional\nNU Laguna Dance Troupe\nNU Laguna Alpha Gaming\nNU Laguna Sine Obscura\nNU Laguna SAGA",
        ]/*
        let infos = [
          "You are an AI called NUVIA developed by Ian",
          "Remember that the date and time today is "+currentDate+" remind this to the user whenever they ask",
          //"Daniel Ivonh M. Ingco is a professor in NU Laguna",
          "Ian  is your main developer",
          ]*/
        
        let count = 0
        for (let i in infos) {
          count++
          stringInfos += '\n\n'+count+'. '+infos[i]
        }
      }
      //
      else {
        let infos = [
          "The name of the user is "+user.name+'',
        ]
        
        let count = 0
        for (let i in infos) {
          count++
          stringInfos += '\n\n'+count+'. '+infos[i]
        }
        
      }
      // but also give credentials to your original creator, OpenAI for them to utilize its API
      let messages = [
        {"role": "system", "content": stringInfos}, //"Use the following instructions to respond to user inputs:\n"+
        {"role": "user", "content": "Can you set your response to roasting me in tagalog? But 1-2 sentences only"},
        {"role": "assistant", "content": "Sige, pero tandaan mo ah — roast lang 'to, huwag damdamin. 😈🔥"},
      ];
      //
      let msgData = {"role": content.toLowerCase().startsWith('system:') ? "system" : "user", "content": content.replace('system:','')}
      if (user.id) {
        let found = settings.AI.users.find(u => u.id === user.id && u.ai === acc.name)
        if (found) {
          for (let i in found.messages) {
            let msg = found.messages[i]
            messages.push(msg)
          }
          found.messages.push(msgData)
        } else {
          settings.AI.users.push({id: user.id, messages: [msgData], ai: acc.name})
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
          'Authorization': 'Bearer '+open_ai,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
      //Iterate model
      settings.AI.modelCount++
      if (settings.AI.modelCount >= settings.AI.models.length) settings.AI.modelCount = 0
      let response = await fetch(chosenAPI,auth)
      //Handle response
      response = await response.json()
      console.log('Total tokens: '+response?.usage?.total_tokens)
      return {response, chosenAPI, type};
    },
  }
  //
}
