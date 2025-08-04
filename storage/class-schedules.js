const fetch = require('node-fetch');

module.exports = {
  getRandom: function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
},
  getTime: function() {
    let date = new Date().toLocaleString("en-US", { timeZone: 'Asia/Shanghai' });
    let today = new Date(date);
    let hour = (today.getHours() % 12) || 12;
    let dayCount = today.getDay();
    let days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    let day = days[dayCount]
    let state = today.getHours() >= 12 ? 'PM' : 'AM'
    let time = hour+":"+today.getMinutes()+' '+state;
    let data = {
      day: day,
      hour: hour,
      minute: today.getMinutes(),
      state: state,
      time: time,
    }
    return data;
  },
  getTime2: function(stamp) {
    return Math.floor(new Date(Number(stamp)).getTime()/1000.0);
  },
  sleep: async function (miliseconds) {
    return new Promise(resolve => setTimeout(resolve, miliseconds));
  },
}
