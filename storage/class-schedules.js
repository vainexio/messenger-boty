
const cron = require('node-cron');
const moment = require('moment-timezone');

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
  { day: 'Sunday', subject: 'Joyoy', section: 'BSIT231C', start: '22:01', end: '15:00', professor: 'Nichole QOmpan' },
];

classSchedule.forEach(entry => { entry.mode = ['Monday', 'Tuesday'].includes(entry.day) ? 'online' : 'face-to-face' });
const daysMap = { Sunday: '0', Monday: '1', Tuesday: '2', Wednesday: '3', Thursday: '4', Friday: '5', Saturday: '6' };

module.exports = {
  scheduleNotifications: function(api) {
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
  },
  backfillReminders: function(api) {
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
}
