import { Config } from '@remotion/cli/config';

// Same render settings as the presentation project (origin/claude/bill-presentation-video).
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// Use a local Chromium / headless shell when REMOTION_BROWSER is set (sandboxes without Remotion's own download).
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
