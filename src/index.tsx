import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import * as fs from 'fs';
import { neynar } from 'frog/hubs';

export const app = new Frog({
  title: 'Voting Frame',
  imageAspectRatio: '1:1',
  hub: neynar({ apiKey: '8CC4FE87-3950-4481-BAD2-20475D7F7B68' }),
  verify: 'silent',
});

// تعریف نوع Votes
type Votes = {
  harris: number;
  trump: number;
};

// مسیر فایل JSON برای ذخیره رای‌ها
const votesFilePath = './votes.json';

// تابع برای خواندن رای‌ها از فایل JSON
function loadVotes(): Votes {
  try {
    const data = fs.readFileSync(votesFilePath, 'utf-8');
    return JSON.parse(data) as Votes;
  } catch (error) {
    console.error("Error reading votes file:", error);
    return { harris: 0, trump: 0 };
  }
}

// تابع برای ذخیره رای‌ها در فایل JSON
function saveVotes(votes: Votes) {
  try {
    fs.writeFileSync(votesFilePath, JSON.stringify(votes, null, 2));
  } catch (error) {
    console.error("Error saving votes file:", error);
  }
}

// بارگذاری رای‌ها از فایل
let votes: Votes = loadVotes();

app.use('/*', serveStatic({ root: './public' }));

// افزودن متا تگ‌ها در صفحه اصلی (روت)
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Voting Frame by Jeyloo</title>

      <!-- Open Graph Meta Tags -->
      <meta property="og:title" content="Voting Frame by Jeyloo" />
      <meta property="og:description" content="I voted, what's your opinion? Vote and share your thoughts!" />
      <meta property="og:image" content="https://i.imgur.com/HZG1uOl.png" />
      <meta property="og:url" content="https://election-u-s.onrender.com" />
      <meta property="og:type" content="website" />

      <!-- Optional Twitter Card Meta Tags -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="Voting Frame by Jeyloo">
      <meta name="twitter:description" content="I voted, what's your opinion? Vote and share your thoughts!">
      <meta name="twitter:image" content="https://i.imgur.com/HZG1uOl.png">

    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="main.js"></script>
    </body>
    </html>
  `);
});

app.frame('/', (c) => {
  const { frameData, buttonValue } = c;

  const hasSelected = buttonValue === 'select';
  const showThirdPage = buttonValue === 'harris' || buttonValue === 'trump';

  const imageUrl = showThirdPage 
    ? 'https://i.imgur.com/HZG1uOl.png'
    : hasSelected 
    ? 'https://i.imgur.com/be4kQO3.png'
    : 'https://i.imgur.com/bLVqRNb.png';

  let selectedCandidate = '';

  if (buttonValue === 'harris') {
    votes.harris += 1;
    selectedCandidate = 'Harris';
    saveVotes(votes);
  } else if (buttonValue === 'trump') {
    votes.trump += 1;
    selectedCandidate = 'Trump';
    saveVotes(votes);
  }

  const totalVotes = votes.harris + votes.trump;
  const harrisPercent = totalVotes ? Math.round((votes.harris / totalVotes) * 100) : 0;
  const trumpPercent = totalVotes ? Math.round((votes.trump / totalVotes) * 100) : 0;

  const composeCastUrl = `https://warpcast.com/~/compose?text=I%20voted%20for%20${encodeURIComponent(
    selectedCandidate
  )},%20what’s%20your%20opinion?%0A%0AFrame%20By%20@Jeyloo%0A https://election-u-s.onrender.com`;

 return c.res({
  image: imageUrl,  // ارسال URL تصویر مستقیماً به عنوان مقدار image
  intents: showThirdPage
    ? [
        <Button.Link href={composeCastUrl}>Share</Button.Link>
      ]
    : hasSelected
    ? [
        <Button value="harris">Harris</Button>,
        <Button value="trump">Trump</Button>,
      ]
    : [
        <Button value="select">Vote</Button>,
      ],
});

});

const port = 3000;
console.log(`Server is running on port ${port}`);

// اضافه کردن devtools برای دیباگینگ
devtools(app, { serveStatic });

serve({ fetch: app.fetch, port });
