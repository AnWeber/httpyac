import { HttpRegion, HttpFile } from '../httpRegion';

export type HttpOutputProcessor = (httpRegion: HttpRegion, httpFile: HttpFile) => Promise<void>;