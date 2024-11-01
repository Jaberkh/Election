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

type Votes = { harris: number; trump: number };
const votesFilePath = './votes.json';
const votedFidsFilePath = './votedFids.json';

function loadVotes(): Votes {
  try {
    const data = fs.readFileSync(votesFilePath, 'utf-8');
    return JSON.parse(data) as Votes;
  } catch {
    return { harris: 0, trump: 0 };
  }
}

function saveVotes(votes: Votes) {
  fs.writeFileSync(votesFilePath, JSON.stringify(votes, null, 2));
}

function loadVotedFids(): Record<number, number> {
  if (!fs.existsSync(votedFidsFilePath)) fs.writeFileSync(votedFidsFilePath, JSON.stringify({}));
  const data = fs.readFileSync(votedFidsFilePath, 'utf-8');
  return JSON.parse(data);
}

function saveVotedFids(votedFids: Record<number, number>) {
  fs.writeFileSync(votedFidsFilePath, JSON.stringify(votedFids, null, 2));
}

let votes: Votes = loadVotes();
let votedFids: Record<number, number> = loadVotedFids();

app.use('/*', serveStatic({ root: './public' }));

app.frame('/', (c) => {
  const { frameData, buttonValue } = c;
  const hasSelected = buttonValue === 'select';
  const showThirdPage = buttonValue === 'harris' || buttonValue === 'trump';
  const imageUrl = showThirdPage ? 'https://i.imgur.com/HZG1uOl.png' : hasSelected ? 'https://i.imgur.com/be4kQO3.png' : 'https://i.imgur.com/bLVqRNb.png';

  let selectedCandidate = '';
  const fid = frameData?.fid;

  if (fid !== undefined) {
    if (!votedFids[fid]) votedFids[fid] = 0;

    if (votedFids[fid] >= 10) {
      // محدودیت رای برای هر کاربر دوبار است
      return c.res({
        image: (
          <div style={{ color: 'white', textAlign: 'center', fontSize: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: 'black' }}>
            Each user can vote only Once!
          </div>
        ),
      });
    }
  }

  if (buttonValue === 'harris') {
    votes.harris += 1;
    selectedCandidate = 'Harris';
    if (fid !== undefined) votedFids[fid] += 1;
    saveVotes(votes);
    saveVotedFids(votedFids);
  } else if (buttonValue === 'trump') {
    votes.trump += 1;
    selectedCandidate = 'Trump';
    if (fid !== undefined) votedFids[fid] += 1;
    saveVotes(votes);
    saveVotedFids(votedFids);
  }

  const totalVotes = votes.harris + votes.trump;
  const harrisPercent = totalVotes ? Math.round((votes.harris / totalVotes) * 100) : 0;
  const trumpPercent = totalVotes ? Math.round((votes.trump / totalVotes) * 100) : 0;

  const composeCastUrl = `https://warpcast.com/~/compose?text=I%20voted%20for%20${encodeURIComponent(
    selectedCandidate
  )}%2C%20Who%20Is%20Your%20Choice?%3F%0A%0AFrame%20By%20@Jeyloo&embeds[]=https://election-u-s.onrender.com`;

  return c.res({
    image: (
      <div style={{ position: 'relative', width: '100%', height: '100%', background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <img src={imageUrl} alt={showThirdPage ? "Thank you for voting!" : ""} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {showThirdPage && (
          <div style={{ position: 'absolute', bottom: '2%', color: 'white', fontSize: '110px', letterSpacing: '-0.025em', lineHeight: 1.4, padding: '0 20px', whiteSpace: 'pre-wrap', display: 'flex', gap: '325px' }}>
            <span>{`${trumpPercent}`}</span>
            <span>{`${harrisPercent}`}</span>
          </div>
        )}
      </div>
    ),
    intents: showThirdPage ? [<Button.Link href={composeCastUrl}>Share</Button.Link>] : hasSelected ? [<Button value="harris">Harris</Button>, <Button value="trump">Trump</Button>] : [<Button value="select">Vote</Button>],
  });
});

const port = 3000;
console.log(`Server is running on port ${port}`);
devtools(app, { serveStatic });
serve({ fetch: app.fetch, port });
