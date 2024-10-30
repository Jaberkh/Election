import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import * as fs from 'fs';
import { neynar } from 'frog/hubs';
import { v4 as uuidv4 } from 'uuid';

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

// تابع برای ذخیره رای‌ها در فایل JSON و چاپ درصدها در کنسول
function saveVotes(votes: Votes) {
  try {
    fs.writeFileSync(votesFilePath, JSON.stringify(votes, null, 2));
    const totalVotes = votes.harris + votes.trump;
    const harrisPercent = totalVotes ? Math.round((votes.harris / totalVotes) * 100) : 0;
    const trumpPercent = totalVotes ? Math.round((votes.trump / totalVotes) * 100) : 0;
    console.log(`Updated votes: Harris - ${votes.harris} (${harrisPercent}%), Trump - ${votes.trump} (${trumpPercent}%)`);
  } catch (error) {
    console.error("Error saving votes file:", error);
  }
}

// بارگذاری رای‌ها از فایل JSON
let votes: Votes = loadVotes();

// ایجاد URL برای نمایش کست آماده انتشار
function generateCastIntentUrl(candidate: string, frameUrl: string): string {
  const text = `I voted for ${candidate}\n\nFrame By @Jeyloo`;
  const encodedText = encodeURIComponent(text);
  const encodedFrameUrl = encodeURIComponent(frameUrl);
  return `https://warpcast.com/~/compose?text=${encodedText}&embed=${encodedFrameUrl}`;
}

app.use('/*', serveStatic({ root: './public' }));

app.frame('/', async (c) => {
  const { buttonValue } = c;

  // وضعیت برای تعیین نمایش صفحه‌های مختلف
  const hasSelected = buttonValue === 'select';
  const showThirdPage = buttonValue === 'harris' || buttonValue === 'trump';

  // آدرس تصویر بر اساس صفحه‌ی فعلی
  const imageUrl = showThirdPage 
    ? 'https://i.imgur.com/HZG1uOl.png'
    : hasSelected 
    ? 'https://i.imgur.com/be4kQO3.png'
    : 'https://i.imgur.com/bLVqRNb.png';

  // بررسی دکمه‌های رای‌گیری در صفحه دوم و هدایت به صفحه سوم
  if (buttonValue === 'harris') {
    votes.harris += 1;
    saveVotes(votes);
  } else if (buttonValue === 'trump') {
    votes.trump += 1;
    saveVotes(votes);
  }

  // محاسبه کل رای‌ها و درصدها برای نمایش بدون اعشار
  const totalVotes = votes.harris + votes.trump;
  const harrisPercent = totalVotes ? Math.round((votes.harris / totalVotes) * 100) : 0;
  const trumpPercent = totalVotes ? Math.round((votes.trump / totalVotes) * 100) : 0;

  const followUrl = "https://warpcast.com/~/profiles/jeyloo";
  const frameUrl = 'https://election-u-s.onrender.com';

  // بررسی مقدار دکمه برای ایجاد Intent URL کست
  let castIntentUrl = "";
  if (buttonValue === 'share') {
    const candidate = votes.harris > votes.trump ? 'Harris' : 'Trump';
    castIntentUrl = generateCastIntentUrl(candidate, frameUrl); // ساخت URL برای نمایش کست آماده
  }

  return c.res({
    image: (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: showThirdPage ? 'black' : 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <img
          src={imageUrl}
          alt={showThirdPage ? "Thank you for voting!" : ""}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
        {showThirdPage && (
          <div
            style={{
              position: 'absolute',
              bottom: '2%',
              color: 'white',
              fontSize: '110px',
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              lineHeight: 1.4,
              padding: '0 20px',
              whiteSpace: 'pre-wrap',
              display: 'flex',
              gap: '325px',
            }}
          >
            <span>{`${trumpPercent}`}</span>
            <span>{`${harrisPercent}`}</span>
          </div>
        )}
      </div>
    ),
    intents: showThirdPage
      ? [
          <Button action={castIntentUrl}>Share Cast</Button>, // دکمه برای نمایش کست آماده انتشار
          <Button action={followUrl}>Follow Me</Button>
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

// راه‌اندازی سرور
const port = 3000;
console.log(`Server is running on port ${port}`);

// اضافه کردن devtools برای دیباگینگ
devtools(app, { serveStatic });

serve({ fetch: app.fetch, port });
