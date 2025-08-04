/*
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Configuration, OpenAIApi } = require('openai');

const OPENAI_API_KEY = process.env['AI_1'];
const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);
const { settings } = require('../storage/settings.js');

const seenPosts = new Set();

module.exports = {
  checkFacebookPageScrape: async function (api) {
    try {
      // fetch the mbasic page HTML
      const res = await fetch(`https://facebook.com/NULagunaPH`);
      const html = await res.text();
      const $ = cheerio.load(html);

      // find all story links
      const anchors = $('a').filter((i, el) => {
        const href = $(el).attr('href') || '';
        return href.includes('/story.php?story_fbid=');
      });

      // process newest-first
      for (let i = anchors.length - 1; i >= 0; i--) {
        const el = anchors[i];
        const href = $(el).attr('href');
        const match = href.match(/story_fbid=(\d+)/);
        if (!match) continue;

        const postId = match[1];
        if (seenPosts.has(postId)) continue;
        seenPosts.add(postId);

        // extract the text of the post
        const message = $(el).parent().text().trim();
        if (!message) continue;

        // classify via GPT-3.5-turbo
        const prompt = `
You are a simple filter.
Decide if the following Facebook post is a CRITICAL announcement
(e.g. “no classes”, special events, warnings)
or a NORMAL notice.

Post:
"""${message}"""

Answer with exactly one word, CRITICAL or NORMAL.
`;
        const completion = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0
        });
        const tag = completion.data.choices[0].message.content.trim().toUpperCase();

        // choose destination thread
        const target = (tag === 'CRITICAL')
          ? settings.channels.log
          : settings.channels.test;

        // build and send
        const postUrl = `https://facebook.com/${postId}`;
        const out = `📣 New FB post (${postId}) – ${tag}\n\n${message}\n\n🔗 ${postUrl}`;
        await api.sendMessage(out, target);
      }

    } catch (err) {
      console.error('FB Scrape Error:', err);
    }
  }
}
*/
