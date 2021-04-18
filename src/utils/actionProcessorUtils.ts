import { ActionProcessorType, HttpRegion } from '../models';


export function actionProcessorIndexAfterRequest(httpRegion: HttpRegion): number {
  return actionProcessorIndexAfter(httpRegion, ActionProcessorType.request) + 1;
}

export function actionProcessorIndexAfter(httpRegion: HttpRegion, type: ActionProcessorType): number {
  return httpRegion.actions.findIndex(obj => obj.type === type);
}