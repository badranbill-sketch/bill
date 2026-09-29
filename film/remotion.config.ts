/**
 * Render settings for the Bill Badran film. (When using the Node.js APIs this file does not apply.)
 * All options: https://remotion.dev/docs/config
 */
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setAudioBitrate('256k');
