import { HttpRegion, HttpFile } from '../models';

export type HttpOutputProcessor = (httpRegion: HttpRegion, httpFile: HttpFile) => Promise<void>;