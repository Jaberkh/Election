import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import * as fs from 'fs';
import axios from 'axios';
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

// تابع تأیید با API Neynar
async function verifyNeynarAPI() {
  try {
    const response = await axios.get('https://hub-api.neynar.com/v1/info', {
      headers: {
        'Content-Type': 'application/json',
        'api_key': 'ACAFFB87-E4FF-4940-9237-FB3D1FAEDF2D'
      },
    });
    console.log('Verification successful:', response.data);
    return true;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

// تابع برای ارسال کست
async function postCast(candidate: string) {
  const uniqueIdem = uuidv4(); // تولید شناسه منحصربه‌فرد برای هر درخواست

  const text = `I voted for ${candidate}\n\nFrame By @Jeyloo`; // متن جدید کست
  const frameUrl = 'https://election-u-s.onrender.com'; // آدرس فریم

  try {
    const response = await axios.post(
      'https://api.neynar.com/v2/farcaster/cast',
      {
        signer_uuid: '98f1172f-0a59-4401-98d2-a044f54c51ab',
        text: text,
        channel_id: 'farcaster',
        idem: uniqueIdem,
        embeds: [
          {
            type: 'image',
            url: frameUrl, // اضافه کردن فریم به عنوان ضمیمه
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          api_key: 'ACAFFB87-E4FF-4940-9237-FB3D1FAEDF2D',
        },
      }
    );
    console.log('Cast posted successfully with frame:', response.data);
  } catch (error) {
    console.error('Error posting cast with frame:', error);
  }
}

// بارگذاری رای‌ها از فایل JSON
let votes: Votes = loadVotes();

// تأیید
verifyNeynarAPI().then((verified) => {
  if (verified) {
    console.log('Frog Frame is verified and ready to use.');
  } else {
    console.log('Frog Frame verification failed.');
  }
});

app.use('/*', serveStatic({ root: './public' }));

app.frame('/', async (c) => {
  const { buttonValue } = c;

  // بررسی وضعیت تأیید
  const isVerified = await verifyNeynarAPI();
  if (!isVerified) {
    console.log('Frame verification failed');
    return c.res({
      image: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          color: 'white',
          fontSize: '24px',
        }}>
          Verification failed. Please try again later.
        </div>
      ),
    });
  }

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

  // بررسی مقدار دکمه برای ارسال کست
  if (buttonValue === 'share') {
    const candidate = votes.harris > votes.trump ? 'Harris' : 'Trump';
    await postCast(candidate);
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
          <Button value="share">Share Cast</Button>,
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
