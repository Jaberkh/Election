import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import * as fs from 'fs';

// پیکربندی و تنظیمات فریم
export const app = new Frog({
  title: 'Voting Frame',
  imageAspectRatio: '1:1',
  verify: 'silent',
});

const votesFilePath = './votes.json';
type Votes = { harris: number; trump: number; };

// توابع بارگذاری و ذخیره آرا
function loadVotes(): Votes {
  try {
    const data = fs.readFileSync(votesFilePath, 'utf-8');
    return JSON.parse(data) as Votes;
  } catch (error) {
    console.error("Error reading votes file:", error);
    return { harris: 0, trump: 0 };
  }
}

function saveVotes(votes: Votes) {
  try {
    fs.writeFileSync(votesFilePath, JSON.stringify(votes, null, 2));
    console.log("Votes saved successfully");
  } catch (error) {
    console.error("Error saving votes file:", error);
  }
}

let votes: Votes = loadVotes();

app.use('/*', serveStatic({ root: './public' }));

// تابع render برای مدیریت ساختار و محتوای فریم
function render(c: any, votes: Votes, showThirdPage: boolean, imageUrl: string) { // نوع c را به any تغییر دادیم
  const followUrl = "https://warpcast.com/jeyloo"; // لینک مستقیم پروفایل jeyloo در Warpcast

  const totalVotes = votes.harris + votes.trump;
  const harrisPercent = totalVotes ? Math.round((votes.harris / totalVotes) * 100) : 0;
  const trumpPercent = totalVotes ? Math.round((votes.trump / totalVotes) * 100) : 0;

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
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {showThirdPage && (
          <div
            style={{
              position: 'absolute',
              bottom: '2%',
              color: 'white',
              fontSize: '110px',
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
          <Button>Share Vote</Button>,
          <a 
            href={followUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ textDecoration: 'none', color: 'white', padding: '10px', backgroundColor: 'blue', borderRadius: '5px', display: 'inline-block' }}
          >
            Follow Me
          </a> // لینک به پروفایل با استفاده از عنصر <a>
        ]
      : [
          <Button value="harris">Harris</Button>,
          <Button value="trump">Trump</Button>,
        ],
  });
}

app.frame('/', (c: any) => { // نوع c را به any تغییر دادیم
  const { buttonValue } = c;
  
  const hasSelected = buttonValue === 'select';
  const showThirdPage = buttonValue === 'harris' || buttonValue === 'trump';

  // تنظیم URL تصویر بر اساس وضعیت رای‌گیری
  const imageUrl = showThirdPage 
    ? 'https://i.imgur.com/HZG1uOl.png' 
    : hasSelected 
    ? 'https://i.imgur.com/be4kQO3.png' 
    : 'https://i.imgur.com/bLVqRNb.png';

  if (!imageUrl) {
    console.error("Invalid image URL");
    return c.res({ image: <div>Error loading image</div> });
  }

  console.log("Image URL:", imageUrl);

  // به‌روزرسانی آرا بر اساس انتخاب کاربر
  if (buttonValue === 'harris') {
    votes.harris += 1;
    saveVotes(votes);
  } else if (buttonValue === 'trump') {
    votes.trump += 1;
    saveVotes(votes);
  }

  return render(c, votes, showThirdPage, imageUrl); // استفاده از تابع render
});

const port = 3000;
console.log(`Server is running on port ${port}`);
devtools(app, { serveStatic });
serve({ fetch: app.fetch, port });
