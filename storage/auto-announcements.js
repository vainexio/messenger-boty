// facebook-scraper.js
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { settings } = require('../storage/settings.js');

// keep track of which posts we’ve already sent
const seenPosts = new Set();

// helper: call OpenAI’s REST API directly
async function classifyPost(message) {
  const apiKey = process.env['AI_1'];   // make sure this is set
  if (!apiKey) throw new Error('OPENAI_API_KEY not defined');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      temperature: 0,
      messages: [{
        role: 'user',
        content: `
You are a simple filter.
Decide if the following Facebook post is a CRITICAL announcement
(e.g. “no classes”, special events, warnings)
or a NORMAL notice.

Post:
"""${message}"""

Answer with exactly one word, CRITICAL or NORMAL.
`
      }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const { choices } = await res.json();
  return choices[0].message.content.trim().toUpperCase();
}

async function checkFacebookPageScrape(api) {
  try {
    // 1) fetch the public mbasic page HTML
    const pageRes = await fetch(`https://www.facebook.com/NULagunaPH`, { //https://mbasic.facebook.com/${settings.facebookPage.name}
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await pageRes.text();

    // detect login gate
    if (html.includes('id="login_form"')) {
      console.warn('FB is asking to log in—skipping this cycle.');
      return;
    }

    // 2) parse post links
    const $ = cheerio.load(html);
    const anchors = $('a').filter((i, el) => {
      const href = $(el).attr('href') || '';
      return href.includes('/story.php?story_fbid=');
    });

    // 3) process oldest→newest
    for (let i = anchors.length - 1; i >= 0; i--) {
      const el = anchors[i];
      const href = $(el).attr('href');
      const match = href.match(/story_fbid=(\d+)/);
      if (!match) continue;

      const postId = match[1];
      if (seenPosts.has(postId)) continue;   // already handled
      seenPosts.add(postId);

      // extract text
      const message = $(el).parent().text().trim();
      if (!message) continue;

      // 4) classify
      let tag = 'NORMAL';
      try {
        tag = await classifyPost(message);
      } catch (err) {
        console.error('Classification error:', err);
      }

      // 5) choose destination
      const target = (tag === 'CRITICAL')
        ? settings.channels.log
        : settings.channels.test;

      // 6) send
      const postUrl = `https://facebook.com/${postId}`;
      const out = `📣 New FB post (${postId}) – ${tag}\n\n${message}\n\n🔗 ${postUrl}`;
      await api.sendMessage(out, target);
    }

  } catch (err) {
    console.error('FB Scrape Error:', err);
  }
}

module.exports = { checkFacebookPageScrape };
