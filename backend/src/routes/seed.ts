import { Router, Request, Response } from 'express';
import { execFile } from 'child_process';
import path from 'path';

const router = Router();

router.post('/run', async (req: Request, res: Response) => {
  const key = req.headers['x-seed-key'];
  if (!process.env.SEED_KEY || key !== process.env.SEED_KEY) {
    res.status(401).json({ error: 'Invalid or missing x-seed-key header' });
    return;
  }

  const scriptsDir = path.join(__dirname, '../../scripts');

  const run = (script: string): Promise<string> =>
    new Promise((resolve, reject) => {
      execFile('node', [script], { cwd: path.join(__dirname, '../..'), timeout: 120000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });

  try {
    const mainOutput = await run(path.join(scriptsDir, 'seed.js'));
    const aggregatorOutput = await run(path.join(scriptsDir, 'seedAggregator.js'));
    res.json({ main: mainOutput, aggregator: aggregatorOutput });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
