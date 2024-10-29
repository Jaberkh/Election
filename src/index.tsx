import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import * as fs from 'fs';
import axios from 'axios';
import { neynar } from 'frog/hubs';

export const app = new Frog({
  title: 'Voting Frame',
  imageAspectRatio: '1:1',
  hub: neynar({ apiKey: '8CC4FE87-3950-4481-BAD2-20475D7F7B68' }),
  verify: 'silent',
});

const votesFilePath = './votes.json';
type Votes = { harris: number; trump: number; };

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

async function verifyNeynarAPI() {
  try {
    const response = await axios.get('https://hub-api.neynar.com/v1/info', {
      headers: { 'Content-Type': 'application/json', 'api_key': 'ACAFFB87-E4FF-4940-9237-FB3D1FAEDF2D' },
    });
    console.log('Verification successful:', response.data);
    return true;
  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

let votes: Votes = loadVotes();
verifyNeynarAPI().then((verified) => {
  if (verified) {
    console.log('Frog Frame is verified and ready to use.');
  } else {
    console.log('Frog Frame verification failed.');
  }
});

app.use('/*', serveStatic({ root: './public' }));

app.frame('/', (c) => {
  const { buttonValue } = c;
  
  const hasSelected = buttonValue === 'select';
  const showThirdPage = buttonValue === 'harris' || buttonValue === 'trump';

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

  if (buttonValue === 'harris') {
    votes.harris += 1;
    saveVotes(votes);
  } else if (buttonValue === 'trump') {
    votes.trump += 1;
    saveVotes(votes);
  }

  const totalVotes = votes.harris + votes.trump;
  const harrisPercent = totalVotes ? Math.round((votes.harris / totalVotes) * 100) : 0;
  const trumpPercent = totalVotes ? Math.round((votes.trump / totalVotes) * 100) : 0;

  const message = `Thank you for voting! Harris: ${votes.harris} votes, Trump: ${votes.trump} votes. Frame By @Jeyloo`;
  const warpcastIntentUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(message)}`;
  const followUrl = "https://warpcast.com/~/profiles/jeyloo";

  if (!warpcastIntentUrl || !followUrl) {
    console.error("Invalid Warpcast or Follow URL");
    return c.res({ image: <div>Error generating share URLs</div> });
  }

  console.log("Warpcast Intent URL:", warpcastIntentUrl);
  console.log("Follow URL:", followUrl);

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
          <Button action={warpcastIntentUrl}>Share Vote</Button>,
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

const port = 3000;
console.log(`Server is running on port ${port}`);
devtools(app, { serveStatic });
serve({ fetch: app.fetch, port });
