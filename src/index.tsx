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
const votedFidsFilePath = './votedFids.json'; // فایل برای ذخیره fid کاربرانی که رای داده‌اند

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

// تابع برای بارگذاری فهرست fid‌های رای‌داده‌شده
function loadVotedFids(): Set<number> {
  try {
    if (!fs.existsSync(votedFidsFilePath)) {
      // اگر فایل وجود ندارد، یک فایل خالی ایجاد می‌کنیم
      fs.writeFileSync(votedFidsFilePath, JSON.stringify([]));
    }
    const data = fs.readFileSync(votedFidsFilePath, 'utf-8');
    return new Set(JSON.parse(data));
  } catch (error) {
    console.error("Error reading votedFids file:", error);
    return new Set();
  }
}

// تابع برای ذخیره فهرست fid‌های رای‌داده‌شده
function saveVotedFids(votedFids: Set<number>) {
  try {
    fs.writeFileSync(votedFidsFilePath, JSON.stringify([...votedFids]));
  } catch (error) {
    console.error("Error saving votedFids file:", error);
  }
}

// بارگذاری رای‌ها و فهرست fid‌ها از فایل‌ها
let votes: Votes = loadVotes();
let votedFids: Set<number> = loadVotedFids();

app.use('/*', serveStatic({ root: './public' }));

// مسیر اصلی فریم
app.frame('/', (c) => {
  const { frameData, verified, buttonValue } = c;

  const hasSelected = buttonValue === 'select';
  const showThirdPage = buttonValue === 'harris' || buttonValue === 'trump';

  const imageUrl = showThirdPage 
    ? 'https://i.imgur.com/HZG1uOl.png'
    : hasSelected 
    ? 'https://i.imgur.com/be4kQO3.png'
    : 'https://i.imgur.com/bLVqRNb.png';

  let selectedCandidate = '';

 const fid = frameData?.fid;
if (fid !== undefined && votedFids.has(fid)) { // اطمینان از عدم undefined بودن fid
  return c.res({
    image: (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          fontSize: '24px',
          height: '100%',  // پر کردن ارتفاع برای مرکزیت عمودی
          width: '100%',   // پر کردن عرض برای مرکزیت افقی
          backgroundColor: 'rgba(0, 0, 0, 0.8)',  // پس‌زمینه نیمه‌شفاف برای خوانایی
        }}
      >
        Each user can vote only once!
      </div>
    ),
  });
}


  if (buttonValue === 'harris') {
    votes.harris += 1;
    selectedCandidate = 'Harris';
    if (fid !== undefined) votedFids.add(fid); // افزودن fid به فهرست در صورت عدم undefined بودن
    saveVotes(votes);
    saveVotedFids(votedFids);
  } else if (buttonValue === 'trump') {
    votes.trump += 1;
    selectedCandidate = 'Trump';
    if (fid !== undefined) votedFids.add(fid);
    saveVotes(votes);
    saveVotedFids(votedFids);
  }

  const totalVotes = votes.harris + votes.trump;
  const harrisPercent = totalVotes ? Math.round((votes.harris / totalVotes) * 100) : 0;
  const trumpPercent = totalVotes ? Math.round((votes.trump / totalVotes) * 100) : 0;

  // ایجاد متن کست با نام نامزد و آدرس فریم
  const frameUrl = 'https://election-u-s.onrender.com';
  const composeCastUrl = `https://warpcast.com/~/compose?text=I%20voted%20for%20${encodeURIComponent(
    selectedCandidate
  )},%20what’s%20your%20opinion?%0A%0AFrame%20By%20@Jeyloo%0A\n${encodeURIComponent(frameUrl)}`;

  return c.res({
    image: (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'black',
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
          <Button.Link href={composeCastUrl}>Share</Button.Link> // دکمه "Share" با متن انگلیسی و لینک
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
